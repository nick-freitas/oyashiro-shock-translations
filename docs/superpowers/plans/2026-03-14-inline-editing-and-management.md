# Inline Editing & Question Management Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline editing, correct answer marking, question deletion, screenshot reprocessing, and replace json-server with a single Express backend.

**Architecture:** Single Express server replaces json-server for all API needs. The React frontend gets inline editing directly in the question list rows. Server handles file operations (delete screenshots, run OCR reprocessing).

**Tech Stack:** Express, React 19, TypeScript, Claude Agent SDK, Vite (proxy), tsx (server runner)

---

## Chunk 1: Server & Inline Editing

### Task 1: Install dependencies and update config

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.node.json`

- [ ] **Step 1: Install express and types**

```bash
cd /Users/nickfreitas/dev/oyashirosamashock
npm install --save-dev express @types/express
```

- [ ] **Step 2: Update package.json scripts**

In `package.json`, replace the `"dev"` and `"server"` scripts:

```json
"dev": "concurrently \"tsx server/index.ts\" \"vite\"",
"server": "tsx server/index.ts",
```

Remove `json-server` from devDependencies (it will be replaced by express).

- [ ] **Step 3: Update tsconfig.node.json to include server/**

Change the `include` array in `tsconfig.node.json` from:
```json
"include": ["vite.config.ts", "scripts"]
```
to:
```json
"include": ["vite.config.ts", "scripts", "server"]
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json tsconfig.node.json
git commit -m "chore: swap json-server for express, update tsconfig"
```

---

### Task 2: Create Express server with GET and PATCH

**Files:**
- Create: `server/index.ts`

- [ ] **Step 1: Create server/index.ts with GET /questions and PATCH /questions/:id**

```typescript
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
```

- [ ] **Step 2: Verify the server starts**

```bash
npx tsx server/index.ts &
# Wait a moment, then:
curl http://localhost:3001/questions | head -c 200
# Should print JSON question data
kill %1
```

- [ ] **Step 3: Verify Vite proxy still works**

```bash
npm run dev &
# Wait for both servers, then:
curl http://localhost:5173/api/questions | head -c 200
# Should print same JSON data through the proxy
kill %1
```

- [ ] **Step 4: Commit**

```bash
git add server/index.ts
git commit -m "feat: add express server with GET and PATCH endpoints"
```

---

### Task 3: Update schema and make QuestionList inline-editable

**Files:**
- Modify: `src/types.ts`
- Modify: `src/components/QuestionList.tsx`
- Modify: `src/components/QuestionList.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add correctOption to types.ts**

Add `correctOption?: number;` to the `Question` interface in `src/types.ts`:

```typescript
export interface TranslatedText {
  ja: string;
  en: string;
}

export interface Question {
  id: number;
  filename: string;
  question: TranslatedText;
  options: [TranslatedText, TranslatedText, TranslatedText, TranslatedText];
  correctOption?: number;
}
```

- [ ] **Step 2: Rewrite QuestionList.tsx with inline editing**

Replace `src/components/QuestionList.tsx` entirely. Each row gets input fields, a save button (visible when dirty), and manages its own edit state:

