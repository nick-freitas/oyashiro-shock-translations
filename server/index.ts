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
    "ja": "<the question text in Japanese>",
    "en": "<English translation of the question>"
  },
  "options": [
    { "ja": "<option 1 in Japanese>", "en": "<English translation>" },
    { "ja": "<option 2 in Japanese>", "en": "<English translation>" },
    { "ja": "<option 3 in Japanese>", "en": "<English translation>" },
    { "ja": "<option 4 in Japanese>", "en": "<English translation>" }
  ]
}

Rules:
- Read the image file first using the Read tool
- Extract ALL Japanese text visible for the question and each of the 4 answer options
- Ignore any X marks, circles, timers, character art, or UI elements
- Translate naturally, not literally
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
    for (let oi = 0; oi < 4; oi++) {
      const cardId = `q${id}-o${oi}`;
      if (cardId in progress.cards) {
        delete progress.cards[cardId];
        changed = true;
      }
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
  if (!cardId) {
    res.status(400).json({ error: "cardId is required" });
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
