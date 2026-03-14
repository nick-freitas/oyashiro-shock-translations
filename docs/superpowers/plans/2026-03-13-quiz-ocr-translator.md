# Quiz OCR + Translator Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tool that OCRs Japanese quiz screenshots using Claude's vision via the Agent SDK, translates them to English, and displays results in an editable React web app.

**Architecture:** A one-time TypeScript processing script uses the Claude Agent SDK to read each screenshot image, extract Japanese text (question + 4 options), and translate to English. Results are stored in `db.json` served by json-server. A Vite + React frontend displays the screenshots alongside transcriptions/translations and allows manual editing via PATCH requests.

**Tech Stack:** TypeScript, Vite, React, `@anthropic-ai/claude-agent-sdk`, `json-server`, `tsx`, `concurrently`

**Spec:** `docs/superpowers/specs/2026-03-13-quiz-ocr-translator-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `package.json` | Create | Dependencies, scripts |
| `tsconfig.json` | Create | TypeScript config |
| `tsconfig.node.json` | Create | Node scripts TS config |
| `vite.config.ts` | Create | Vite config with proxy to json-server |
| `index.html` | Create | Vite entry HTML |
| `src/types.ts` | Create | Shared TypeScript types for Question data model |
| `scripts/process-screenshots.ts` | Create | Agent SDK script: OCR + translate all screenshots → `db.json` |
| `src/main.tsx` | Create | React entry point |
| `src/App.tsx` | Create | Root component, fetches data, routes between list/detail |
| `src/App.css` | Create | App-level styles |
| `src/components/QuestionList.tsx` | Create | Grid of all questions with thumbnails |
| `src/components/QuestionList.css` | Create | QuestionList styles |
| `src/components/QuestionCard.tsx` | Create | Single question detail/edit view |
| `src/components/QuestionCard.css` | Create | QuestionCard styles |

---

## Chunk 1: Project Scaffolding

### Task 1: Initialize project with Vite + React TypeScript

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`

- [ ] **Step 1: Scaffold the Vite + React + TypeScript project**

Run:
```bash
cd /Users/nickfreitas/dev/oyashirosamashock
npm create vite@latest . -- --template react-ts --force
```

The `--force` flag avoids interactive prompts about existing files (`screenshots/`, `docs/`, `.git/`).

- [ ] **Step 2: Install additional dependencies**

Run:
```bash
npm install
npm install -D json-server concurrently tsx @anthropic-ai/claude-agent-sdk
```

- [ ] **Step 3: Add npm scripts to package.json**

Add these scripts to the `scripts` section of `package.json`:

```json
{
  "process": "tsx scripts/process-screenshots.ts",
  "dev": "concurrently \"json-server --watch db.json --port 3001\" \"vite\"",
  "server": "json-server --watch db.json --port 3001"
}
```

Keep the existing `build`, `lint`, and `preview` scripts from Vite scaffolding.

- [ ] **Step 4: Configure Vite proxy**

Replace the contents of `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
```

- [ ] **Step 5: Copy screenshots to public directory**

Run:
```bash
mkdir -p public/screenshots
cp screenshots/*.png public/screenshots/
```

- [ ] **Step 6: Create a seed db.json for testing**

Create `db.json` in the project root:

```json
{
  "questions": []
}
```

- [ ] **Step 7: Verify the setup**

Run:
```bash
npm run dev
```

Expected: Vite dev server starts on port 5173, json-server starts on port 3001. Open http://localhost:5173 and see the default Vite + React page. Open http://localhost:3001/questions and see `[]`.

Stop the servers with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TypeScript project with json-server"
```

---

### Task 2: Define shared types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create the types file**

Create `src/types.ts`:

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
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared Question type definitions"
```

---

## Chunk 2: Processing Script

### Task 3: Build the Agent SDK processing script

**Files:**
- Create: `scripts/process-screenshots.ts`

- [ ] **Step 1: Create the scripts directory**

Run:
```bash
mkdir -p scripts
```

- [ ] **Step 2: Write the processing script**

Create `scripts/process-screenshots.ts`:

```typescript
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
```

- [ ] **Step 3: Add tsconfig for scripts**

Create `tsconfig.node.json` (if not already created by Vite — check first, and if it exists, ensure `scripts/**/*.ts` is included):

The Vite scaffold may already have a `tsconfig.node.json`. If so, add `"scripts"` to its `include` array. If not, the `tsx` runner handles TypeScript natively, so no additional config is needed.

- [ ] **Step 4: Test the processing script with one image**

Set your `ANTHROPIC_API_KEY` environment variable, then run:

```bash
ANTHROPIC_API_KEY=your-key-here npm run process
```

Expected: The script processes all 24 screenshots, printing each question as it goes. `db.json` is populated with the results. Verify the first entry looks correct:

