# Study Mode v2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace AI-generated distractors with sibling-based choices for option cards, add question-level study cards, and remove the entire distractor generation system.

**Architecture:** Client-side only changes for card building/presentation. Server changes limited to removing the generate-distractors endpoint and updating delete cleanup. No new dependencies.

**Tech Stack:** React 19, TypeScript, Vitest, Express 5

---

## Chunk 1: Data Model & SRS Cleanup

### Task 1: Remove `distractors` from TranslatedText type

**Files:**
- Modify: `src/types.ts:1-5`

- [ ] **Step 1: Remove the distractors field**

```typescript
export interface TranslatedText {
  ja: string;
  en: string;
}
```

Remove line 4 (`distractors?: string[];`) from `src/types.ts`.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -40`

Expected: Type errors in files still referencing `distractors` — that's fine, we'll fix them in subsequent tasks. The type itself should be valid.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "refactor: remove distractors field from TranslatedText type"
```

### Task 2: Remove `pickDistractors` from SRS engine

**Files:**
- Modify: `src/srs.ts:114-121`
- Modify: `src/srs.test.ts:2-7,158-180`

- [ ] **Step 1: Remove pickDistractors function from srs.ts**

Delete lines 114-121 (the `pickDistractors` function) from `src/srs.ts`.

- [ ] **Step 2: Remove pickDistractors tests from srs.test.ts**

Remove `pickDistractors` from the import on line 6. Delete the entire `describe("pickDistractors", ...)` block (lines 158-180).

The import should become:
```typescript
import {
  BUCKET_INTERVALS,
  computeNewState,
  selectNextCard,
} from "./srs";
```

- [ ] **Step 3: Run tests to verify remaining SRS tests pass**

Run: `npx vitest run src/srs.test.ts`

Expected: All remaining tests pass (BUCKET_INTERVALS, computeNewState, selectNextCard tests). The pickDistractors tests are gone.

- [ ] **Step 4: Commit**

```bash
git add src/srs.ts src/srs.test.ts
git commit -m "refactor: remove pickDistractors from SRS engine"
```

---

## Chunk 2: StudyMode — New Card Building & Presentation

### Task 3: Rewrite buildStudyCards and presentCard in StudyMode

**Files:**
- Modify: `src/components/StudyMode.tsx`

This is the core change. Replace the `StudyCard` type, `buildStudyCards`, `getCardId`, and the distractor logic in `presentCard`.

- [ ] **Step 1: Replace StudyCard type with discriminated union**

Replace lines 8-17 (the `getCardId` function and `StudyCard` interface) with:

```typescript
type StudyCard =
  | { cardId: string; ja: string; correctEn: string; type: 'option'; siblingChoices: string[] }
  | { cardId: string; ja: string; correctEn: string; type: 'question'; questionId: number };
```

- [ ] **Step 2: Replace buildStudyCards function**

Replace lines 19-34 (the `buildStudyCards` function) with:

```typescript
const MIN_QUESTIONS_FOR_QUESTION_CARDS = 4;

function buildStudyCards(questions: Question[]): StudyCard[] {
  const cards: StudyCard[] = [];
  for (const q of questions) {
    // Option cards: 4 per question, siblings are distractors
    const siblingChoices = q.options.map((o) => o.en);
    for (let oi = 0; oi < q.options.length; oi++) {
      cards.push({
        cardId: `q${q.id}-o${oi}`,
        ja: q.options[oi].ja,
        correctEn: q.options[oi].en,
        type: 'option',
        siblingChoices,
      });
    }
    // Question cards: 1 per question (only if enough questions for distractors)
    if (questions.length >= MIN_QUESTIONS_FOR_QUESTION_CARDS) {
      cards.push({
        cardId: `q${q.id}`,
        ja: q.question.ja,
        correctEn: q.question.en,
        type: 'question',
        questionId: q.id,
      });
    }
  }
  return cards;
}
```

- [ ] **Step 3: Update the import to remove pickDistractors**

Change line 4 from:
```typescript
import { computeNewState, selectNextCard, pickDistractors } from "../srs";
```
to:
```typescript
import { computeNewState, selectNextCard } from "../srs";
```

- [ ] **Step 4: Update presentCard to use new card types**

In the `presentCard` callback (around lines 95-122), replace the distractor/choice logic. Find this block inside `presentCard`:

```typescript
      const card = cards.find((c) => c.cardId === result.cardId)!;
      const distractorChoices = pickDistractors(card.distractors);
      const allChoices = shuffleArray([card.correctEn, ...distractorChoices]);
```

Replace with:

```typescript
      const card = cards.find((c) => c.cardId === result.cardId)!;
      let allChoices: string[];
      if (card.type === 'option') {
        allChoices = shuffleArray(card.siblingChoices);
      } else {
        const pool = cards
          .filter((c): c is Extract<StudyCard, { type: 'question' }> =>
            c.type === 'question' && c.questionId !== card.questionId
          )
          .map((c) => c.correctEn);
        const shuffledPool = shuffleArray(pool);
        allChoices = shuffleArray([card.correctEn, ...shuffledPool.slice(0, 3)]);
      }
```