```tsx
import { useState } from "react";
import type { Question, TranslatedText } from "../types";
import "./QuestionList.css";

const KANJI_NUMS = [
  "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "二十一", "二十二", "二十三", "二十四",
];

const OPTION_LETTERS = ["A", "B", "C", "D"];

interface QuestionRowProps {
  question: Question;
  index: number;
  onSaved: (updated: Question) => void;
}

function QuestionRow({ question, index, onSaved }: QuestionRowProps) {
  const [edited, setEdited] = useState<Question>(question);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(edited) !== JSON.stringify(question);

  function updateQuestion(field: keyof TranslatedText, value: string) {
    setEdited((prev) => ({
      ...prev,
      question: { ...prev.question, [field]: value },
    }));
  }

  function updateOption(i: number, field: keyof TranslatedText, value: string) {
    setEdited((prev) => {
      const newOptions = [...prev.options] as Question["options"];
      newOptions[i] = { ...newOptions[i], [field]: value };
      return { ...prev, options: newOptions };
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/questions/${edited.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: edited.question,
          options: edited.options,
          correctOption: edited.correctOption,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="quiz-row">
      <div className="screenshot-col">
        <img
          src={`/screenshots/${encodeURIComponent(question.filename)}`}
          alt={question.question.en}
          className="screenshot-img"
          loading="lazy"
        />
      </div>

      <div className="question-col">
        <div className="question-number">
          {KANJI_NUMS[index] ?? String(index + 1)}
        </div>
        <input
          type="text"
          className={`inline-input input-ja${edited.question.ja !== question.question.ja ? " modified" : ""}`}
          value={edited.question.ja}
          onChange={(e) => updateQuestion("ja", e.target.value)}
        />
        <input
          type="text"
          className={`inline-input input-en${edited.question.en !== question.question.en ? " modified" : ""}`}
          value={edited.question.en}
          onChange={(e) => updateQuestion("en", e.target.value)}
        />
      </div>

      <div className="options-col">
        {edited.options.map((opt, oi) => (
          <div key={oi} className="option-item">
            <div className="option-input-row">
              <span className="option-letter">{OPTION_LETTERS[oi]}</span>
              <input
                type="text"
                className={`inline-input input-ja option-input${opt.ja !== question.options[oi].ja ? " modified" : ""}`}
                value={opt.ja}
                onChange={(e) => updateOption(oi, "ja", e.target.value)}
              />
            </div>
            <input
              type="text"
              className={`inline-input input-en option-input${opt.en !== question.options[oi].en ? " modified" : ""}`}
              value={opt.en}
              onChange={(e) => updateOption(oi, "en", e.target.value)}
            />
          </div>
        ))}
      </div>

      {dirty && (
        <div className="row-actions">
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

interface QuestionListProps {
  questions: Question[];
  onQuestionSaved: (updated: Question) => void;
}

export function QuestionList({ questions, onQuestionSaved }: QuestionListProps) {
  return (
    <main>
      {questions.map((q, idx) => (
        <QuestionRow
          key={q.id}
          question={q}
          index={idx}
          onSaved={onQuestionSaved}
        />
      ))}
    </main>
  );
}
```

- [ ] **Step 3: Add inline input styles to QuestionList.css**

Append these styles to `src/components/QuestionList.css`, after the existing styles:

```css
/* ===== INLINE EDITING ===== */
.inline-input {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  padding: 4px 8px;
  width: 100%;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.inline-input:hover {
  border-color: var(--border-row);
}

.inline-input:focus {
  outline: none;
  border-color: var(--accent-indigo-light);
  background: rgba(58, 58, 110, 0.1);
}

.inline-input.modified {
  border-color: var(--accent-gold);
  background: rgba(154, 138, 72, 0.08);
}

.inline-input.input-ja {
  font-family: var(--font-ja);
  font-size: 22px;
  font-weight: 400;
  color: var(--text-ja);
  line-height: 1.5;
  margin-bottom: 6px;
}

.question-col .inline-input.input-ja {
  font-size: 26px;
  font-weight: 500;
  line-height: 1.7;
}

.inline-input.input-en {
  font-family: var(--font-en);
  font-size: 18px;
  font-weight: 300;
  font-style: italic;
  color: var(--text-en);
  line-height: 1.4;
}

.question-col .inline-input.input-en {
  font-size: 20px;
  font-weight: 400;
  color: var(--text-en);
}

.option-input-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.option-input {
  flex: 1;
}

/* ===== ROW ACTIONS (save/delete buttons) ===== */
.row-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.save-btn {
  background: var(--accent-indigo);
  border: 1px solid var(--accent-indigo-light);
  color: #e0ddd8;
  padding: 6px 18px;
  border-radius: 4px;
  cursor: pointer;
  font-family: var(--font-en);
  font-size: 14px;
  letter-spacing: 0.05em;
  transition: background-color 0.2s ease;
}

.save-btn:hover:not(:disabled) {
  background: var(--accent-indigo-light);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 4: Update App.tsx to pass onQuestionSaved**

Replace `src/App.tsx`:

```tsx
import { useEffect, useState } from "react";
import type { Question } from "./types";
import { QuestionList } from "./components/QuestionList";
import "./App.css";

const KANJI_NUMS = [
  "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "二十一", "二十二", "二十三", "二十四",
];

function toKanjiCount(n: number): string {
  return KANJI_NUMS[n - 1] ?? String(n);
}

