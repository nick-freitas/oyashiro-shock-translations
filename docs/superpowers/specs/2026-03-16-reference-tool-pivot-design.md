# Reference Tool Pivot — Design Spec

**Date:** 2026-03-16
**Status:** Draft

## Overview

Pivot the application from an SRS study tool to a reference tool. The app retains all screenshot ingestion, translation, editing, and browsing capabilities. All spaced repetition, study mode, and card management features are removed. The codebase is rebranded from "question/quiz" framing to "entry/reference" framing.

## What Changes

### Removals

**Files deleted entirely:**
- `src/components/StudyMode.tsx`
- `src/components/StudyMode.css`
- `src/components/CardManager.tsx`
- `src/components/CardManager.css`
- `src/srs.ts`
- `src/srs.test.ts`
- `study-progress.json`
- `docs/superpowers/specs/2026-03-14-study-mode-design.md`
- `docs/superpowers/specs/2026-03-15-study-mode-v2-design.md`
- `docs/superpowers/specs/2026-03-14-card-manager-design.md`
- `docs/superpowers/plans/2026-03-14-study-mode.md`
- `docs/superpowers/plans/2026-03-14-card-manager.md`
- `docs/superpowers/plans/2026-03-16-study-mode-v2.md`

**Server removals (`server/index.ts`):**
- `STUDY_PROGRESS_PATH` constant
- `CardProgress` and `StudyProgress` interfaces
- `readStudyProgress()` and `writeStudyProgress()` functions
- `GET /study/progress` endpoint
- `PATCH /study/progress` endpoint
- Study-progress cleanup block in `DELETE /questions/:id` (lines 339-362)

**Frontend removals (`src/App.tsx`):**
- `StudyMode` and `CardManager` imports
- React Router imports (`Routes`, `Route`, `Link`)
- `/study` and `/manage` routes
- Sidebar nav links (学習, 管理)

**Frontend removals (`src/main.tsx`):**
- `BrowserRouter` import and wrapper

**Type removals (`src/types.ts`):**
- `CardProgress` interface
- `StudyProgress` interface

**Package removal:**
- `react-router-dom` dependency from `package.json`

### Routing Simplification

React Router is removed entirely. `App.tsx` renders the main view directly — no `BrowserRouter`, no `Routes`, no `Route`. `main.tsx` renders `<App />` without a router wrapper.

### Sidebar Changes

- **Keep:** Title "おやしろさまショック", question count (kanji), action popover (⋮ button)
- **Note:** Subtitle "新・クイズ・ショック" is kept intentionally — it's the franchise title, not a description of the app's function
- **Remove:** Nav links to study/manage (学習, 管理)
- **Add:** A "REFERENCE" label in vertical text using `writing-mode: vertical-rl`, styled like the existing nav links. Placed where nav links were.
- **Change:** Popover button labels from Japanese to English: "画像を処理" → "Process Screenshots", "処理中…" → "Processing...", "振仮名を追加" → "Add Furigana", "振仮名追加中…" → "Adding Furigana..."

### Rebrand — Naming Conventions

| Current | New | Scope |
|---|---|---|
| `Question` (type) | `Entry` | `src/types.ts`, all imports and usages |
| `QuestionData` (server type) | `EntryData` | `server/index.ts` |
| `QuestionList` (component) | `ReferenceList` | Component name, file name, CSS file name |
| `QuestionList.css` | `ReferenceList.css` | File name |
| `QuestionRow` (component) | `EntryRow` | Component name |
| `QuestionRowProps` (interface) | `EntryRowProps` | Interface name |
| `updateQuestion` (local function) | `updateQuestion` | **Keep as-is** — refers to the `question` field on Entry, not the old "Question" concept |
| `QuestionListProps` (interface) | `ReferenceListProps` | Interface name |
| `questions` (state variable in App) | `entries` | `src/App.tsx` |
| `fetchQuestions` (function) | `fetchEntries` | `src/App.tsx` |
| `handleQuestionSaved` | `handleEntrySaved` | `src/App.tsx` |
| `handleQuestionDeleted` | `handleEntryDeleted` | `src/App.tsx` |
| `onQuestionSaved` (prop) | `onEntrySaved` | `ReferenceList` props |
| `onQuestionDeleted` (prop) | `onEntryDeleted` | `ReferenceList` props |
| `DbJson.questions` (server interface field) | `DbJson.entries` | `server/index.ts` |
| `"questions"` key in `db.json` | `"entries"` | `db.json` |

