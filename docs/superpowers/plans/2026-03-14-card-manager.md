# Card Manager Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/manage` route with an accordion-based flat list of all study cards, supporting inline editing of stems, answers, and full CRUD on distractors with auto-save on blur.

**Architecture:** Single new component (`CardManager.tsx`) fetches questions on mount, flattens them into a card list, and renders an accordion UI. Edits mutate React state and auto-save via the existing `PATCH /api/questions/:id` endpoint, always sending the full 4-option tuple. No new backend work needed.

**Tech Stack:** React 19, TypeScript, CSS, React Router DOM v7, existing Express API

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/CardManager.tsx` | Create | Accordion list component with inline editing and distractor CRUD |
| `src/components/CardManager.css` | Create | Styles for accordion rows, panels, chips, animations |
| `src/App.tsx` | Modify | Add `/manage` route, add "Manage Cards" nav link in Editor header |
| `src/App.css` | Modify | Add `.manage-link` style (mirrors existing `.study-link`) |

---

## Chunk 1: Route, Shell, and Static Accordion

### Task 1: Add route and navigation link

**Files:**
- Modify: `src/App.tsx:1-175`
- Modify: `src/App.css`

- [ ] **Step 1: Import CardManager and add route**

In `src/App.tsx`, add the import and route:

```tsx
// Add to imports (line 5)
import { CardManager } from "./components/CardManager";

// Add route inside <Routes> (after line 170)
<Route path="/manage" element={<CardManager />} />
```

- [ ] **Step 2: Add navigation link in Editor header**

In the Editor's `<header>` (after the Study Mode link at line 124), add:

```tsx
<Link to="/manage" className="manage-link">Manage Cards</Link>
```

- [ ] **Step 3: Add manage-link style**

In `src/App.css`, add after the `.study-link:hover` rule (after line 241):

```css
.manage-link {
  font-family: var(--font-en);
  font-size: 13px;
  color: var(--accent-gold);
  text-decoration: none;
  letter-spacing: 0.05em;
  border: 1px solid var(--accent-gold);
  padding: 8px 20px;
  border-radius: 4px;
  transition: background-color 0.2s ease, color 0.2s ease;
  white-space: nowrap;
}

.manage-link:hover {
  background: rgba(154, 138, 72, 0.15);
  color: var(--accent-gold-bright);
}
```

- [ ] **Step 4: Create placeholder CardManager component**

Create `src/components/CardManager.tsx`:

```tsx
import "./CardManager.css";

export function CardManager() {
  return (
    <div className="manage-layout">
      <div className="manage-content">
        <p>Card Manager placeholder</p>
      </div>
      <aside className="manage-sidebar">
        <div className="manage-sidebar-title">管理</div>
      </aside>
    </div>
  );
}
```

Create `src/components/CardManager.css` as empty file:

```css
/* CardManager styles */
```

- [ ] **Step 5: Verify the route works**

Run: `npm run dev`
Navigate to `http://localhost:5173/manage` — should see placeholder text with sidebar.
Navigate to `http://localhost:5173/` — should see "Manage Cards" link in header.

- [ ] **Step 6: Commit**

```bash
git add src/components/CardManager.tsx src/components/CardManager.css src/App.tsx src/App.css
git commit -m "feat: add /manage route and CardManager placeholder"
```

### Task 2: Data fetching and card flattening

**Files:**
- Modify: `src/components/CardManager.tsx`

- [ ] **Step 1: Add fetch and flatten logic**

Replace `CardManager.tsx` with:

```tsx
import { useEffect, useState } from "react";
import type { Question } from "../types";
import { Link } from "react-router-dom";
import "./CardManager.css";

interface Card {
  questionId: number;
  optionIndex: number;
  ja: string;
  en: string;
  distractors: string[];
  isCorrect: boolean;
}

function flattenToCards(questions: Question[]): Card[] {
  const cards: Card[] = [];
  for (const q of questions) {
    for (let i = 0; i < q.options.length; i++) {
      const opt = q.options[i];
      cards.push({
        questionId: q.id,
        optionIndex: i,
        ja: opt.ja,
        en: opt.en,
        distractors: opt.distractors ?? [],
        isCorrect: q.correctOption === i,
      });
    }
  }
  return cards;
}

export function CardManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
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

  const cards = flattenToCards(questions);

  if (loading) return <div className="center">読み込み中…</div>;
  if (error) return <div className="center error">Error: {error}</div>;

  return (
    <div className="manage-layout">
      <div className="manage-content">
        {cards.map((card) => (
          <div key={`q${card.questionId}-o${card.optionIndex}`} className="acc-item">
            <div className="acc-row">
              <div className="acc-id-cell">
                <span className="acc-id">q{card.questionId}-o{card.optionIndex}</span>
                {card.isCorrect && <span className="acc-correct-dot" />}
              </div>
              <div className="acc-stem">{card.ja}</div>
              <div className="acc-answer">{card.en}</div>
              <div className="acc-chevron">▼</div>
            </div>
          </div>
        ))}
      </div>
      <aside className="manage-sidebar">
        <div className="manage-sidebar-title">管理</div>
        <Link to="/" className="manage-back-link">← Editor</Link>
        <div className="manage-sidebar-count">{cards.length}</div>
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: Verify data loads and renders**

Run: `npm run dev`
Navigate to `/manage` — should see flat list of all cards with IDs, stems, answers, and chevrons.

- [ ] **Step 3: Commit**

```bash
git add src/components/CardManager.tsx
git commit -m "feat: add data fetching and card flattening to CardManager"
```

### Task 3: Sidebar and layout CSS

**Files:**
- Modify: `src/components/CardManager.css`

- [ ] **Step 1: Write layout and sidebar styles**

Write `src/components/CardManager.css`:

```css
/* ===== MANAGE LAYOUT ===== */
.manage-layout {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.manage-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100vh;
  scrollbar-width: thin;
  scrollbar-color: #2a2930 var(--bg);
}

.manage-content::-webkit-scrollbar { width: 6px; }
.manage-content::-webkit-scrollbar-track { background: var(--bg); }
.manage-content::-webkit-scrollbar-thumb { background: #2a2930; border-radius: 3px; }

/* ===== SIDEBAR ===== */
.manage-sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  height: 100vh;
  position: sticky;
  top: 0;
  right: 0;
  background: var(--bg-sidebar);
  border-left: 1px solid var(--border-row);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  flex-shrink: 0;
}

.manage-sidebar-title {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-family: var(--font-ja);
  font-size: 40px;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 0.15em;
  line-height: 1;
  text-shadow: 0 0 50px rgba(58, 58, 110, 0.25);
  user-select: none;
}

.manage-sidebar-count {
  position: absolute;
  bottom: 28px;
  font-family: var(--font-en);
  font-size: 13px;
  font-weight: 400;
  color: var(--accent-gold);
  letter-spacing: 0.2em;
}

.manage-back-link {
  position: absolute;
  top: 20px;
  font-family: var(--font-en);
  font-size: 12px;
  color: var(--accent-gold);
  text-decoration: none;
  letter-spacing: 0.05em;
  transition: color 0.2s ease;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.manage-back-link:hover {
  color: var(--accent-gold-bright);
}

/* ===== ACCORDION ITEMS ===== */
.acc-item {
  border-bottom: 1px solid var(--border-row);
  position: relative;
  transition: background 0.3s;
  animation: rowIn 0.4s ease both;
}

.acc-item.alt-row {
  background: var(--bg-row-alt);
}

.acc-item:hover {
  background: var(--bg-row-hover);
}

/* Hover accent line */
.acc-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--accent-gold);
  opacity: 0;
  transition: opacity 0.3s;
}

.acc-item:hover::before {
  opacity: 1;
}

.acc-item.open::before {
  opacity: 1;
  background: var(--accent-indigo-light);
}

/* ===== ROW (collapsed view) ===== */
.acc-row {
  display: grid;
  grid-template-columns: 72px 1fr 1fr 48px;
  gap: 0 20px;
  align-items: center;
  padding: 18px 40px;
  cursor: pointer;
  user-select: none;
}

.acc-id-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.acc-id {
  font-family: var(--font-en);
  font-size: 12px;
  color: var(--accent-gold);
  letter-spacing: 0.08em;
  opacity: 0.5;
  transition: opacity 0.3s;
}