function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function fetchQuestions() {
    setLoading(true);
    fetch("/api/questions")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setQuestions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchQuestions();
  }, []);

  function handleQuestionSaved(updated: Question) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updated.id ? updated : q))
    );
  }

  if (loading) return <div className="center">読み込み中&hellip;</div>;
  if (error) return <div className="center error">Error: {error}</div>;

  return (
    <div className="app-layout">
      <div className="main-content">
        <header className="page-header">
          <span className="header-label">Shin Oyashiro Shock!</span>
          <span className="header-count">
            {toKanjiCount(questions.length)}問
          </span>
        </header>
        <QuestionList
          questions={questions}
          onQuestionSaved={handleQuestionSaved}
        />
      </div>

      <aside className="title-sidebar">
        <div className="sidebar-titles">
          <div className="sidebar-subtitle">新・クイズ・ショック</div>
          <div className="sidebar-title">おやしろさま</div>
        </div>
        <div className="sidebar-count">
          {toKanjiCount(questions.length)}
        </div>
      </aside>
    </div>
  );
}

export default App;
```

- [ ] **Step 5: Verify inline editing works**

```bash
npm run dev
```

Open http://localhost:5173 in a browser. Verify:
- All question rows show with input fields
- Editing a field shows a yellow border (modified state)
- Save button appears when changes are made
- Clicking Save persists changes (refresh page to confirm)
- Question count in header is dynamic

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/components/QuestionList.tsx src/components/QuestionList.css src/App.tsx
git commit -m "feat: inline editing for questions and options"
```

---

## Chunk 2: Correct Answers, Delete, Reprocess, Cleanup

### Task 4: Add correct answer selection with color coding

**Files:**
- Modify: `src/components/QuestionList.tsx`
- Modify: `src/components/QuestionList.css`

- [ ] **Step 1: Add correct answer radio buttons to QuestionRow**

In `src/components/QuestionList.tsx`, add a `setCorrectOption` handler inside `QuestionRow`:

```typescript
function setCorrectOption(index: number) {
  setEdited((prev) => ({ ...prev, correctOption: index }));
}
```

Then update the option rendering. Replace the `option-item` div in the `.map()` with:

```tsx
<div
  key={oi}
  className={`option-item${edited.correctOption === oi ? " correct" : ""}`}
>
  <div className="option-input-row">
    <button
      className={`correct-toggle${edited.correctOption === oi ? " is-correct" : ""}`}
      onClick={() => setCorrectOption(oi)}
      title="Mark as correct answer"
      type="button"
    >
      {OPTION_LETTERS[oi]}
    </button>
    <input
      type="text"
      className={`inline-input input-ja option-input${opt.ja !== question.options[oi].ja ? " modified" : ""}`}
      value={opt.ja}
      onChange={(e) => updateOption(oi, "ja", e.target.value)}
    />
  </div>
  <input
    type="text"
    className={`inline-input input-en option-input${opt.en !== question.options[oi].en ? " modified" : ""}`}
    value={opt.en}
    onChange={(e) => updateOption(oi, "en", e.target.value)}
  />
</div>
```

This replaces the plain `<span className="option-letter">` with a clickable button.

- [ ] **Step 2: Add correct answer styles to QuestionList.css**

Append to `src/components/QuestionList.css`:

```css
/* ===== CORRECT ANSWER ===== */
.correct-toggle {
  background: transparent;
  border: 1px solid var(--accent-indigo);
  color: var(--accent-indigo-light);
  font-family: var(--font-en);
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0.05em;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.correct-toggle:hover {
  border-color: #408040;
  color: #60b060;
  background: rgba(64, 128, 64, 0.1);
}

.correct-toggle.is-correct {
  background: rgba(64, 128, 64, 0.2);
  border-color: #408040;
  color: #80d080;
}

.option-item.correct {
  background: rgba(64, 128, 64, 0.06);
  border-radius: 4px;
  padding: 4px 4px 4px 14px;
}

.option-item.correct::before {
  background: #408040;
  opacity: 1;
}
```

- [ ] **Step 3: Verify correct answer selection works**

```bash
npm run dev
```

