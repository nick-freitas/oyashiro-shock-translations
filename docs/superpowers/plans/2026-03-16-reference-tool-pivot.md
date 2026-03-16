# Reference Tool Pivot Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot the app from an SRS study tool to a reference browsing tool by removing study features, simplifying routing, and rebranding from "question" to "entry/reference" terminology.

**Architecture:** Remove StudyMode, CardManager, SRS engine, and study-progress storage. Eliminate React Router (single-view app). Rename types, components, API routes, and data keys from "question" to "entry" framing.

**Tech Stack:** React 19, TypeScript, Vite 8, Express 5, Vitest

**Spec:** `docs/superpowers/specs/2026-03-16-reference-tool-pivot-design.md`

---

## Chunk 1: Removals and Data Migration

### Task 1: Delete study-related files

**Files:**
- Delete: `src/components/StudyMode.tsx`
- Delete: `src/components/StudyMode.css`
- Delete: `src/components/CardManager.tsx`
- Delete: `src/components/CardManager.css`
- Delete: `src/srs.ts`
- Delete: `src/srs.test.ts`
- Delete: `study-progress.json`
- Delete: `docs/superpowers/specs/2026-03-14-study-mode-design.md`
- Delete: `docs/superpowers/specs/2026-03-15-study-mode-v2-design.md`
- Delete: `docs/superpowers/specs/2026-03-14-card-manager-design.md`
- Delete: `docs/superpowers/plans/2026-03-14-study-mode.md`
- Delete: `docs/superpowers/plans/2026-03-14-card-manager.md`
- Delete: `docs/superpowers/plans/2026-03-16-study-mode-v2.md`

- [ ] **Step 1: Delete all study-related source files**

```bash
git rm src/components/StudyMode.tsx src/components/StudyMode.css \
       src/components/CardManager.tsx src/components/CardManager.css \
       src/srs.ts src/srs.test.ts
```

- [ ] **Step 2: Delete study-progress data file**

```bash
git rm study-progress.json
```

Note: This file is untracked. Use `rm -f study-progress.json` directly (not `git rm`). It will not appear in the commit.

- [ ] **Step 3: Delete study-related specs and plans**

```bash
git rm docs/superpowers/specs/2026-03-14-study-mode-design.md \
       docs/superpowers/specs/2026-03-15-study-mode-v2-design.md \
       docs/superpowers/specs/2026-03-14-card-manager-design.md \
       docs/superpowers/plans/2026-03-14-study-mode.md \
       docs/superpowers/plans/2026-03-14-card-manager.md \
       docs/superpowers/plans/2026-03-16-study-mode-v2.md
```

- [ ] **Step 4: Commit deletions**

```bash
git add -A
git commit -m "chore: delete study mode, card manager, and SRS files"
```

---

### Task 2: Migrate db.json

**Files:**
- Modify: `db.json`

- [ ] **Step 1: Rename top-level key from "questions" to "entries"**

In `db.json`, change the top-level key:

```json
{
  "entries": [
    ...existing content unchanged...
  ]
}
```

Only the key name changes. All entry objects inside the array stay identical.

- [ ] **Step 2: Commit data migration**

```bash
git add db.json
git commit -m "data: rename db.json top-level key from questions to entries"
```

---

## Chunk 2: Server Refactor

### Task 3: Refactor server/index.ts

**Files:**
- Modify: `server/index.ts`

- [ ] **Step 1: Remove all study-progress code**

Remove these sections from `server/index.ts` (line numbers are for reference in the unmodified file — use the identifiers to locate code for removal):
- `STUDY_PROGRESS_PATH` constant (line 40)
- `CardProgress` interface (lines 42-46)
- `StudyProgress` interface (lines 48-50)
- `readStudyProgress()` function (lines 52-59)
- `writeStudyProgress()` function (lines 61-63)
- `GET /study/progress` endpoint (lines 368-371)
- `PATCH /study/progress` endpoint (lines 374-396)
- Study-progress cleanup block in `DELETE /questions/:id` handler (lines 339-362, the try/catch block starting with `// Clean up study progress`)

- [ ] **Step 2: Rename QuestionData to EntryData**

Replace:
```typescript
interface QuestionData {
```
With:
```typescript
interface EntryData {
```

And update `DbJson`:
```typescript
interface DbJson {
  entries: EntryData[];
}
```

- [ ] **Step 3: Update readDb/writeDb and all db.questions references**

