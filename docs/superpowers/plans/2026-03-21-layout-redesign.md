# Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flip bilingual text order (EN first/larger), restructure entry rows into a 2x2 grid, always show wrong answers, and add a section tabs sidebar replacing the old level selector.

**Architecture:** Modify existing `EntryRow` grid layout and CSS in-place, dissolve `options-col` into separate grid children, create one new `SectionTabs` component positioned between main content and title sidebar.

**Tech Stack:** React 19, TypeScript, plain CSS, Vite

**Spec:** `docs/superpowers/specs/2026-03-21-layout-redesign-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/ReferenceList.tsx` | Modify | Entry row JSX: new grid structure, text order, remove toggle |
| `src/components/ReferenceList.css` | Modify | Entry row grid, font sizes, remove dead CSS |
| `src/components/SectionTabs.tsx` | Create | Vertical tab nav for levels 0-8 |
| `src/components/SectionTabs.css` | Create | Tab styling with left-edge accent bar |
| `src/App.tsx` | Modify | Three-column layout, integrate SectionTabs, remove level nav from sidebar |
| `src/App.css` | Modify | Three-column flex layout, remove level-btn CSS |

---

### Task 1: Create SectionTabs Component

**Files:**
- Create: `src/components/SectionTabs.tsx`
- Create: `src/components/SectionTabs.css`

- [ ] **Step 1: Create `src/components/SectionTabs.tsx`**

```tsx
import "./SectionTabs.css";

interface SectionTabsProps {
  levels: number[];
  selectedLevel: number;
  onSelectLevel: (level: number) => void;
}

export function SectionTabs({ levels, selectedLevel, onSelectLevel }: SectionTabsProps) {
  return (
    <nav className="section-tabs">
      {levels.map((level) => (
        <button
          key={level}
          className={`section-tab${level === selectedLevel ? " active" : ""}`}
          onClick={() => onSelectLevel(level)}
          type="button"
        >
          {level}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Create `src/components/SectionTabs.css`**

```css
/* ===== SECTION TABS SIDEBAR ===== */
.section-tabs {
  width: 44px;
  min-width: 44px;
  height: 100vh;
  position: sticky;
  top: 0;
  background: var(--bg-sidebar);
  border-left: 1px solid var(--border-row);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex-shrink: 0;
}

.section-tab {
  width: 100%;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text-en-sub);
  font-family: var(--font-en);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: color 0.2s ease;
  padding: 0;
}

.section-tab:hover {
  color: var(--accent-gold);
}

.section-tab.active {
  color: var(--accent-gold-bright);
}

.section-tab.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  background: var(--accent-gold-bright);
  border-radius: 0 2px 2px 0;
}
```

- [ ] **Step 3: Verify the component renders**

Run: `npx vite build --mode development 2>&1 | head -20`
Expected: Build succeeds (component is created but not yet imported anywhere, so this just checks for syntax errors if the bundler tree-shakes it. Actual visual verification comes in Task 3.)

- [ ] **Step 4: Commit**

```bash
git add src/components/SectionTabs.tsx src/components/SectionTabs.css
git commit -m "feat: add SectionTabs component"
```

---

### Task 2: Restructure Entry Row Layout and Text Order

**Files:**
- Modify: `src/components/ReferenceList.tsx`
- Modify: `src/components/ReferenceList.css`

- [ ] **Step 1: Rewrite `EntryRow` JSX in `src/components/ReferenceList.tsx`**

Replace the entire `EntryRow` function body. Key changes:
- Remove `useState` import (no longer needed after toggle removal)
- Remove `expanded` state
- Dissolve `options-col` — correct answer and wrong answers are now separate top-level grid children
- Flip text order: English first (larger), Japanese second (smaller) in questions and answers
- Remove the toggle button

New `ReferenceList.tsx` content:

```tsx
import type { Entry } from "../types";
import "./ReferenceList.css";

interface EntryRowProps {
  entry: Entry;
  index: number;
  isImportant: boolean;
  onToggleImportant: () => void;
}

function EntryRow({ entry, index, isImportant, onToggleImportant }: EntryRowProps) {
  return (
    <div className={`quiz-row${isImportant ? " important" : ""}`}>
      <div className="question-col">
        <div className="question-number">{index + 1}</div>
        <div className="question-en">{entry.questionEn}</div>
        <div className="question-ja">{entry.questionJp}</div>
      </div>

      <div className="screenshot-col">
        <img
          src={`/${entry.questionImage}`}
          alt={entry.questionEn}
          className="screenshot-img"
          loading="lazy"
        />
      </div>

      <div className="correct-answer">
        <div className="option-item correct">
          <div className="option-en">{entry.correctAnswerEn}</div>
          <div className="option-ja">{entry.correctAnswerJp}</div>
        </div>
      </div>

      <div className="wrong-answers">
        {entry.wrongAnswersJp.map((wrongJp, i) => (
          <div key={i} className="option-item">
            <div className="option-en">{entry.wrongAnswersEn[i]}</div>
            <div className="option-ja">{wrongJp}</div>
          </div>
        ))}
      </div>

      <div className="row-actions">
        <button
          className={`important-btn${isImportant ? " active" : ""}`}
          onClick={onToggleImportant}
          title={isImportant ? "Remove important mark" : "Mark as important"}
          type="button"
        >
          ★
        </button>
      </div>
    </div>
  );
}