Open browser. Verify:
- Each option shows a circular letter button (A/B/C/D)
- Clicking a letter marks it as correct (green highlight)
- Clicking a different letter switches the selection
- The correct option has a green background tint
- Changes are included in Save (shows save button when toggled)
- Correct answer persists after save + refresh

- [ ] **Step 4: Commit**

```bash
git add src/components/QuestionList.tsx src/components/QuestionList.css
git commit -m "feat: correct answer selection with green color coding"
```

---

### Task 5: Add delete functionality

**Files:**
- Modify: `server/index.ts`
- Modify: `src/components/QuestionList.tsx`
- Modify: `src/components/QuestionList.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add DELETE endpoint to server/index.ts**

Add this route to `server/index.ts`, after the PATCH route. `SCREENSHOTS_DIR` and `PUBLIC_SCREENSHOTS_DIR` are already defined at the top of the file from Task 2.

```typescript
// DELETE a question + screenshot files
app.delete("/questions/:id", (req, res) => {
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

  res.json({ deleted: id });
});

- [ ] **Step 2: Add delete button and handler to QuestionRow**

In `src/components/QuestionList.tsx`, add `onDeleted` to `QuestionRowProps`:

```typescript
interface QuestionRowProps {
  question: Question;
  index: number;
  onSaved: (updated: Question) => void;
  onDeleted: (id: number) => void;
}
```

Update the function signature:
```typescript
function QuestionRow({ question, index, onSaved, onDeleted }: QuestionRowProps) {
```

Add a delete handler inside `QuestionRow`:

```typescript
async function handleDelete() {
  if (!confirm("Delete this question and its screenshot?")) return;
  try {
    const res = await fetch(`/api/questions/${question.id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    onDeleted(question.id);
  } catch (err) {
    console.error("Delete failed:", err);
  }
}
```

Add a delete button inside the `row-actions` div. Replace the existing `{dirty && (...)}` block at the end of the QuestionRow return with:

```tsx
<div className="row-actions">
  {dirty && (
    <button className="save-btn" onClick={handleSave} disabled={saving}>
      {saving ? "Saving…" : "Save"}
    </button>
  )}
  <button className="delete-btn" onClick={handleDelete} title="Delete question" type="button">
    ✕
  </button>
</div>
```

(The `row-actions` div is now always visible, not conditionally rendered.)

- [ ] **Step 3: Update QuestionList to pass onDeleted**

Update the `QuestionListProps` interface and the `QuestionList` component:

```typescript
interface QuestionListProps {
  questions: Question[];
  onQuestionSaved: (updated: Question) => void;
  onQuestionDeleted: (id: number) => void;
}

export function QuestionList({ questions, onQuestionSaved, onQuestionDeleted }: QuestionListProps) {
  return (
    <main>
      {questions.map((q, idx) => (
        <QuestionRow
          key={q.id}
          question={q}
          index={idx}
          onSaved={onQuestionSaved}
          onDeleted={onQuestionDeleted}
        />
      ))}
    </main>
  );
}
```

- [ ] **Step 4: Add handleQuestionDeleted to App.tsx**

Add this function in `App.tsx` alongside `handleQuestionSaved`:

```typescript
function handleQuestionDeleted(id: number) {
  setQuestions((prev) => prev.filter((q) => q.id !== id));
}
```

Pass it to `QuestionList`:

```tsx
<QuestionList
  questions={questions}
  onQuestionSaved={handleQuestionSaved}
  onQuestionDeleted={handleQuestionDeleted}