All references to `db.questions` become `db.entries`. This affects:
- `GET /entries`: `res.json(db.entries)`
- `POST /entries/reprocess`: `db.entries.map(...)`, `db.entries.push(...)`, `db.entries.length`
- `PATCH /entries/:id`: `db.entries.findIndex(...)`, `db.entries[idx]`
- `DELETE /entries/:id`: `db.entries.findIndex(...)`, `db.entries[idx]`, `db.entries.splice(...)`

- [ ] **Step 4: Rename all route paths from /questions to /entries**

```typescript
app.get("/entries", (_req, res) => { ... });
app.post("/entries/reprocess", async (_req, res) => { ... });
app.post("/entries/add-furigana", async (_req, res) => { ... });
app.patch("/entries/:id", (req, res) => { ... });
app.delete("/entries/:id", (req, res) => { ... });
```

- [ ] **Step 5: Update messages and loop variables**

**Console.log messages:**
- `Processing: ${filename}` — keep as-is (describes the file, not the concept)
- `OK: "${parsed.question.ja}"` — keep as-is (refers to the `question` field)
- `Added furigana for question ${question.id}` → `Added furigana for entry ${entry.id}`
- `Error processing ${filename}:` — keep as-is
- `Error adding furigana for question ${question.id}:` → `Error adding furigana for entry ${entry.id}`

**Error response messages:**
- `"Question not found"` → `"Entry not found"` in both PATCH and DELETE handlers

**Loop variable in add-furigana:**

Rename from `question` to `entry`:
```typescript
for (const entry of db.entries) {
```

And update all references to `question.question`, `question.options`, `question.id` within that loop to `entry.question`, `entry.options`, `entry.id`.

- [ ] **Step 6: Verify server compiles**

```bash
npx tsx --no-cache server/index.ts &
SERVER_PID=$!
sleep 2
curl -s http://localhost:3001/entries | head -c 200
kill $SERVER_PID
```

Expected: JSON array of entry objects is returned.

- [ ] **Step 7: Commit server refactor**

```bash
git add server/index.ts
git commit -m "refactor: rename server from questions to entries, remove study endpoints"
```

---

## Chunk 3: Frontend Refactor

### Task 4: Update types

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Rename Question to Entry, remove study types**

Rewrite `src/types.ts` to:

```typescript
export interface TranslatedText {
  ja: string;
  en: string;
}

export interface Entry {
  id: number;
  filename: string;
  question: TranslatedText;
  options: [TranslatedText, TranslatedText, TranslatedText, TranslatedText];
  correctOption?: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "refactor: rename Question type to Entry, remove study types"
```

---

### Task 5: Rename QuestionList to ReferenceList

**Files:**
- Rename: `src/components/QuestionList.tsx` → `src/components/ReferenceList.tsx`
- Rename: `src/components/QuestionList.css` → `src/components/ReferenceList.css`

- [ ] **Step 1: Rename CSS file**

```bash
git mv src/components/QuestionList.css src/components/ReferenceList.css
```

- [ ] **Step 2: Rename TSX file**

```bash
git mv src/components/QuestionList.tsx src/components/ReferenceList.tsx
```

- [ ] **Step 3: Update internal names in ReferenceList.tsx**

In `src/components/ReferenceList.tsx`, make these changes:

- Import: `import type { Question, TranslatedText }` → `import type { Entry, TranslatedText }`
- Import: `import "./QuestionList.css"` → `import "./ReferenceList.css"`
- Interface: `QuestionRowProps` → `EntryRowProps`, with `question: Question` → `entry: Entry`
- Interface: `QuestionListProps` → `ReferenceListProps`, with `questions: Question[]` → `entries: Entry[]`, `onQuestionSaved: (updated: Question) => void` → `onEntrySaved: (updated: Entry) => void`, `onQuestionDeleted: (id: number) => void` → `onEntryDeleted: (id: number) => void`
- Component: `function QuestionRow({ question, index, onSaved, onDeleted }: QuestionRowProps)` → `function EntryRow({ entry, index, onSaved, onDeleted }: EntryRowProps)`
- Component: `export function QuestionList(...)` → `export function ReferenceList(...)`
- State: `const [edited, setEdited] = useState<Question>(question)` → `const [edited, setEdited] = useState<Entry>(entry)`
- Dirty check: `JSON.stringify(question)` references → `JSON.stringify(entry)`
- All `question.` references that refer to the prop (not the `.question` field) → `entry.`
  - `question.question.ja` → `entry.question.ja` (the prop was `question`, now `entry`)
  - `question.question.en` → `entry.question.en`
  - `question.options[oi]` → `entry.options[oi]`
  - `question.id` → `entry.id`
  - `question.filename` → `entry.filename`
  - `question.correctOption` → `entry.correctOption`
