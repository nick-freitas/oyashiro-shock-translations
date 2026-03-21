# JSON Import & Static App Design

## Overview

Replace the OCR-based screenshot pipeline with a pre-extracted JSON data source (`oyashiro_shock_quiz.json`, 490 entries across 9 levels). Remove the Express server entirely and convert the app to a static Vite build. Add level-based browsing and an "important" mark feature.

## Data Layer

### Source Format

Each entry in `oyashiro_shock_quiz.json`:

```json
{
  "level": 1,
  "questionNumber": 1,
  "vtId": "VT_QL1_1001",
  "qlvId": "qlv1_01",
  "correctAnswerJp": "5個",
  "correctAnswerEn": "5 pieces",
  "wrongAnswersJp": ["4個", "3個", "12個"],
  "wrongAnswersEn": ["4 pieces", "3 pieces", "12 pieces"],
  "questionImage": "quiz_images/qlv1_01.png",
  "questionJp": "レナと魅音が持ってきてくれたおはぎは何個？",
  "questionEn": "How many ohagi did Rena and Mion bring over?"
}
```

### App Entry Type

```ts
interface Entry {
  id: string;            // generated: "{qlvId}_{index}" to guarantee uniqueness
                         // (qlvId alone is not unique — level 0 has 10 entries sharing qlv0_01)
  level: number;         // 0-8
  questionJp: string;    // plain Japanese, no furigana
  questionEn: string;
  correctAnswerJp: string;
  correctAnswerEn: string;
  wrongAnswersJp: string[];  // 3 items
  wrongAnswersEn: string[];  // 3 items
  questionImage: string;     // path in public/quiz_images/
}
```

Source fields `vtId` and `questionNumber` are intentionally dropped — they are internal game IDs not needed for reference browsing.

### Import

A one-time `scripts/import-quiz.ts` script:

1. Reads `oyashiro_shock_quiz.json` from the HigurashiENX repo
2. Maps each source entry to the app `Entry` type
3. Writes `src/data/entries.ts` as a typed, exported array
4. Copies `quiz_images/` directory into `public/quiz_images/`

### Important Marks

Stored in `localStorage` under key `oyashiro-important` as a JSON array of entry IDs. Accessed via a `useImportantMarks` hook that returns the set and a toggle function.

## UI

### Layout

Same sidebar + main content layout as current app.

### Sidebar

- **Level selector**: Levels 0-8 as clickable items. Active level highlighted. Default selection: level 1 (level 0 is a tutorial level with meta-questions).
- **Title block**: 新・クイズ・ショック / おやしろさまショック (unchanged)
- **Entry count**: Updates to reflect the selected level's entry count

### Main Content

Shows entries for the selected level only. Each entry row displays:

- Question image (from `public/quiz_images/`)
- Japanese question text (plain text, no furigana rendering)
- English question text
- Correct answer (JP + EN), visually distinct
- 3 wrong answers behind a "Show options" expand toggle
- An "important" toggle icon that persists to localStorage

The important marks are visual-only indicators in this iteration — no filter to show only important entries. Filtering can be added later if needed.

### Removed UI

- All inline editing (textareas, save/delete buttons)
- "Process Screenshots" and "Add Furigana" popover actions
- Old screenshot images

## File Changes

### Remove

- `server/index.ts` — entire Express server
- `db.json` — replaced by static import
- `public/screenshots/` — replaced by `public/quiz_images/`
- `screenshots/` — no longer needed
- `src/utils/parseRuby.tsx` — furigana dropped
- `src/utils/parseRuby.test.tsx` — furigana test dropped
- Dependencies: `@anthropic-ai/claude-agent-sdk`, `express`, `@types/express`, `concurrently`

### Add

- `scripts/import-quiz.ts` — one-time import script
- `src/data/entries.ts` — generated typed data file
- `public/quiz_images/` — copied image files
- `src/hooks/useImportantMarks.ts` — localStorage hook

### Modify

- `src/types.ts` — new Entry type
- `src/App.tsx` — level selector state, static data import, remove fetch/server logic
- `src/components/ReferenceList.tsx` — read-only rendering, important toggle, remove editing UI
- `vite.config.ts` — remove proxy config and `serve-prototypes` plugin (plus unused `fs`/`path` imports)
- `package.json` — remove server deps and scripts, simplify dev script to just `vite`