/>
```

- [ ] **Step 5: Add delete button styles to QuestionList.css**

Append to `src/components/QuestionList.css`:

```css
/* ===== DELETE BUTTON ===== */
.delete-btn {
  background: transparent;
  border: 1px solid transparent;
  color: #605858;
  font-size: 16px;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.delete-btn:hover {
  border-color: #804040;
  color: #c06060;
  background: rgba(128, 64, 64, 0.1);
}
```

Note: The `.row-actions` rule from Task 3 already includes `display: flex; gap: 8px; align-items: center` — no duplicate rule needed here.

- [ ] **Step 6: Verify delete works**

```bash
npm run dev
```

Open browser. Verify:
- Each row has a subtle ✕ button in the top-right
- Clicking shows a confirmation dialog
- Confirming removes the row from the page
- Question count updates in header and sidebar
- Screenshot files are deleted from both `screenshots/` and `public/screenshots/`

- [ ] **Step 7: Commit**

```bash
git add server/index.ts src/components/QuestionList.tsx src/components/QuestionList.css src/App.tsx
git commit -m "feat: delete questions with screenshot file cleanup"
```

---

### Task 6: Add reprocess functionality

**Files:**
- Modify: `server/index.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Add reprocess endpoint to server/index.ts**

Add the `@anthropic-ai/claude-agent-sdk` import at the top of `server/index.ts`:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
```

Add a processing lock and the reprocess route. This must be registered BEFORE the `/:id` routes:

```typescript
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
```

**Important:** Move this route registration BEFORE the `app.patch("/questions/:id", ...)` and `app.delete("/questions/:id", ...)` calls in the file to avoid Express matching `"reprocess"` as an `:id` parameter.

- [ ] **Step 2: Add reprocess button to App.tsx**

Add state and handler in `App`:

```typescript
const [reprocessing, setReprocessing] = useState(false);
const [reprocessMsg, setReprocessMsg] = useState<string | null>(null);

async function handleReprocess() {
  setReprocessing(true);
  setReprocessMsg(null);
  try {
    const res = await fetch("/api/questions/reprocess", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setReprocessMsg(data.error || "Failed");
      return;
    }
    if (data.processed > 0) {
      setReprocessMsg(`Processed ${data.processed} new screenshot(s)`);
      fetchQuestions();
    } else {
      setReprocessMsg(data.message || "No new screenshots");
    }
  } catch (err) {
    setReprocessMsg(err instanceof Error ? err.message : "Failed");
  } finally {
    setReprocessing(false);
  }
}
```

Add the button in the header, after `header-count`:

```tsx
<header className="page-header">
  <span className="header-label">Shin Oyashiro Shock!</span>
  <span className="header-count">
    {toKanjiCount(questions.length)}問
  </span>
  <button
    className="reprocess-btn"
    onClick={handleReprocess}
    disabled={reprocessing}
  >
    {reprocessing ? "Processing…" : "Process New Screenshots"}
  </button>
  {reprocessMsg && (
    <span className="reprocess-msg">{reprocessMsg}</span>
  )}
</header>
```

- [ ] **Step 3: Add reprocess button styles to App.css**

Append to `src/App.css`:

```css
/* ===== REPROCESS BUTTON ===== */
.reprocess-btn {
  margin-left: auto;
  background: var(--accent-indigo);
  border: 1px solid var(--accent-indigo-light);
  color: #e0ddd8;
  padding: 8px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-family: var(--font-en);
  font-size: 13px;
  letter-spacing: 0.05em;
  transition: background-color 0.2s ease;
  white-space: nowrap;
}

.reprocess-btn:hover:not(:disabled) {
  background: var(--accent-indigo-light);
}

.reprocess-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reprocess-msg {
  font-family: var(--font-en);
  font-size: 13px;
  color: var(--text-en-sub);
  font-style: italic;
  white-space: nowrap;
}
```

- [ ] **Step 4: Verify reprocess works**

```bash
npm run dev
```

Open browser. Verify:
- "Process New Screenshots" button appears in header
- If no new screenshots exist, clicking shows "No new screenshots found"
- Button is disabled while processing
- Double-clicking doesn't cause issues (409 rejection)

- [ ] **Step 5: Commit**

```bash
git add server/index.ts src/App.tsx src/App.css
git commit -m "feat: reprocess new screenshots from web UI"
```

---

### Task 7: Cleanup — remove dead code and json-server

**Files:**
- Delete: `src/components/QuestionCard.tsx`
- Delete: `src/components/QuestionCard.css`
- Delete: `scripts/process-screenshots.ts`

- [ ] **Step 1: Delete unused files**

```bash
cd /Users/nickfreitas/dev/oyashirosamashock
rm src/components/QuestionCard.tsx src/components/QuestionCard.css
rm scripts/process-screenshots.ts
```

- [ ] **Step 2: Uninstall json-server**

```bash
npm uninstall json-server
```

- [ ] **Step 3: Verify everything still works**

```bash
npm run dev
```

Open browser. Verify:
- App loads and displays all questions with inline editing
- Save, delete, correct answer, and reprocess all work
- No console errors

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove QuestionCard, process-screenshots script, and json-server"
```