- Fetch URLs: `/api/questions/${question.id}` → `/api/entries/${entry.id}`
- Confirm dialog: `"Delete this question and its screenshot?"` → `"Delete this entry and its screenshot?"`
- Delete button: `title="Delete question"` → `title="Delete entry"`
- `updateQuestion` function name: **keep as-is** (refers to the `question` field on Entry)
- `OPTION_COUNTERS`, `KANJI_NUMS`, `useAutoResize`, `AutoTextarea`: **keep as-is**
- JSX: `<QuestionRow` → `<EntryRow`
- Props passed to rows: `question={q}` → `entry={q}`, `onSaved={onQuestionSaved}` → `onSaved={onEntrySaved}`, `onDeleted={onQuestionDeleted}` → `onDeleted={onEntryDeleted}`

Wait — looking at the actual component props more carefully: `QuestionRow` destructures `{ question, index, onSaved, onDeleted }` where `onSaved` and `onDeleted` are already short names internally. The rename is on the prop name in the interface and the call site in `ReferenceList`:

```tsx
export function ReferenceList({ entries, onEntrySaved, onEntryDeleted }: ReferenceListProps) {
  return (
    <main>
      {entries.map((q, idx) => (
        <EntryRow
          key={q.id}
          entry={q}
          index={idx}
          onSaved={onEntrySaved}
          onDeleted={onEntryDeleted}
        />
      ))}
    </main>
  );
}
```

- [ ] **Step 4: Commit renamed component**

```bash
git add -A
git commit -m "refactor: rename QuestionList to ReferenceList, Question to Entry"
```

---

### Task 6: Refactor App.tsx and main.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Rewrite main.tsx without BrowserRouter**

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

- [ ] **Step 2: Rewrite App.tsx**

Remove React Router, StudyMode, CardManager imports. Merge `Editor` into `App` as default export. Rename all identifiers per spec. Update sidebar: remove nav links, add "REFERENCE" vertical label, change popover labels to English. Update fetch URLs.

The rewritten `App.tsx`:

```tsx
import { useEffect, useState, useRef, useCallback } from "react";
import type { Entry } from "./types";
import { ReferenceList } from "./components/ReferenceList";
import "./App.css";

const KANJI_NUMS = [
  "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "二十一", "二十二", "二十三", "二十四",
];

function toKanjiCount(n: number): string {
  return KANJI_NUMS[n - 1] ?? String(n);
}

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessMsg, setReprocessMsg] = useState<string | null>(null);
  const [addingFurigana, setAddingFurigana] = useState(false);
  const [furiganaMsg, setFuriganaMsg] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function fetchEntries() {
    setLoading(true);
    fetch("/api/entries")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setEntries)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function handleEntrySaved(updated: Entry) {
    setEntries((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e))
    );
  }

  function handleEntryDeleted(id: number) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function showToast(setter: (msg: string | null) => void, message: string) {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setReprocessMsg(null);
    setFuriganaMsg(null);
    setter(message);
    toastTimeoutRef.current = setTimeout(() => setter(null), 3000);
  }

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
      triggerRef.current && !triggerRef.current.contains(e.target as Node)
    ) {
      setPopoverOpen(false);
    }
  }, []);

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setPopoverOpen(false);
      triggerRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, []);

  useEffect(() => {
    if (popoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [popoverOpen, handleClickOutside, handleEscape]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  async function handleReprocess() {
    setReprocessing(true);
    setReprocessMsg(null);
    try {
      const res = await fetch("/api/entries/reprocess", { method: "POST" });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        showToast(setReprocessMsg, `Server error: ${text}`);
        return;
      }
      if (!res.ok) {
        showToast(setReprocessMsg, data.error || "Failed");
        return;
      }
      if (data.processed > 0) {
        showToast(setReprocessMsg, `Processed ${data.processed} new screenshot(s)`);
        fetchEntries();
      } else {
        showToast(setReprocessMsg, data.message || "No new screenshots");
      }
    } catch (err) {
      showToast(setReprocessMsg, err instanceof Error ? err.message : "Failed");
    } finally {
      setReprocessing(false);
      setPopoverOpen(false);
    }
  }

  async function handleAddFurigana() {
    setAddingFurigana(true);
    setFuriganaMsg(null);
    try {
      const res = await fetch("/api/entries/add-furigana", { method: "POST" });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        showToast(setFuriganaMsg, `Server error: ${text}`);
        return;
      }
      if (!res.ok) {
        showToast(setFuriganaMsg, data.error || "Failed");
        return;
      }
      const parts = [`Annotated ${data.annotated}`, `skipped ${data.skipped}`];
      if (data.failed > 0) parts.push(`failed ${data.failed}`);
      showToast(setFuriganaMsg, `${parts.join(", ")} (${data.total} total)`);
      if (data.annotated > 0) {
        fetchEntries();
      }
    } catch (err) {
      showToast(setFuriganaMsg, err instanceof Error ? err.message : "Failed");
    } finally {
      setAddingFurigana(false);
      setPopoverOpen(false);
    }
  }

  if (loading) return <div className="center">読み込み中&hellip;</div>;
  if (error) return <div className="center error">Error: {error}</div>;

  return (
    <div className="app-layout">
      <div className="main-content">
        <ReferenceList
          entries={entries}
          onEntrySaved={handleEntrySaved}
          onEntryDeleted={handleEntryDeleted}
        />
      </div>

      <aside className="title-sidebar">
        <div className="sidebar-nav-links">
          <button
            ref={triggerRef}
            className="sidebar-actions-trigger"
            onClick={() => setPopoverOpen((prev) => !prev)}
            aria-expanded={popoverOpen}
            aria-haspopup="true"
          >
            ⋮
          </button>
          <span className="sidebar-nav-link">REFERENCE</span>
        </div>
        {popoverOpen && (
          <div ref={popoverRef} className="sidebar-popover" role="dialog">
            <button
              className="sidebar-popover-action"
              onClick={handleReprocess}
              disabled={reprocessing}
            >
              {reprocessing ? "Processing..." : "Process Screenshots"}
            </button>
            <button
              className="sidebar-popover-action"
              onClick={handleAddFurigana}
              disabled={addingFurigana}
            >
              {addingFurigana ? "Adding Furigana..." : "Add Furigana"}
            </button>
          </div>
        )}
        <div className="sidebar-titles">
          <div className="sidebar-subtitle">新・クイズ・ショック</div>
          <div className="sidebar-title">おやしろさまショック</div>
        </div>
        <div className="sidebar-count">
          {toKanjiCount(entries.length)}
        </div>
      </aside>
      {(reprocessMsg || furiganaMsg) && (
        <div className="toast-message" role="status">
          {reprocessMsg || furiganaMsg}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit frontend refactor**

```bash
git add src/App.tsx src/main.tsx
git commit -m "refactor: remove router, rename to entry/reference terminology, English labels"
```

---

### Task 7: Remove react-router-dom dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Uninstall react-router-dom**

```bash
npm uninstall react-router-dom
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove react-router-dom dependency"
```

---

## Chunk 4: Verification

### Task 8: Verify everything works

- [ ] **Step 1: Run TypeScript compilation**

```bash
npx tsc -b --noEmit
```

Expected: No errors.

- [ ] **Step 2: Run existing tests**

```bash
npx vitest run
```

Expected: `parseRuby` tests pass. No test failures (study-related tests were deleted in Task 1).

- [ ] **Step 3: Start dev server and verify UI**

```bash
npm run dev
```

Open `http://localhost:5173` in browser. Verify:
- Reference list loads with all entries and screenshots
- Sidebar shows title, "REFERENCE" label, entry count
- Popover shows English labels ("Process Screenshots", "Add Furigana")
- No broken links or console errors
- Inline editing works
- Correct answer selection works
- Delete works

- [ ] **Step 4: Verify no stale references**

Search the codebase for leftover references to old names:

```bash
grep -r "StudyMode\|CardManager\|study-progress\|CardProgress\|StudyProgress\|QuestionList\|QuestionRow\|QuestionData\|QuestionListProps\|QuestionRowProps\|fetchQuestions\|handleQuestion" src/ server/ --include="*.ts" --include="*.tsx"
```

Expected: No matches.

```bash
grep -r "/questions" src/ server/ --include="*.ts" --include="*.tsx"
```

Expected: No matches (all renamed to `/entries`).

- [ ] **Step 5: Final commit if any fixes needed**

If verification found issues, fix and commit:

```bash
git add -A
git commit -m "fix: address verification issues from reference tool pivot"
```
