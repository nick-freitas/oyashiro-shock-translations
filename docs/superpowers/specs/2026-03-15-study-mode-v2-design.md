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

Both types use the same `CardProgress` type and live in `study-progress.json`. No changes to `CardProgress` or `StudyProgress` types.

### Orphaned Card Cleanup

`DELETE /questions/:id` currently removes `q{id}-o0` through `q{id}-o3`. Must also remove `q{id}` (the question card entry).

## Study Card Building

`buildStudyCards` is replaced. It now produces two card types from every question:

### StudyCard type (updated)

```typescript
interface StudyCard {
  cardId: string;
  ja: string;
  correctEn: string;
  type: 'option' | 'question';
  // For option cards: all 4 sibling English translations (including correct)
  siblingChoices?: string[];
  // For question cards: the question ID (to exclude self when picking distractors)
  questionId?: number;
}
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

~96 questions × 5 cards each (4 options + 1 question) = ~480 cards.

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
- Same sidebar stats (counts increase from ~384 to ~480 total cards)

The empty state message ("no distractors yet, generate from editor") is removed since all cards are always studyable.

## Server Changes

### Removed
- `POST /questions/generate-distractors` endpoint and all associated code (Claude Agent SDK import, processing mutex usage for distractors, prompt construction)

### Modified
- `DELETE /questions/:id`: Also clean up `q{id}` from `study-progress.json` (in addition to existing `q{id}-o0` through `q{id}-o3`)

### db.json cleanup
- Strip `distractors` arrays from all option entries. This can be done as a one-time operation during implementation.

## CardManager Changes

Remove the distractor-related UI:
- Distractor chip display
- Add/edit/delete distractor buttons
- Any distractor count indicators

Keep the rest of CardManager intact for editing Japanese/English text of options.

## File Changes

| File | Change |
|------|--------|
| `src/types.ts` | Remove `distractors?` from `TranslatedText` |
| `src/srs.ts` | Remove `pickDistractors` function |
| `src/srs.test.ts` | Remove `pickDistractors` tests |
| `src/components/StudyMode.tsx` | Replace `buildStudyCards`, update `StudyCard` type, change `presentCard` logic, remove empty state about distractors |
| `src/components/CardManager.tsx` | Remove distractor chip UI and related handlers |
| `src/App.tsx` | Remove "Generate Study Distractors" button |
| `server/index.ts` | Remove generate-distractors endpoint, update delete cleanup |
| `db.json` | Strip all `distractors` arrays |
