# Study Mode v2: Question Cards & Sibling-Based Distractors

## Overview

Replaces the AI-generated distractor system with a simpler approach: option cards use sibling options as choices, and a new question card type uses other questions' English translations as distractors. All cards share the same SRS queue.

## Changes from v1

### What's new
- **Question cards**: Each question becomes a study card. Shows the Japanese question text; user picks the correct English translation from 4 choices (correct + 3 randomly drawn from other questions' English translations, fresh each presentation).

### What changes
- **Option cards**: Instead of drawing 3 distractors from a stored pool of 10, the 4 choices are always the English translations of all 4 sibling options in the same question, shuffled. Every option is always studyable — no minimum distractor threshold.

### What's removed
- `distractors` field from `TranslatedText` type
- `distractors` arrays from all entries in `db.json`
- `pickDistractors` function from `srs.ts` (and its test)
- `POST /questions/generate-distractors` endpoint from `server/index.ts`
- "Generate Study Distractors" button from the sidebar popover in `App.tsx`
- CardManager distractor UI (chips, add/edit/delete buttons) from `CardManager.tsx`
- `buildStudyCards` filter that skipped options with < 3 distractors

## Data Model

### TranslatedText (updated)

```typescript
interface TranslatedText {
  ja: string;
  en: string;
  // distractors field removed
}
```

### Card IDs

- Option cards: `q{questionId}-o{optionIndex}` (unchanged)
- Question cards: `q{questionId}` (new)

Both types use the same `CardProgress` type and live in `study-progress.json`. No changes to `CardProgress` or `StudyProgress` types. Existing option card progress entries carry over unchanged. New question card entries (`q{id}`) are treated as bucket 0 (unseen) automatically — no migration needed.

### Orphaned Card Cleanup

`DELETE /questions/:id` currently removes `q{id}-o0` through `q{id}-o3`. Must also remove `q{id}` (the question card entry).

## Study Card Building

`buildStudyCards` is replaced. It now produces two card types from every question:

### StudyCard type (updated)

Uses a discriminated union so each variant's fields are required, not optional:

```typescript
type StudyCard =
  | { cardId: string; ja: string; correctEn: string; type: 'option'; siblingChoices: string[] }
  | { cardId: string; ja: string; correctEn: string; type: 'question'; questionId: number };
```

### Option cards (4 per question)

For each option in a question:
- `cardId`: `q{id}-o{index}`
- `ja`: the option's Japanese text
- `correctEn`: the option's English translation
- `type`: `'option'`
- `siblingChoices`: all 4 options' English translations from the same question

At presentation: shuffle `siblingChoices` to get the 4 choices.

### Question cards (1 per question)

For each question:
- `cardId`: `q{id}`
- `ja`: the question's Japanese text
- `correctEn`: the question's English translation
- `type`: `'question'`
- `questionId`: the question's ID

At presentation: pick 3 random English translations from other questions, combine with `correctEn`, shuffle to get 4 choices.

### Total cards

N questions × 5 cards each (4 options + 1 question). Currently 21 questions = 105 cards.

### Edge cases

**Duplicate sibling translations**: If two options in the same question have identical English translations, option cards would show duplicate choices. The current data has no duplicates. If this occurs via manual editing, the card is still functional (two choices map to "correct") but the spec assumes distinct translations per question.

**Small question pool**: Question cards require at least 4 questions total (1 correct + 3 distractors). If fewer than 4 questions exist, question cards are not generated — only option cards are produced.

## Presentation Logic

Replaces the `pickDistractors` call in `presentCard`:

```
if card.type === 'option':
  choices = shuffle(card.siblingChoices)
else:
  pool = all other question cards' correctEn (excluding current)
  distractors = pick 3 random from pool
  choices = shuffle([card.correctEn, ...distractors])
```

The question distractor pool is built once from the `studyCards` array (filter by `type === 'question'`, exclude current card's `questionId`). Fresh random selection each presentation — no stored pools.

## SRS Engine

No changes to `computeNewState` or `selectNextCard`. Both card types are processed identically — the SRS engine doesn't care about card type.

`pickDistractors` function is deleted.

## UI

No visual changes. Both card types render identically:
- Japanese prompt at 72px with furigana
- 2×2 choice grid with 4 English options
- Same correct/wrong feedback (green flash 400ms / red+green highlight)
- Same sidebar stats (total count increases to N×5 cards)

The empty state message ("no distractors yet, generate from editor") is removed since all cards are always studyable.

## Server Changes

### Removed
- `POST /questions/generate-distractors` endpoint and all associated code (processing mutex usage for distractors, prompt construction). The Claude Agent SDK import stays — it's still used by `reprocess` and `add-furigana` endpoints.

### Modified
- `DELETE /questions/:id`: Also clean up `q{id}` from `study-progress.json` (in addition to existing `q{id}-o0` through `q{id}-o3`)

### db.json cleanup
- Strip `distractors` arrays from all option entries. This can be done as a one-time operation during implementation.

## CardManager Changes

Remove all distractor-related code:
- `distractors` field from the local `Card` interface and `flattenToCards`
- `saveDistractors` function
- `addingTo`, `editingDistractor`, `cancelledRef` state variables
- Distractor chip display, add/edit/delete buttons in the accordion panel
- The accordion expand/collapse panel itself — with distractors removed, the panel content is empty. Cards become flat rows showing Japanese text and English translation with inline editing.

Remove distractor-related styles from `CardManager.css` (the `/* ===== DISTRACTOR CHIPS ===== */` section and accordion panel styles).

Keep CardManager intact for editing Japanese/English text of options.

## File Changes

| File | Change |
|------|--------|
| `src/types.ts` | Remove `distractors?` from `TranslatedText` |
| `src/srs.ts` | Remove `pickDistractors` function |
| `src/srs.test.ts` | Remove `pickDistractors` tests |
| `src/components/StudyMode.tsx` | Replace `buildStudyCards`, update `StudyCard` type, change `presentCard` logic, remove empty state about distractors |
| `src/components/CardManager.tsx` | Remove distractor UI, accordion panel, related state/handlers |
| `src/components/CardManager.css` | Remove distractor chip styles and accordion panel styles |
| `src/App.tsx` | Remove "Generate Study Distractors" button, `handleGenerateDistractors`, `generating`/`generateMsg` state |
| `server/index.ts` | Remove generate-distractors endpoint, update delete cleanup |
| `db.json` | Strip all `distractors` arrays |
