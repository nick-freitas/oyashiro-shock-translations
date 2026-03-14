import { query } from "@anthropic-ai/claude-agent-sdk";
import * as fs from "fs";
import * as path from "path";

interface TranslatedText {
  ja: string;
  en: string;
}

interface QuestionData {
  id: number;
  filename: string;
  question: TranslatedText;
  options: [TranslatedText, TranslatedText, TranslatedText, TranslatedText];
}

interface DbJson {
  questions: QuestionData[];
}

const PROJECT_ROOT = process.cwd();
const SCREENSHOTS_DIR = path.join(PROJECT_ROOT, "screenshots");
const DB_PATH = path.join(PROJECT_ROOT, "db.json");

async function loadExistingDb(): Promise<DbJson> {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { questions: [] };
  }
}

async function processScreenshots() {
  const db = await loadExistingDb();
  const existingFilenames = new Set(db.questions.map((q) => q.filename));

  const allFiles = fs
    .readdirSync(SCREENSHOTS_DIR)
    .filter((f) => f.endsWith(".png"))
    .sort();

  const newFiles = allFiles.filter((f) => !existingFilenames.has(f));

  if (newFiles.length === 0) {
    console.log("All screenshots already processed.");
    return;
  }

  console.log(`Processing ${newFiles.length} new screenshots...`);

  let nextId = db.questions.length > 0
    ? Math.max(...db.questions.map((q) => q.id)) + 1
    : 1;

  for (const filename of newFiles) {
    const filePath = path.join(SCREENSHOTS_DIR, filename);
    console.log(`\nProcessing: ${filename}`);

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
          systemPrompt: "You are a Japanese OCR and translation specialist. You read images of Japanese quiz games, extract the text, and translate it to English. You always return valid JSON and nothing else.",
        },
      })) {
        if (message.type === "result") {
          result = message.result;
        }
      }

      // Parse the JSON from the agent's response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error(`  Failed to extract JSON for ${filename}`);
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const questionData: QuestionData = {
        id: nextId++,
        filename,
        question: parsed.question,
        options: parsed.options,
      };

      db.questions.push(questionData);
      console.log(`  OK: "${parsed.question.ja}" → "${parsed.question.en}"`);

      // Save after each successful processing (incremental)
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    } catch (err) {
      console.error(`  Error processing ${filename}:`, err);
      continue;
    }
  }

  console.log(`\nDone. ${db.questions.length} total questions in db.json`);
}

processScreenshots().catch(console.error);