interface ReferenceListProps {
  entries: Entry[];
  importantMarks: Set<string>;
  onToggleImportant: (id: string) => void;
}

export function ReferenceList({ entries, importantMarks, onToggleImportant }: ReferenceListProps) {
  return (
    <main>
      {entries.map((entry, idx) => (
        <EntryRow
          key={entry.id}
          entry={entry}
          index={idx}
          isImportant={importantMarks.has(entry.id)}
          onToggleImportant={() => onToggleImportant(entry.id)}
        />
      ))}
    </main>
  );
}
```

- [ ] **Step 2: Rewrite `src/components/ReferenceList.css`**

Replace the entire file. Key changes:
- Grid: `1fr 1fr` columns, 2 rows
- `question-col` → col 1, row 1
- `screenshot-col` → col 2, row 1
- `correct-answer` → col 1, row 2
- `wrong-answers` → col 2, row 2
- Swap font sizes: `.question-en` gets 39px, `.question-ja` gets 30px; `.option-en` gets 33px, `.option-ja` gets 27px
- Remove `.options-col`, `.options-toggle` and all their responsive overrides
- Add responsive rules for `.correct-answer` and `.wrong-answers`

New `ReferenceList.css` content:

```css
/* ===== QUIZ ROW ===== */
.quiz-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 16px 28px;
  padding: 24px 24px;
  position: relative;
  align-items: start;
  border-bottom: 1px solid var(--border-row);
  transition: background-color 0.35s ease;
}

.question-col {
  grid-column: 1;
  grid-row: 1;
}

.screenshot-col {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  justify-content: center;
}

.correct-answer {
  grid-column: 1;
  grid-row: 2;
}

.wrong-answers {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quiz-row:nth-child(even) {
  background-color: var(--bg-row-alt);
}

.quiz-row:hover {
  background-color: var(--bg-row-hover);
}

.quiz-row:hover .question-number {
  color: var(--accent-gold-bright);
}

.quiz-row:last-child {
  border-bottom: none;
}

/* ===== SCREENSHOT ===== */

.screenshot-img {
  width: 56%;
  height: auto;
  display: block;
  border: 1px solid var(--border-row);
  opacity: 0.9;
  transition: opacity 0.3s ease;
}

.quiz-row:hover .screenshot-img {
  opacity: 1;
}

/* ===== QUESTION ===== */

.question-number {
  font-family: var(--font-ja);
  font-size: 27px;
  font-weight: 600;
  color: var(--accent-gold);
  letter-spacing: 0.1em;
  margin-bottom: 10px;
  transition: color 0.3s ease;
}

.question-en {
  font-family: var(--font-en);
  font-size: 39px;
  font-weight: 500;
  font-style: italic;
  color: var(--text-en);
  line-height: 1.5;
  margin-bottom: 10px;
}

.question-ja {
  font-family: var(--font-ja);
  font-size: 30px;
  font-weight: 400;
  color: var(--text-ja);
  line-height: 1.7;
}

/* ===== OPTIONS ===== */

.option-item {
  padding: 4px 0 4px 14px;
  position: relative;
}

.option-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 14px;
  width: 4px;
  height: 4px;
  background: var(--accent-indigo);
  border-radius: 50%;
  opacity: 0.5;
}

.option-en {
  font-family: var(--font-en);
  font-size: 33px;
  font-weight: 400;
  font-style: italic;
  color: var(--text-en-sub);
  line-height: 1.4;
}

.option-ja {
  font-family: var(--font-ja);
  font-size: 27px;
  font-weight: 300;
  color: #ccc8c0;
  line-height: 1.5;
  margin-top: 3px;
}

/* ===== CORRECT ANSWER ===== */
.option-item.correct {
  background: rgba(64, 128, 64, 0.06);
  border-radius: 4px;
  padding: 4px 4px 4px 14px;
}

.option-item.correct::before {
  background: #408040;
  opacity: 1;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 1100px) {
  .quiz-row {
    gap: 12px 20px;
  }
}

@media (max-width: 860px) {
  .quiz-row {
    grid-template-columns: 1fr;
    gap: 16px 0;
    padding: 20px 16px;
  }

  .question-col { grid-column: 1; grid-row: 1; }
  .screenshot-col { grid-column: 1; grid-row: 2; }
  .correct-answer { grid-column: 1; grid-row: 3; }
  .wrong-answers { grid-column: 1; grid-row: 4; }

  .question-en { font-size: 33px; }
  .question-ja { font-size: 27px; }
  .option-en { font-size: 28px; }
  .option-ja { font-size: 24px; }
}

@media (max-width: 500px) {
  .quiz-row {
    padding: 16px 12px;
  }

  .question-en { font-size: 30px; }
  .option-en { font-size: 26px; }
}

