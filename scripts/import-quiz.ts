import * as fs from "fs";
import * as path from "path";

const SOURCE_JSON = "/Users/nickfreitas/dev/HigurashiENX/oyashiro_shock_quiz.json";
const SOURCE_IMAGES = "/Users/nickfreitas/dev/HigurashiENX/quiz_images";
const OUT_TS = path.join(import.meta.dirname, "..", "src", "data", "entries.ts");
const OUT_IMAGES = path.join(import.meta.dirname, "..", "public", "quiz_images");

interface SourceEntry {
  level: number;
  questionNumber: number;
  vtId: string;
  qlvId: string;
  correctAnswerJp: string;
  correctAnswerEn: string;
  wrongAnswersJp: string[];
  wrongAnswersEn: string[];
  questionImage: string;
  questionJp: string;
  questionEn: string;
}

const raw: SourceEntry[] = JSON.parse(fs.readFileSync(SOURCE_JSON, "utf-8"));

// Generate unique IDs using qlvId + index (qlvId is not unique for level 0)
const entries = raw.map((e, i) => ({
  id: `${e.qlvId}_${i}`,
  level: e.level,
  questionJp: e.questionJp,
  questionEn: e.questionEn,
  correctAnswerJp: e.correctAnswerJp,
  correctAnswerEn: e.correctAnswerEn,
  wrongAnswersJp: e.wrongAnswersJp,
  wrongAnswersEn: e.wrongAnswersEn,
  questionImage: e.questionImage,
}));

// Write TypeScript module
const dataDir = path.dirname(OUT_TS);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const tsContent = `import type { Entry } from "../types";

export const entries: Entry[] = ${JSON.stringify(entries, null, 2)};
`;

fs.writeFileSync(OUT_TS, tsContent);
console.log(`Wrote ${entries.length} entries to ${OUT_TS}`);

// Copy images
if (!fs.existsSync(OUT_IMAGES)) fs.mkdirSync(OUT_IMAGES, { recursive: true });
const imageFiles = fs.readdirSync(SOURCE_IMAGES).filter((f) => f.endsWith(".png"));
let copied = 0;
for (const file of imageFiles) {
  const dest = path.join(OUT_IMAGES, file);
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(path.join(SOURCE_IMAGES, file), dest);
    copied++;
  }
}
console.log(`Copied ${copied} images to ${OUT_IMAGES} (${imageFiles.length} total)`);
