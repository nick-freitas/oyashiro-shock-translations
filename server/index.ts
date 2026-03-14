import express from "express";
import * as fs from "fs";
import * as path from "path";

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

// GET all questions
app.get("/questions", (_req, res) => {
  const db = readDb();
  res.json(db.questions);
});

// PATCH a question (text edits + correctOption)
app.patch("/questions/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = readDb();
  const idx = db.questions.findIndex((q) => q.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Question not found" });
    return;
  }
  db.questions[idx] = { ...db.questions[idx], ...req.body };
  writeDb(db);
  res.json(db.questions[idx]);
});

app.listen(3001, () => {
  console.log("API server running on http://localhost:3001");
});