- [ ] **Step 5: Replace the empty state message**

Replace lines 198-212 (the `studyCards.length === 0` block) with:

```tsx
  if (studyCards.length === 0) {
    return (
      <div className="study-container">
        <div className="study-empty">
          <p>No study cards available.</p>
          <p className="study-empty-sub">
            Add questions to get started.
          </p>
          <Link to="/" className="study-back-link">Back to Editor</Link>
        </div>
      </div>
    );
  }
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -40`

Expected: No errors in StudyMode.tsx (other files may still have errors from leftover distractor references — those are addressed in later tasks).

- [ ] **Step 7: Commit**

```bash
git add src/components/StudyMode.tsx
git commit -m "feat: add question cards and use sibling choices for option cards"
```

---

## Chunk 3: Remove Distractor Infrastructure

### Task 4: Remove generate-distractors endpoint from server

**Files:**
- Modify: `server/index.ts:14-18,183-274,432-448`

- [ ] **Step 1: Remove `distractors` from server's TranslatedText interface**

In `server/index.ts`, remove line 17 (`distractors?: string[];`) from the `TranslatedText` interface (lines 14-18). The interface becomes:

```typescript
interface TranslatedText {
  ja: string;
  en: string;
}
```

- [ ] **Step 2: Remove the generate-distractors endpoint**

Delete the entire `app.post("/questions/generate-distractors", ...)` handler (lines 183-274).

- [ ] **Step 3: Update delete handler to also remove question card progress**