**Structural change:** The current `Editor` function component is promoted to be the default `App` export directly. The outer `App` routing wrapper is removed.

**API route renames** (note: Vite proxy strips `/api` prefix, so server routes use `/entries` while frontend fetches use `/api/entries`):

| Frontend URL | Server Route |
|---|---|
| `/api/entries` | `/entries` |
| `/api/entries/reprocess` | `/entries/reprocess` |
| `/api/entries/add-furigana` | `/entries/add-furigana` |
| `/api/entries/:id` (PATCH) | `/entries/:id` |
| `/api/entries/:id` (DELETE) | `/entries/:id` |

**Domain fields that stay unchanged** (they still accurately describe the content):
- `question` (field on Entry — it's still a question being asked)
- `options` (field on Entry — still answer options)
- `correctOption` (field on Entry — still marking the right answer)
- `filename`, `id` (unchanged semantics)

### Server Changes (`server/index.ts`)

1. Rename `QuestionData` → `EntryData`
2. Rename `DbJson.questions` → `DbJson.entries`
3. Update `readDb()` / `writeDb()` — no structural change, just field rename
4. Rename all route paths from `/questions` → `/entries`
5. Update all internal references from `db.questions` → `db.entries`
6. Remove all study-progress code (constants, types, functions, endpoints, cleanup block)
7. Update `console.log` messages to use "entry" instead of "question"

### Frontend Changes

**`src/types.ts`:**
- Rename `Question` → `Entry`
- Remove `CardProgress`, `StudyProgress`

**`src/main.tsx`:**
- Remove `BrowserRouter` import and wrapper
- Render `<App />` directly in `StrictMode`

**`src/App.tsx`:**
- Remove all React Router imports and usage
- Remove `StudyMode`, `CardManager` imports
- Merge `Editor` function into default `App` export (no separate wrapper)
- Rename state/handlers per rebrand table
- Update all fetch URLs from `/api/questions` → `/api/entries`
- Update sidebar: remove nav links, add "REFERENCE" vertical label
- Change popover button labels to English

**`src/components/QuestionList.tsx` → `src/components/ReferenceList.tsx`:**
- Rename file
- Rename component exports and internal names per rebrand table
- Update all fetch URLs from `/api/questions` → `/api/entries`
- Update type imports from `Question` → `Entry`

**`src/components/QuestionList.css` → `src/components/ReferenceList.css`:**
- Rename file
- CSS class names (`.quiz-row`, `.question-col`, `.question-number`, `.option-item`, etc.) are kept as-is — they refer to domain content (these entries contain quiz questions) and renaming CSS classes provides no user-facing benefit

**`vite.config.ts`:**
- No changes needed — proxy is configured on `/api` generically, not per-route

### Data Migration

**`db.json`:**
- Rename top-level key from `"questions"` to `"entries"`
- Content within entries stays identical

## What Does NOT Change

- Screenshot ingestion/OCR pipeline (same Claude Agent SDK usage)
- Translation display and inline editing
- Correct answer selection (radio buttons)
- Delete functionality (minus study-progress cleanup)
- Furigana support and `parseRuby` utility
- Screenshot display with lazy loading
- Toast notification system
- CSS variables, color scheme, overall visual design
- Popover mechanics (click outside, escape to close)
- Processing mutex
- `KANJI_NUMS` and `OPTION_COUNTERS` arrays