```bash
head -20 db.json
```

- [ ] **Step 5: Commit**

```bash
git add scripts/process-screenshots.ts db.json
git commit -m "feat: add Agent SDK processing script for OCR + translation"
```

---

## Chunk 3: React App — QuestionList View

### Task 4: Build the QuestionList component

**Files:**
- Create: `src/components/QuestionList.tsx`
- Create: `src/components/QuestionList.css`

- [ ] **Step 1: Create QuestionList component**

Create `src/components/QuestionList.tsx`:

```tsx
import { Question } from "../types";
import "./QuestionList.css";

interface QuestionListProps {
  questions: Question[];
  onSelect: (question: Question) => void;
}

export function QuestionList({ questions, onSelect }: QuestionListProps) {
  return (
    <div className="question-list">
      <h1>Quiz: Shin Oyashiro Shock!</h1>
      <p className="subtitle">{questions.length} questions</p>
      <div className="question-grid">
        {questions.map((q) => (
          <button
            key={q.id}
            className="question-item"
            onClick={() => onSelect(q)}
          >
            <img
              src={`/screenshots/${encodeURIComponent(q.filename)}`}
              alt={q.question.en}
              className="question-thumbnail"
              loading="lazy"
            />
            <div className="question-text">
              <p className="question-ja">{q.question.ja}</p>
              <p className="question-en">{q.question.en}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create QuestionList styles**

Create `src/components/QuestionList.css`:

```css
.question-list {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.question-list h1 {
  margin: 0 0 0.25rem;
  font-size: 1.8rem;
}

.subtitle {
  color: #888;
  margin: 0 0 2rem;
}

.question-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
}

.question-item {
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s;
  text-align: left;
  padding: 0;
  color: inherit;
  font: inherit;
}

.question-item:hover {
  border-color: #646cff;
}