/* ===== ROW ACTIONS ===== */
.row-actions {
  position: absolute;
  top: 12px;
  right: 12px;
}

/* ===== IMPORTANT TOGGLE ===== */
.important-btn {
  background: transparent;
  border: 1px solid transparent;
  color: #403830;
  font-size: 24px;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
}

.important-btn:hover {
  color: var(--accent-gold);
  border-color: var(--accent-gold);
}

.important-btn.active {
  color: var(--accent-gold-bright);
}

/* ===== IMPORTANT ROW HIGHLIGHT ===== */
.quiz-row.important {
  border-left: 3px solid var(--accent-gold);
}
```

- [ ] **Step 3: Verify build succeeds**

Run: `npx vite build --mode development 2>&1 | tail -5`
Expected: Build completes without errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ReferenceList.tsx src/components/ReferenceList.css
git commit -m "feat: restructure entry row layout, flip text order, remove toggle"
```

---

### Task 3: Integrate SectionTabs into App Layout

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Update `src/App.tsx`**

Changes:
- Import `SectionTabs`
- Render `SectionTabs` between main content and title sidebar
- Remove level selector `<nav>` from `<aside>`

New `App.tsx` content:

```tsx
import { useMemo, useState } from "react";
import type { Entry } from "./types";
import { entries } from "./data/entries";
import { useImportantMarks } from "./hooks/useImportantMarks";
import { ReferenceList } from "./components/ReferenceList";
import { SectionTabs } from "./components/SectionTabs";
import "./App.css";

const LEVELS = [...new Set(entries.map((e) => e.level))].sort((a, b) => a - b);

export default function App() {
  const [selectedLevel, setSelectedLevel] = useState(1);
  const { marks, toggle } = useImportantMarks();

  const filtered = useMemo(
    () => entries.filter((e: Entry) => e.level === selectedLevel),
    [selectedLevel]
  );

  return (
    <div className="app-layout">
      <div className="main-content">
        <ReferenceList
          entries={filtered}
          importantMarks={marks}
          onToggleImportant={toggle}
        />
      </div>

      <SectionTabs
        levels={LEVELS}
        selectedLevel={selectedLevel}
        onSelectLevel={setSelectedLevel}
      />

      <aside className="title-sidebar">
        <div className="sidebar-titles">
          <div className="sidebar-subtitle">新・クイズ・ショック</div>
          <div className="sidebar-title">おやしろさまショック</div>
        </div>

        <div className="sidebar-count">{filtered.length}</div>
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: Update `src/App.css`**

Remove the `.level-selector`, `.level-btn`, `.level-btn:hover`, and `.level-btn.active` rule blocks (lines 121-156 in current file). The `.title-sidebar` padding-top can be adjusted since it no longer needs to accommodate the level buttons — change top padding from `20px` to `40px` to push the titles down a bit.

Remove these CSS blocks:
- `.level-selector { ... }` (lines 122-128)
- `.level-btn { ... }` (lines 130-145)
- `.level-btn:hover { ... }` (lines 147-150)
- `.level-btn.active { ... }` (lines 152-156)

**Note on three-column layout:** No additional `.app-layout` CSS changes are needed. The existing `display: flex` on `.app-layout` naturally accommodates the new `SectionTabs` component because `SectionTabs.css` sets `width: 44px; min-width: 44px; flex-shrink: 0` on `.section-tabs`, and `.main-content` uses `flex: 1` to fill remaining space. The three flex children (main-content, section-tabs, title-sidebar) will arrange left-to-right in source order.

- [ ] **Step 3: Verify build succeeds and visually check**

Run: `npx vite build --mode development 2>&1 | tail -5`
Expected: Build completes without errors.

Then run: `npx vite --open`
Expected: App opens in browser. Visually verify:
- Three-column layout: content | section tabs | title sidebar
- Tabs 0-8 with gold left-bar on selected
- Entry rows show EN first/larger, JP second/smaller
- Two-column grid per row: question+correct left, screenshot+wrong right
- Wrong answers always visible
- Star button works
- Level switching works via tabs

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/App.css
git commit -m "feat: integrate SectionTabs, remove level selector from sidebar"
```

---

### Task 4: Visual QA and Responsive Check

- [ ] **Step 1: Check desktop layout (>1100px)**

Run dev server: `npx vite`
Open browser, verify:
- Two-column entry grid renders correctly
- English text is large and first, Japanese smaller and second
- All wrong answers visible without toggle
- Section tabs between content and title sidebar
- Active tab has gold left-bar accent

- [ ] **Step 2: Check tablet layout (860px)**

Resize browser to ~860px width, verify:
- Entry grid stacks to single column (question → screenshot → correct → wrong)
- Section tabs sidebar still visible
- Title sidebar narrows to 60px, subtitle hidden

- [ ] **Step 3: Check mobile layout (500px)**

Resize to ~500px, verify:
- Further size reduction on fonts
- Both sidebars still visible but narrow
- Content still readable

- [ ] **Step 4: Fix any visual issues found**

If issues found, fix CSS and commit:
```bash
git add -u
git commit -m "fix: adjust responsive layout for redesign"
```