.acc-item:hover .acc-id {
  opacity: 1;
}

.acc-correct-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #408040;
  box-shadow: 0 0 6px rgba(64, 128, 64, 0.4);
  flex-shrink: 0;
}

.acc-stem {
  font-family: var(--font-ja);
  font-size: 21px;
  color: var(--text-ja);
  line-height: 1.4;
}

.acc-answer {
  font-family: var(--font-en);
  font-size: 17px;
  font-style: italic;
  color: var(--text-en);
  line-height: 1.4;
}

.acc-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: #38354a;
  font-size: 10px;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), color 0.3s;
  justify-self: end;
}

.acc-item.open .acc-chevron {
  transform: rotate(180deg);
  color: var(--accent-indigo-light);
}

/* ===== QUESTION GROUP DIVIDER ===== */
.acc-q-divider {
  height: 1px;
  margin: 0 40px;
  background: linear-gradient(90deg, transparent, var(--accent-indigo), transparent);
  opacity: 0.15;
}

/* ===== ROW ANIMATION ===== */
@keyframes rowIn {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

/* animation is applied via .acc-item rule above */

/* ===== RESPONSIVE ===== */
@media (max-width: 860px) {
  .acc-row {
    grid-template-columns: 1fr;
    gap: 8px 0;
    padding: 16px 16px;
  }

  .manage-sidebar-title {
    font-size: 28px;
  }
}

@media (max-width: 500px) {
  .manage-sidebar-title {
    font-size: 22px;
  }

  .acc-row {
    padding: 12px 12px;
  }
}
```

- [ ] **Step 2: Add question group dividers to CardManager.tsx**

In `CardManager.tsx`, update the card rendering to insert dividers between question groups. Replace the `cards.map(...)` block:

```tsx
{cards.map((card, idx) => {
  const prevCard = idx > 0 ? cards[idx - 1] : null;
  const showDivider = prevCard && prevCard.questionId !== card.questionId;
  return (
    <div key={`q${card.questionId}-o${card.optionIndex}`}>
      {showDivider && <div className="acc-q-divider" />}
      <div className="acc-item">
        <div className="acc-row">
          <div className="acc-id-cell">
            <span className="acc-id">q{card.questionId}-o{card.optionIndex}</span>
            {card.isCorrect && <span className="acc-correct-dot" />}
          </div>
          <div className="acc-stem">{card.ja}</div>
          <div className="acc-answer">{card.en}</div>
          <div className="acc-chevron">▼</div>
        </div>
      </div>
    </div>
  );
})}
```

- [ ] **Step 3: Verify visual appearance**

Run: `npm run dev`
Navigate to `/manage` — should see styled accordion rows with sidebar, gold accents, dividers between question groups, hover effects.

- [ ] **Step 4: Commit**

```bash
git add src/components/CardManager.css src/components/CardManager.tsx
git commit -m "feat: add accordion layout and sidebar styling for CardManager"
```

---

## Chunk 2: Accordion Expand/Collapse and Inline Editing

### Task 4: Accordion expand/collapse

**Files:**
- Modify: `src/components/CardManager.tsx`
- Modify: `src/components/CardManager.css`

- [ ] **Step 1: Add expand/collapse state and panel**

In `CardManager.tsx`, add open-card tracking state and the panel. Add after the `error` state:

```tsx
const [openCards, setOpenCards] = useState<Set<string>>(new Set());

function toggleCard(cardKey: string) {
  setOpenCards((prev) => {
    const next = new Set(prev);
    if (next.has(cardKey)) next.delete(cardKey);
    else next.add(cardKey);
    return next;
  });
}
```

Update the card rendering to use expand/collapse:

```tsx
{cards.map((card, idx) => {
  const prevCard = idx > 0 ? cards[idx - 1] : null;
  const showDivider = prevCard && prevCard.questionId !== card.questionId;
  const cardKey = `q${card.questionId}-o${card.optionIndex}`;
  const isOpen = openCards.has(cardKey);
  return (
    <div key={cardKey}>
      {showDivider && <div className="acc-q-divider" />}
      <div className={`acc-item${isOpen ? " open" : ""}${idx % 2 === 1 ? " alt-row" : ""}`}>
        <div className="acc-row" onClick={() => toggleCard(cardKey)}>
          <div className="acc-id-cell">
            <span className="acc-id">{cardKey}</span>
            {card.isCorrect && <span className="acc-correct-dot" />}
          </div>
          <div className="acc-stem">{card.ja}</div>
          <div className="acc-answer">{card.en}</div>
          <div className="acc-chevron">▼</div>
        </div>
        <div className="acc-panel">
          <div className="acc-panel-inner">
            <div className="panel-label">
              Distractors ({card.distractors.length})
            </div>
            <div className="panel-chips">
              {card.distractors.map((d, di) => (
                <span key={di} className="d-chip">{d}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
})}
```

- [ ] **Step 2: Add panel CSS**

Append to `CardManager.css`:

```css
/* ===== EXPANDED PANEL ===== */
.acc-panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
  opacity: 0;
}

.acc-item.open .acc-panel {
  max-height: 300px;
  opacity: 1;
}

.acc-panel-inner {
  padding: 0 40px 24px 132px;
}

.panel-label {
  font-family: var(--font-en);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #4a4656;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--border-row), transparent);
}

.panel-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* ===== DISTRACTOR CHIPS ===== */
.d-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 3px;
  background: rgba(58, 58, 110, 0.12);
  border: 1px solid rgba(58, 58, 110, 0.2);
  font-family: var(--font-en);
  font-size: 14px;
  color: #9896b8;
  cursor: text;
  transition: border-color 0.2s, color 0.2s;
}

.d-chip:hover {
  border-color: rgba(80, 80, 160, 0.45);
  color: #b8b6d4;
}
```

- [ ] **Step 3: Verify expand/collapse works**

Run: `npm run dev`
Click a row — panel should slide open showing distractors. Click again — should collapse. Chevron should rotate.

- [ ] **Step 4: Commit**

```bash
git add src/components/CardManager.tsx src/components/CardManager.css
git commit -m "feat: add accordion expand/collapse with distractor display"
```

### Task 5: Inline editing for stem and answer

**Files:**
- Modify: `src/components/CardManager.tsx`
- Modify: `src/components/CardManager.css`

- [ ] **Step 1: Add save function and editable fields**

In `CardManager.tsx`, add the save helper after `toggleCard`:

```tsx
async function saveOption(
  questionId: number,
  optionIndex: number,
  field: "ja" | "en",
  value: string
) {
  const question = questions.find((q) => q.id === questionId);
  if (!question) return;

  const newOptions = [...question.options] as Question["options"];
  newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value };

  try {
    const res = await fetch(`/api/questions/${questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options: newOptions }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const updated: Question = await res.json();
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
  } catch (err) {
    console.error("Save failed:", err);
  }
}
```

Replace the static `.acc-stem` and `.acc-answer` divs with editable inputs. Update the card rendering:

```tsx
<input
  className="acc-stem-input"
  defaultValue={card.ja}
  onBlur={(e) => {
    if (e.target.value !== card.ja) {
      saveOption(card.questionId, card.optionIndex, "ja", e.target.value);
    }
  }}
  onClick={(e) => e.stopPropagation()}
/>
<input
  className="acc-answer-input"
  defaultValue={card.en}
  onBlur={(e) => {
    if (e.target.value !== card.en) {
      saveOption(card.questionId, card.optionIndex, "en", e.target.value);
    }
  }}
  onClick={(e) => e.stopPropagation()}
/>
```

Note: `defaultValue` + `onBlur` avoids controlled input issues. `onClick stopPropagation` prevents row toggle when clicking into the input.

- [ ] **Step 2: Add input styles**

Append to `CardManager.css`:

```css
/* ===== INLINE EDITING ===== */
.acc-stem-input,
.acc-answer-input {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  padding: 3px 8px;
  width: 100%;
  transition: border-color 0.2s, background-color 0.2s;
  outline: none;
}

.acc-stem-input {
  font-family: var(--font-ja);
  font-size: 21px;
  color: var(--text-ja);
  line-height: 1.4;
}

.acc-answer-input {
  font-family: var(--font-en);
  font-size: 17px;
  font-style: italic;
  color: var(--text-en);
  line-height: 1.4;
}

.acc-stem-input:hover,
.acc-answer-input:hover {
  border-color: var(--border-row);
}

.acc-stem-input:focus,
.acc-answer-input:focus {
  border-color: var(--accent-indigo-light);
  background: rgba(58, 58, 110, 0.08);
}
```

- [ ] **Step 3: Verify inline editing works**

Run: `npm run dev`
Click into a stem field, change text, click away. Refresh page — change should persist.

- [ ] **Step 4: Commit**

```bash
git add src/components/CardManager.tsx src/components/CardManager.css
git commit -m "feat: add inline editing with auto-save for stem and answer"
```

---

## Chunk 3: Distractor CRUD

### Task 6: Distractor delete and add

**Files:**
- Modify: `src/components/CardManager.tsx`
- Modify: `src/components/CardManager.css`

- [ ] **Step 1: Add distractor save helper**

In `CardManager.tsx`, add after `saveOption`:

```tsx
async function saveDistractors(
  questionId: number,
  optionIndex: number,
  distractors: string[]
) {
  const question = questions.find((q) => q.id === questionId);
  if (!question) return;

  const newOptions = [...question.options] as Question["options"];
  newOptions[optionIndex] = { ...newOptions[optionIndex], distractors };

  try {
    const res = await fetch(`/api/questions/${questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options: newOptions }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const updated: Question = await res.json();
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
  } catch (err) {
    console.error("Save distractors failed:", err);
  }
}
```

- [ ] **Step 2: Add delete buttons to chips and add button**

Add state for tracking which card is in "adding" mode. Add after `openCards` state:

```tsx
const [addingTo, setAddingTo] = useState<string | null>(null);
// cardKey of the card currently adding a new distractor (local-only, not saved until blur)
```

Update the distractor chips rendering in the panel:

```tsx
<div className="panel-chips">
  {card.distractors.map((d, di) => (
    <span key={di} className="d-chip">
      <span className="d-chip-text">{d}</span>
      <span
        className="d-chip-x"
        onClick={(e) => {
          e.stopPropagation();
          const updated = card.distractors.filter((_, i) => i !== di);
          saveDistractors(card.questionId, card.optionIndex, updated);
        }}
      >
        ×
      </span>
    </span>
  ))}
  {addingTo === cardKey ? (
    <span className="d-chip">
      <input
        className="d-chip-edit"
        autoFocus
        placeholder="new distractor"
        onBlur={(e) => {
          setAddingTo(null);
          const val = e.target.value.trim();
          if (val) {
            saveDistractors(card.questionId, card.optionIndex, [
              ...card.distractors,
              val,
            ]);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setAddingTo(null);
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </span>
  ) : (
    <button
      className="d-add"
      onClick={(e) => {
        e.stopPropagation();
        setAddingTo(cardKey);
      }}
    >
      +
    </button>
  )}
</div>
```

Note: The add flow uses local-only state (`addingTo`). No data is saved to the server until the user types text and blurs. Pressing Escape or blurring with empty text simply clears the adding state — no empty string is persisted.

- [ ] **Step 3: Add chip interaction styles**

Append to `CardManager.css`:

```css
.d-chip-text {
  cursor: text;
}

.d-chip-x {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  font-size: 12px;
  color: transparent;
  cursor: pointer;
  border-radius: 2px;
  transition: color 0.15s, background 0.15s;
}

.d-chip:hover .d-chip-x {
  color: #605868;
}

.d-chip-x:hover {
  color: #c06060 !important;
  background: rgba(128, 64, 64, 0.15);
}

.d-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px dashed rgba(58, 58, 110, 0.3);
  border-radius: 3px;
  background: transparent;
  color: rgba(80, 80, 160, 0.35);
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.d-add:hover {
  border-color: var(--accent-indigo-light);
  color: var(--accent-indigo-light);
}
```

- [ ] **Step 4: Verify delete and add work**

Run: `npm run dev`
Expand a card. Hover a chip — `×` should appear. Click it — chip removed. Refresh — deletion persisted.
Click `+` — enter text — new chip appears. Refresh — persisted.

- [ ] **Step 5: Commit**

```bash
git add src/components/CardManager.tsx src/components/CardManager.css
git commit -m "feat: add distractor delete and add functionality"
```

### Task 7: Distractor inline edit

**Files:**
- Modify: `src/components/CardManager.tsx`
- Modify: `src/components/CardManager.css`

- [ ] **Step 1: Add editing state and editable chip**

In `CardManager.tsx`, add state for tracking which distractor is being edited. Add after `addingTo` state:

```tsx
const [editingDistractor, setEditingDistractor] = useState<string | null>(null);
// Format: "q1-o0-3" (cardKey + distractor index)
```

Replace the `d-chip-text` span in the existing chip rendering with a click-to-edit version. Update each chip in the `card.distractors.map(...)`:

```tsx
{card.distractors.map((d, di) => {
  const chipKey = `${cardKey}-${di}`;
  const isEditing = editingDistractor === chipKey;
  return (
    <span key={di} className="d-chip">
      {isEditing ? (
        <input
          className="d-chip-edit"
          defaultValue={d}
          autoFocus
          onBlur={(e) => {
            setEditingDistractor(null);
            const newVal = e.target.value.trim();
            if (newVal && newVal !== d) {
              const updated = [...card.distractors];
              updated[di] = newVal;
              saveDistractors(card.questionId, card.optionIndex, updated);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditingDistractor(null);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="d-chip-text"
          onClick={(e) => {
            e.stopPropagation();
            setEditingDistractor(chipKey);
          }}
        >
          {d}
        </span>
      )}
      <span
        className="d-chip-x"
        onClick={(e) => {
          e.stopPropagation();
          const updated = card.distractors.filter((_, i) => i !== di);
          saveDistractors(card.questionId, card.optionIndex, updated);
        }}
      >
        ×
      </span>
    </span>
  );
})}
```

The add button (`+` → inline input) was already implemented in Task 6 using the `addingTo` state — no changes needed there.

- [ ] **Step 2: Add chip edit styles**

Append to `CardManager.css`:

```css
.d-chip-edit {
  background: transparent;
  border: none;
  outline: none;
  font-family: var(--font-en);
  font-size: 14px;
  color: #b8b6d4;
  width: 100px;
  padding: 0;
}
```

- [ ] **Step 3: Verify distractor editing works**

Run: `npm run dev`
Expand a card. Click a distractor's text — should become an input. Edit and blur — saves. Click `+` — empty chip appears in edit mode. Type and blur — saves. Press Escape — cancels.

- [ ] **Step 4: Commit**

```bash
git add src/components/CardManager.tsx src/components/CardManager.css
git commit -m "feat: add inline distractor editing with click-to-edit chips"
```

### Task 8: Final polish and responsive

**Files:**
- Modify: `src/components/CardManager.css`

- [ ] **Step 1: Add responsive panel styles**

Merge these rules into the existing `@media` blocks in `CardManager.css` (from Task 3). Add to the `@media (max-width: 860px)` block:

```css
  .acc-panel-inner {
    padding: 0 16px 20px 16px;
  }
```

Add to the `@media (max-width: 500px)` block:

```css
  .acc-panel-inner {
    padding: 0 12px 16px 12px;
  }

  .d-chip {
    font-size: 12px;
    padding: 4px 8px;
  }
```

- [ ] **Step 2: Verify responsive behavior**

Resize browser to narrow widths — layout should collapse gracefully.

- [ ] **Step 3: Commit**

```bash
git add src/components/CardManager.css
git commit -m "feat: add responsive styles for CardManager panels"
```

- [ ] **Step 4: Final smoke test**

Run: `npm run dev`
Full test checklist:
1. Navigate to `/` — "Manage Cards" link visible
2. Click "Manage Cards" — `/manage` loads with sidebar and card list
3. Sidebar shows `管理` vertically with card count
4. Cards are grouped by question with indigo dividers
5. Click a row — expands to show distractors
6. Click again — collapses
7. Click into a stem — edit text, blur — saves (refresh to confirm)
8. Click into an answer — edit text, blur — saves
9. Click a distractor — edit mode — change text, blur — saves
10. Hover a chip — `×` appears — click — deletes
11. Click `+` — new empty chip in edit mode — type and blur — saves
12. Click "← Editor" in sidebar — returns to `/`
