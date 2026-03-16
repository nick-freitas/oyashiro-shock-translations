import express from "express";
import * as fs from "fs";
import * as path from "path";
import { query } from "@anthropic-ai/claude-agent-sdk";

const app = express();
app.use(express.json());

const PROJECT_ROOT = process.cwd();
const DB_PATH = path.join(PROJECT_ROOT, "db.json");
const SCREENSHOTS_DIR = path.join(PROJECT_ROOT, "screenshots");
const PUBLIC_SCREENSHOTS_DIR = path.join(PROJECT_ROOT, "public", "screenshots");

interface TranslatedText {
  ja: string;
  en: string;
}

interface QuestionData {
  id: number;
  filename: string;
  question: TranslatedText;
  options: [TranslatedText, TranslatedText, TranslatedText, TranslatedText];
  correctOption?: number;
}

interface DbJson {
  questions: QuestionData[];
}

function readDb(): DbJson {
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeDb(db: DbJson): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

const STUDY_PROGRESS_PATH = path.join(PROJECT_ROOT, "study-progress.json");

interface CardProgress {
  bucket: number;
  nextDue: string | null;
  lastReviewed: string | null;
}

interface StudyProgress {
  cards: Record<string, CardProgress>;
}

function readStudyProgress(): StudyProgress {
  try {
    const raw = fs.readFileSync(STUDY_PROGRESS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { cards: {} };
  }
}

function writeStudyProgress(progress: StudyProgress): void {
  fs.writeFileSync(STUDY_PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

// GET all questions
app.get("/questions", (_req, res) => {
  const db = readDb();
  res.json(db.questions);
});

let processing = false;

// POST /questions/reprocess — must be registered before /:id routes
app.post("/questions/reprocess", async (_req, res) => {
  if (processing) {
    res.status(409).json({ error: "Processing already in progress" });
    return;
  }

  processing = true;
  try {
    const db = readDb();
    const existingFilenames = new Set(db.questions.map((q) => q.filename));

    const allFiles = fs
      .readdirSync(SCREENSHOTS_DIR)
      .filter((f) => f.endsWith(".png"))
      .sort();

    const newFiles = allFiles.filter((f) => !existingFilenames.has(f));

    if (newFiles.length === 0) {
      res.json({ processed: 0, message: "No new screenshots found" });
      return;
    }

    let nextId =
      db.questions.length > 0
        ? Math.max(...db.questions.map((q) => q.id)) + 1
        : 1;

    let processed = 0;

    for (const filename of newFiles) {
      const filePath = path.join(SCREENSHOTS_DIR, filename);
      console.log(`Processing: ${filename}`);

      try {
        let result = "";

        for await (const message of query({
          prompt: `Read the image file at "${filePath}" using the Read tool. This is a screenshot from a Japanese quiz game. Extract the following and return ONLY valid JSON (no markdown, no explanation):

{
  "question": {
    "ja": "<the question text in Japanese with [漢字]{かな} furigana markup>",
    "en": "<English translation of the question>"
  },
  "options": [
    { "ja": "<option 1 in Japanese with [漢字]{かな} furigana markup>", "en": "<English translation>" },
    { "ja": "<option 2 in Japanese with [漢字]{かな} furigana markup>", "en": "<English translation>" },
    { "ja": "<option 3 in Japanese with [漢字]{かな} furigana markup>", "en": "<English translation>" },
    { "ja": "<option 4 in Japanese with [漢字]{かな} furigana markup>", "en": "<English translation>" }
  ]
}

Rules:
- Read the image file first using the Read tool
- Extract ALL Japanese text visible for the question and each of the 4 answer options
- Ignore any X marks, circles, timers, character art, or UI elements
- Translate naturally, not literally
- For all Japanese text in "ja" fields (question and options), annotate kanji with furigana using [漢字]{かな} syntax. Only annotate kanji characters, not katakana or hiragana. Example: [店内]{てんない}に[響]{ひび}いた
- Return ONLY the JSON object, nothing else`,
          options: {
            allowedTools: ["Read"],
            permissionMode: "acceptEdits",
            maxTurns: 5,
            systemPrompt:
              "You are a Japanese OCR and translation specialist. You read images of Japanese quiz games, extract the text, and translate it to English. You always return valid JSON and nothing else.",
          },
        })) {
          if (message.type === "result" && "result" in message) {
            result = (message as { result: string }).result;
          }
        }

        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error(`  Failed to extract JSON for ${filename}`);
          continue;
        }

        const parsed = JSON.parse(jsonMatch[0]);

        db.questions.push({
          id: nextId++,
          filename,
          question: parsed.question,
          options: parsed.options,
        });

        // Copy to public/screenshots/
        const destPath = path.join(PUBLIC_SCREENSHOTS_DIR, filename);
        if (!fs.existsSync(destPath)) {
          fs.copyFileSync(filePath, destPath);
        }

        writeDb(db);
        processed++;
        console.log(`  OK: "${parsed.question.ja}"`);
      } catch (err) {
        console.error(`  Error processing ${filename}:`, err);
      }
    }

    res.json({ processed, total: db.questions.length });
  } finally {
    processing = false;
  }
});


const FURIGANA_PATTERN = /\[.+?\]\{.+?\}/;

// POST /questions/add-furigana — must be before /:id routes
app.post("/questions/add-furigana", async (_req, res) => {
  if (processing) {
    res.status(409).json({ error: "Processing already in progress" });
    return;
  }

  processing = true;
  try {
    const db = readDb();
    let annotated = 0;
    let skipped = 0;
    let failed = 0;
    let total = 0;

    for (const question of db.questions) {
      total++;

      // Collect unannotated ja fields: question + 4 options = up to 5
      const fields: { key: string; text: string; target: { obj: TranslatedText } }[] = [];

      if (!FURIGANA_PATTERN.test(question.question.ja)) {
        fields.push({ key: "q", text: question.question.ja, target: { obj: question.question } });
      }
      for (let oi = 0; oi < question.options.length; oi++) {
        if (!FURIGANA_PATTERN.test(question.options[oi].ja)) {
          fields.push({ key: `o${oi}`, text: question.options[oi].ja, target: { obj: question.options[oi] } });
        }
      }

      if (fields.length === 0) {
        skipped++;
        continue;
      }

      // Build numbered input object
      const input: Record<string, string> = {};
      const fieldMap: Record<string, { obj: TranslatedText }> = {};
      fields.forEach((f, i) => {
        const numKey = String(i + 1);
        input[numKey] = f.text;
        fieldMap[numKey] = f.target;
      });

      try {
        let result = "";

        for await (const message of query({
          prompt: `Add furigana readings to the following Japanese text using [漢字]{かな} syntax.
Only annotate kanji characters — leave katakana, hiragana, and punctuation as-is.
Return ONLY a JSON object with the same numbered keys, where each value is the annotated text.

Input: ${JSON.stringify(input)}

Example:
Input: {"1": "店内に響いたのは何コール？", "2": "可愛い"}
Output: {"1": "[店内]{てんない}に[響]{ひび}いたのは[何]{なに}コール？", "2": "[可愛]{かわい}い"}

Return ONLY the JSON object, nothing else.`,
          options: {
            maxTurns: 1,
            permissionMode: "acceptEdits",
            systemPrompt:
              "You are a Japanese language specialist. You add furigana readings to kanji using [漢字]{かな} bracket notation. You always return valid JSON and nothing else.",
          },
        })) {
          if (message.type === "result" && "result" in message) {
            result = (message as { result: string }).result;
          }
        }

        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error(`  Failed to extract furigana JSON for question ${question.id}`);
          failed++;
          continue;
        }

        const parsed: Record<string, string> = JSON.parse(jsonMatch[0]);

        // Apply results back to the question
        for (const [numKey, target] of Object.entries(fieldMap)) {
          if (parsed[numKey] && typeof parsed[numKey] === "string") {
            target.obj.ja = parsed[numKey];
          }
        }

        writeDb(db);
        annotated++;
        console.log(`  Added furigana for question ${question.id}`);
      } catch (err) {
        console.error(`  Error adding furigana for question ${question.id}:`, err);
        failed++;
      }
    }

    res.json({ annotated, skipped, failed, total });
  } finally {
    processing = false;
  }
});

// PATCH a question (text edits + correctOption)
app.patch("/questions/:id", (req, res) => {
  if (processing) {
    res.status(409).json({ error: "Processing in progress, try again later" });
    return;
  }
  const id = parseInt(req.params.id, 10);
  const db = readDb();
  const idx = db.questions.findIndex((q) => q.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Question not found" });
    return;
  }
  const { question, options, correctOption } = req.body;
  if (question !== undefined) db.questions[idx].question = question;
  if (options !== undefined) db.questions[idx].options = options;
  if (correctOption !== undefined) db.questions[idx].correctOption = correctOption;
  writeDb(db);
  res.json(db.questions[idx]);
});

// DELETE a question + screenshot files
app.delete("/questions/:id", (req, res) => {
  if (processing) {
    res.status(409).json({ error: "Processing in progress, try again later" });
    return;
  }
  const id = parseInt(req.params.id, 10);
  const db = readDb();
  const idx = db.questions.findIndex((q) => q.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const question = db.questions[idx];
  const filename = question.filename;

  // Remove from database
  db.questions.splice(idx, 1);
  writeDb(db);

  // Delete screenshot files (best effort)
  for (const dir of [SCREENSHOTS_DIR, PUBLIC_SCREENSHOTS_DIR]) {
    const filePath = path.join(dir, filename);
    try {
      fs.unlinkSync(filePath);
    } catch {
      // File may not exist in one of the directories
    }
  }

  // Clean up study progress (best effort, skip if file doesn't exist)
  try {
    const progress = readStudyProgress();
    let changed = false;
    // Remove option card entries
    for (let oi = 0; oi < 4; oi++) {
      const cardId = `q${id}-o${oi}`;
      if (cardId in progress.cards) {
        delete progress.cards[cardId];
        changed = true;
      }
    }
    // Remove question card entry
    const questionCardId = `q${id}`;
    if (questionCardId in progress.cards) {
      delete progress.cards[questionCardId];
      changed = true;
    }
    if (changed) {
      writeStudyProgress(progress);
    }
  } catch {
    // study-progress.json may not exist yet
  }

  res.json({ deleted: id });
});

// GET study progress
app.get("/study/progress", (_req, res) => {
  const progress = readStudyProgress();
  res.json(progress);
});

// PATCH study progress — update a single card's SRS state
app.patch("/study/progress", (req, res) => {
  const { cardId, bucket, nextDue, lastReviewed } = req.body;
  if (!cardId || typeof cardId !== "string") {
    res.status(400).json({ error: "cardId is required" });
    return;
  }
  if (typeof bucket !== "number" || bucket < 0 || bucket > 5) {
    res.status(400).json({ error: "bucket must be a number 0-5" });
    return;
  }
  if (nextDue !== null && typeof nextDue !== "string") {
    res.status(400).json({ error: "nextDue must be a string or null" });
    return;
  }
  if (lastReviewed !== null && typeof lastReviewed !== "string") {
    res.status(400).json({ error: "lastReviewed must be a string or null" });
    return;
  }
  const progress = readStudyProgress();
  progress.cards[cardId] = { bucket, nextDue, lastReviewed };
  writeStudyProgress(progress);
  res.json({ cardId, bucket, nextDue, lastReviewed });
});

app.listen(3001, () => {
  console.log("API server running on http://localhost:3001");
});
