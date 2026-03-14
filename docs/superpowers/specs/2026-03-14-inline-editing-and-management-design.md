# Inline Editing, Question Management & Server Consolidation

## Overview

Add inline editing, correct answer marking, question deletion, screenshot reprocessing, and consolidate json-server into a single Express backend. This is a dev-only tool — no production deployment considerations.

## Schema Change

Add `correctOption` field to `Question`:

```typescript
export interface Question {
  id: number;
  filename: string;
  question: TranslatedText;
  options: [TranslatedText, TranslatedText, TranslatedText, TranslatedText];
  correctOption?: number; // 0-3 index, undefined if not yet selected
}
```

## Feature 1: Inline Editing

The question list becomes directly editable — no separate view or navigation.

- Each question row displays text in `<input>` fields instead of plain text
- Japanese and English inputs for the question and all 4 options
- Modified fields get a visual indicator (highlight)
- Per-row Save button appears when changes are detected
- Save PATCHes the question to the Express API (text edits and correctOption are saved together in a single PATCH)
- Remove the unused `QuestionCard` component

## Feature 2: Correct Answer Selection

- Each option has a clickable radio button or indicator to mark it as correct
- Only one option can be correct per question
- The correct option is visually color-coded (green background/border)
- Stored as `correctOption` (0-3) on the question record
- Correct answer changes are bundled into the same per-row Save action as text edits
- Unselected state (no correct answer yet) is valid

## Feature 3: Delete Question

- Each question row has a delete button
- Confirmation prompt before deletion
- On confirm: DELETE request to Express API
- Server-side: removes the entry from `db.json`, deletes the screenshot from both `screenshots/` and `public/screenshots/`
- Row disappears from UI after successful deletion
- Dynamic question count in the header updates after deletion

## Feature 4: Reprocess Screenshots

- Button in the page header (e.g., "Process New Screenshots")
- Hits a POST endpoint on the Express server
- Server-side logic (extracted from `scripts/process-screenshots.ts`):
  - Reads all PNGs from `screenshots/`
  - Compares against filenames in `db.json`
  - Processes new files with Claude Agent SDK (OCR + translate)
  - Copies new screenshots to `public/screenshots/` via `fs.copyFileSync`
  - Appends new entries to `db.json`
- Server rejects concurrent reprocess requests with 409 (in-progress flag)
- UI shows loading/spinner state while processing
- On completion, refreshes the question list to show new entries
- Reports count of new questions processed (or "no new screenshots found")

## Feature 5: Express Server Consolidation

Replace `json-server` with a single Express server on port 3001.

### Endpoints

Register static routes before parameterized routes to avoid Express matching conflicts.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/questions` | Return all questions from db.json |
| POST | `/questions/reprocess` | Process new screenshots (register before `:id` routes) |
| PATCH | `/questions/:id` | Update a question (text edits, correctOption) |
| DELETE | `/questions/:id` | Delete question + screenshot files |

### Implementation

- New file: `server/index.ts`
- Run with `tsx server/index.ts` (consistent with existing `process` script)
- Reads/writes `db.json` directly (same as json-server did)
- Static file serving NOT needed (Vite handles that in dev)
- Vite proxy config stays the same (`/api` → port 3001)
- `npm run dev` updated: `concurrently "tsx server/index.ts" "vite"`
- `json-server` dependency removed from package.json
- Add `express` and `@types/express` to devDependencies

## Files to Create/Modify

- **Create** `server/index.ts` — Express server with all endpoints, reprocess logic extracted from process-screenshots.ts
- **Modify** `src/types.ts` — add `correctOption` field
- **Modify** `src/components/QuestionList.tsx` — inline editing, correct answer selection, delete button
- **Modify** `src/components/QuestionList.css` — styles for editable fields, correct answer highlight, delete button
- **Modify** `src/App.tsx` — add reprocess button in header, dynamic question count, refresh logic
- **Modify** `src/App.css` — reprocess button styles
- **Modify** `package.json` — add express + @types/express, update dev script, remove json-server
- **Modify** `tsconfig.json` — exclude `server/` from frontend build (server runs via tsx, not tsc)
- **Delete** `src/components/QuestionCard.tsx` — no longer needed
- **Delete** `src/components/QuestionCard.css` — no longer needed
- **Delete** `scripts/process-screenshots.ts` — logic moved to server/index.ts