.question-thumbnail {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.question-text {
  padding: 0.75rem;
}

.question-ja {
  margin: 0 0 0.25rem;
  font-size: 0.95rem;
}

.question-en {
  margin: 0;
  font-size: 0.85rem;
  color: #aaa;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/QuestionList.tsx src/components/QuestionList.css
git commit -m "feat: add QuestionList component with grid layout"
```

---

### Task 5: Build the QuestionCard component

**Files:**
- Create: `src/components/QuestionCard.tsx`
- Create: `src/components/QuestionCard.css`

- [ ] **Step 1: Create QuestionCard component**

Create `src/components/QuestionCard.tsx`:

```tsx
import { useState } from "react";
import { Question, TranslatedText } from "../types";
import "./QuestionCard.css";

interface QuestionCardProps {
  question: Question;
  onBack: () => void;
  onSave: (updated: Question) => void;
}

export function QuestionCard({ question, onBack, onSave }: QuestionCardProps) {
  const [edited, setEdited] = useState<Question>(question);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  function updateQuestion(field: keyof TranslatedText, value: string) {
    setEdited((prev) => ({
      ...prev,
      question: { ...prev.question, [field]: value },
    }));
    setDirty(true);
  }

  function updateOption(
    index: number,
    field: keyof TranslatedText,
    value: string
  ) {
    setEdited((prev) => {
      const newOptions = [...prev.options] as Question["options"];
      newOptions[index] = { ...newOptions[index], [field]: value };
      return { ...prev, options: newOptions };
    });
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(edited);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="question-card">
      <div className="card-header">
        <button className="back-button" onClick={onBack}>
          &larr; Back
        </button>
        <button
          className="save-button"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <img
        src={`/screenshots/${encodeURIComponent(question.filename)}`}
        alt={question.question.en}
        className="card-image"
      />

      <div className="card-fields">
        <section className="field-group">
          <h2>Question</h2>
          <label>
            <span className="field-label">Japanese</span>
            <input
              type="text"
              value={edited.question.ja}
              onChange={(e) => updateQuestion("ja", e.target.value)}
              className={
                edited.question.ja !== question.question.ja ? "modified" : ""
              }
            />
          </label>
          <label>
            <span className="field-label">English</span>
            <input
              type="text"
              value={edited.question.en}
              onChange={(e) => updateQuestion("en", e.target.value)}
              className={
                edited.question.en !== question.question.en ? "modified" : ""
              }
            />
          </label>
        </section>

        {edited.options.map((opt, i) => (
          <section key={i} className="field-group">
            <h3>Option {i + 1}</h3>
            <label>
              <span className="field-label">Japanese</span>
              <input
                type="text"
                value={opt.ja}
                onChange={(e) => updateOption(i, "ja", e.target.value)}
                className={
                  opt.ja !== question.options[i].ja ? "modified" : ""
                }
              />
            </label>
            <label>
              <span className="field-label">English</span>
              <input
                type="text"
                value={opt.en}
                onChange={(e) => updateOption(i, "en", e.target.value)}
                className={
                  opt.en !== question.options[i].en ? "modified" : ""
                }
              />
            </label>
          </section>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create QuestionCard styles**

Create `src/components/QuestionCard.css`:

```css
.question-card {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.back-button {
  background: none;
  border: 1px solid #555;
  color: #ccc;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.back-button:hover {
  border-color: #888;
}

.save-button {
  background: #646cff;
  border: none;
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

.save-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-button:hover:not(:disabled) {
  background: #535bf2;
}

.card-image {
  width: 100%;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.card-fields {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.field-group {
  background: #1a1a2e;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 1rem;
}

.field-group h2 {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
}

.field-group h3 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  color: #aaa;
}

.field-group label {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.5rem;
}

.field-label {
  font-size: 0.75rem;
  color: #888;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field-group input {
  width: 100%;
  padding: 0.5rem;
  background: #16213e;
  border: 1px solid #333;
  border-radius: 4px;
  color: #eee;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.field-group input:focus {
  outline: none;
  border-color: #646cff;
}

.field-group input.modified {
  border-color: #f0a500;
  background: #1a1a0e;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/QuestionCard.tsx src/components/QuestionCard.css
git commit -m "feat: add QuestionCard component with editable fields"
```

---

## Chunk 4: Wire It All Together

### Task 6: Build the App component and entry point

**Files:**
- Modify: `src/App.tsx`
- Create: `src/App.css`
- Modify: `src/main.tsx`

- [ ] **Step 1: Replace App.tsx with the real app**

Replace the contents of `src/App.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Question } from "./types";
import { QuestionList } from "./components/QuestionList";
import { QuestionCard } from "./components/QuestionCard";
import "./App.css";

function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/questions")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setQuestions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(updated: Question) {
    const res = await fetch(`/api/questions/${updated.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: updated.question,
        options: updated.options,
      }),
    });

    if (!res.ok) throw new Error(`Save failed: HTTP ${res.status}`);

    const saved: Question = await res.json();
    setQuestions((prev) =>
      prev.map((q) => (q.id === saved.id ? saved : q))
    );
    setSelected(saved);
  }

  if (loading) return <div className="center">Loading...</div>;
  if (error) return <div className="center error">Error: {error}</div>;

  if (selected) {
    return (
      <QuestionCard
        question={selected}
        onBack={() => setSelected(null)}
        onSave={handleSave}
      />
    );
  }

  return <QuestionList questions={questions} onSelect={setSelected} />;
}

export default App;
```

- [ ] **Step 2: Create App.css**

Create `src/App.css`:

```css
:root {
  color-scheme: dark;
}

body {
  margin: 0;
  background: #0f0f23;
  color: #eee;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.center {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-size: 1.2rem;
}

.error {
  color: #ff6b6b;
}
```

- [ ] **Step 3: Simplify main.tsx**

Replace the contents of `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 4: Clean up Vite boilerplate**

Remove the default Vite files that are no longer needed:

```bash
rm -f src/App.css.bak src/index.css src/assets/react.svg public/vite.svg
```

Also remove the `import './index.css'` line from `src/main.tsx` if it exists.

- [ ] **Step 5: Verify the full app**

First, make sure `db.json` has been populated by the processing script (Task 3). Then run:

```bash
npm run dev
```

Expected:
- http://localhost:5173 shows the question grid with thumbnails, Japanese text, and English translations
- Clicking a question opens the detail/edit view
- Editing a field highlights it with a yellow border
- Clicking "Save" persists the change (verify by refreshing the page)
- Clicking "Back" returns to the grid

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.css src/main.tsx
git commit -m "feat: wire up App with QuestionList and QuestionCard views"
```

---

### Task 7: Final cleanup and verification

- [ ] **Step 1: Remove any remaining Vite boilerplate**

Check for and remove any leftover default files:

```bash
rm -f src/assets/react.svg public/vite.svg
```

Verify no stale imports remain:

```bash
grep -r "react.svg\|vite.svg\|index.css" src/ --include="*.tsx" --include="*.ts"
```

Expected: No output (no stale references).

- [ ] **Step 2: Verify the complete workflow end-to-end**

```bash
npm run dev
```

Walk through the full flow:
1. Grid view loads with all 24 questions
2. Each question shows thumbnail, Japanese text, English text
3. Click a question → detail view with editable fields
4. Edit a translation → field highlights yellow
5. Click Save → saves successfully
6. Click Back → returns to grid, edited value persists
7. Refresh page → edited value still shows (json-server persisted it)

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: clean up boilerplate, verify end-to-end flow"
```
