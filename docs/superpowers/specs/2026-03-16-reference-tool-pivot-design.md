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
- `study-progress.json`
- `docs/superpowers/specs/2026-03-14-study-mode-design.md`
- `docs/superpowers/specs/2026-03-15-study-mode-v2-design.md`

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

- **Keep:** Title "おやしろさまショック", subtitle "新・クイズ・ショック", question count (kanji), action popover (⋮ button)
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
| `QuestionListProps` (interface) | `ReferenceListProps` | Interface name |
| `questions` (state variable in App) | `entries` | `src/App.tsx` |
| `fetchQuestions` (function) | `fetchEntries` | `src/App.tsx` |
| `handleQuestionSaved` | `handleEntrySaved` | `src/App.tsx` |
| `handleQuestionDeleted` | `handleEntryDeleted` | `src/App.tsx` |
| `onQuestionSaved` (prop) | `onEntrySaved` | `ReferenceList` props |
| `onQuestionDeleted` (prop) | `onEntryDeleted` | `ReferenceList` props |
| `Editor` (function component) | `App` (becomes the default export directly) | `src/App.tsx` |
| `DbJson.questions` (server interface field) | `DbJson.entries` | `server/index.ts` |
| `"questions"` key in `db.json` | `"entries"` | `db.json` |
| `/api/questions` | `/api/entries` | All server routes and frontend fetch calls |
| `/api/questions/reprocess` | `/api/entries/reprocess` | Server route and frontend |
| `/api/questions/add-furigana` | `/api/entries/add-furigana` | Server route and frontend |
| `/api/questions/:id` (PATCH) | `/api/entries/:id` | Server route and frontend |
| `/api/questions/:id` (DELETE) | `/api/entries/:id` | Server route and frontend |

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
- No CSS class name changes needed (they use semantic names like `.quiz-row`, `.option-item` which still make sense)

**`vite.config.ts`:**
- Update proxy path if it references `/api/questions` specifically (needs verification — likely proxies all `/api` so no change needed)

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