In the `DELETE /questions/:id` handler, find the study progress cleanup block. (Original line numbers: 432-448. After Step 2's deletion of ~92 lines, this block will be around lines 340-356.) Search for `let changed = false;` inside the delete handler. After the loop that deletes `q${id}-o0` through `q${id}-o3`, also delete the question card entry `q${id}`:

Replace this section:
```typescript
    let changed = false;
    for (let oi = 0; oi < 4; oi++) {
      const cardId = `q${id}-o${oi}`;
      if (cardId in progress.cards) {
        delete progress.cards[cardId];
        changed = true;
      }
    }
```

With:
```typescript
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
```

- [ ] **Step 4: Verify server compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: No errors in server/index.ts.

- [ ] **Step 5: Commit**

```bash
git add server/index.ts
git commit -m "refactor: remove generate-distractors endpoint, add question card cleanup"
```

### Task 5: Remove distractor UI from App.tsx

**Files:**
- Modify: `src/App.tsx:25-26,134-163,226-231`

- [ ] **Step 1: Remove generating/generateMsg state and handler**

In `src/App.tsx`:

1. Delete line 25 (`const [generating, setGenerating] = useState(false);`)
2. Delete line 26 (`const [generateMsg, setGenerateMsg] = useState<string | null>(null);`)
3. Delete the `handleGenerateDistractors` function (lines 134-163)
4. In the `showToast` function (line 60), remove `setGenerateMsg(null);`

- [ ] **Step 2: Remove the generate distractors button from the popover**

Delete the entire button element (lines 225-231 in the original file):
```tsx
            <button
              className="sidebar-popover-action"
              onClick={handleGenerateDistractors}
              disabled={generating}
            >
              {generating ? "生成中…" : "練習問題を生成"}
            </button>
```

- [ ] **Step 3: Update toast display to remove generateMsg**

In the toast display (line 256), change:
```tsx
      {(reprocessMsg || generateMsg || furiganaMsg) && (
        <div className="toast-message" role="status">
          {reprocessMsg || generateMsg || furiganaMsg}
        </div>
      )}
```
to:
```tsx
      {(reprocessMsg || furiganaMsg) && (
        <div className="toast-message" role="status">
          {reprocessMsg || furiganaMsg}
        </div>
      )}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: remove generate distractors button and handler from editor"
```

### Task 6: Remove distractor UI from CardManager

**Files:**
- Modify: `src/components/CardManager.tsx`
- Modify: `src/components/CardManager.css`

- [ ] **Step 1: Simplify the Card interface and flattenToCards**

In `src/components/CardManager.tsx`, remove `distractors` from the `Card` interface (line 22) and from `flattenToCards` (line 36). The interface becomes:

```typescript
interface Card {
  questionId: number;
  optionIndex: number;
  ja: string;
  en: string;
  isCorrect: boolean;
}
```

And in `flattenToCards`, remove line 36 (`distractors: opt.distractors ?? [],`).

- [ ] **Step 2: Remove distractor-related state and functions**

Remove these from the `CardManager` component:
- Line 49: `const [addingTo, setAddingTo] = useState<string | null>(null);`
- Line 51: `const [editingDistractor, setEditingDistractor] = useState<string | null>(null);`
- Line 54: `const cancelledRef = useRef(false);`
- Lines 91-114: The entire `saveDistractors` function

Also, the `openCards` state (line 48), `toggleCard` function (lines 56-63), and the `openCards` null-initialization block (lines 128-132: `if (openCards === null && cards.length > 0) { ... }`) are only used for accordion expand/collapse. Remove all of them since the accordion panel is being removed.

- [ ] **Step 3: Remove the accordion panel and chevron from the JSX**

Replace the entire card rendering section. The accordion row currently has: id cell, ja display/input, en input, chevron, then an expandable panel. Remove the chevron and panel, making cards flat rows.

Replace the JSX inside the `cards.map()` callback (starting from `<div className={`acc-item...`) with:

```tsx
            <div key={cardKey}>
              {showDivider && <div className="acc-q-divider" />}
              <div className={`acc-item${idx % 2 === 1 ? " alt-row" : ""}`}>
                <div className="acc-row">
                  <div className="acc-id-cell">
                    <span className="acc-id">{`${toKanji(card.questionId)}問の${toKanji(card.optionIndex + 1)}`}</span>
                    {card.isCorrect && <span className="acc-correct-dot" />}
                  </div>
                  {editingJa === cardKey ? (
                    <input
                      className="acc-stem-input"
                      defaultValue={card.ja}
                      autoFocus
                      onBlur={(e) => {
                        setEditingJa(null);
                        if (e.target.value !== card.ja) {
                          saveOption(card.questionId, card.optionIndex, "ja", e.target.value);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      className="acc-ruby-display"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingJa(cardKey);
                      }}
                    >
                      {parseRuby(card.ja)}
                    </div>
                  )}
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
                </div>
              </div>
            </div>
```

Key changes: removed `isOpen` check from class, removed `onClick` from `acc-row`, removed chevron div, removed entire `acc-panel` div.

- [ ] **Step 4: Remove unused imports**

The `useRef` import is no longer needed (after removing `cancelledRef` and `openCards`). Update the import:

```typescript
import { useEffect, useState } from "react";
```

- [ ] **Step 5: Remove distractor and accordion styles from CardManager.css**

Delete these sections from `src/components/CardManager.css`:

1. The **chevron** styles (lines 157-172): `.acc-chevron` and `.acc-item.open .acc-chevron`
2. The **expanded panel** section (lines 188-228): `.acc-panel`, `.acc-item.open .acc-panel`, `.acc-panel-inner`, `.panel-label`, `.panel-label::after`, `.panel-chips`
3. The **distractor chips** section (lines 230-345): `.d-chip`, `.d-chip:hover`, `.d-chip-text`, `.d-chip-x`, `.d-chip:hover .d-chip-x`, `.d-chip-x:hover`, `.d-add`, `.d-add:hover`, `.d-chip-edit`
4. The **open state** accent line (lines 113-116): `.acc-item.open::before`
5. In the **responsive** sections: remove `.acc-panel-inner` overrides (lines 381-383, 395-397) and `.d-chip` override (lines 399-402)

6. Update `.acc-row` (line 119-127): change `grid-template-columns` from `72px 1fr 1fr 48px` to `72px 1fr 1fr` (remove the 48px chevron column), change `cursor: pointer` to `cursor: default`, and remove `user-select: none` since rows are no longer click targets.

Keep all other styles (layout, sidebar, id cell, inline editing, furigana display, divider, animation, responsive grid).

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/CardManager.tsx src/components/CardManager.css
git commit -m "refactor: remove distractor UI and accordion from CardManager"
```

---

## Chunk 4: Data Cleanup

### Task 7: Strip distractors from db.json

**Files:**
- Modify: `db.json`

- [ ] **Step 1: Write a one-time script to strip distractors**

Run this Node.js one-liner to remove all `distractors` arrays from db.json:

```bash
node -e "
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('db.json', 'utf-8'));
for (const q of db.questions) {
  for (const opt of q.options) {
    delete opt.distractors;
  }
  delete q.question.distractors;
}
fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
console.log('Stripped distractors from', db.questions.length, 'questions');
"
```

Expected: "Stripped distractors from 21 questions"

- [ ] **Step 2: Verify db.json no longer contains distractors**

Run: `grep -c '"distractors"' db.json`

Expected: 0 (no matches)

- [ ] **Step 3: Commit**

```bash
git add db.json
git commit -m "data: strip distractor arrays from db.json"
```

---

## Chunk 5: Verification

### Task 8: Full build and test verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`

Expected: All tests pass.

- [ ] **Step 2: Run TypeScript type check**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: Build succeeds.

- [ ] **Step 4: Verify no leftover distractor references**

Run: `grep -rn "distractor\|pickDistractor\|generate-distractor\|generateDistractor" src/ server/ --include="*.ts" --include="*.tsx" --include="*.css"`

Expected: No matches (all distractor references have been removed).

- [ ] **Step 5: Spot-check study card count**

Run: `node -e "const db = require('./db.json'); const n = db.questions.length; console.log('Questions:', n, '| Expected cards:', n >= 4 ? n * 5 : n * 4);"`

Expected: "Questions: 21 | Expected cards: 105"
