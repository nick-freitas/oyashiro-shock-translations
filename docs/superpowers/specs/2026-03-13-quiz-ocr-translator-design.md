# Quiz OCR + Translator Design

## Overview

A tool for processing screenshots from the Higurashi quiz game "Quiz: Shin Oyashiro Shock!" — extracting Japanese text via Claude's vision capabilities and translating it to English. Results are displayed in an editable React web app.

## Goals

- Process 24 quiz screenshots to extract Japanese questions and 4 answer options each
- Translate all extracted text to English
- Display screenshots alongside transcriptions and translations in a web app
- Allow manual editing and saving of transcriptions/translations

## Non-Goals

- Tracking correct/incorrect answers
- Real-time or on-the-fly OCR processing
- Authentication or multi-user support

## Architecture

### Project Structure

```
oyashirosamashock/
├── screenshots/                # Source images (already exists)
├── scripts/
│   └── process-screenshots.ts  # Agent SDK script — runs once to OCR + translate
├── src/                        # Vite + React app
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── QuestionList.tsx    # Grid/list of all questions
│   │   └── QuestionCard.tsx    # Single question: image + JP text + EN text, editable
│   └── types.ts                # Shared types
├── public/
│   └── screenshots/            # Copy of screenshots served by Vite
├── db.json                     # json-server data file (processing output + edits)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Components

1. **Processing Script** (`scripts/process-screenshots.ts`)
2. **React App** (Vite + React)
3. **Data Store** (json-server + `db.json`)

## Data Model

Each question in `db.json`:

```json
{
  "questions": [
    {
      "id": 1,
      "filename": "Screenshot 2026-03-13 at 7.53.39 PM.png",
      "question": {
        "ja": "デザートフェスタ、店内に響いたのは何コール？",
        "en": "At the dessert festival, what call echoed through the store?"
      },
      "options": [
        { "ja": "フキフキ！", "en": "Fuki fuki!" },
        { "ja": "プリキー！", "en": "Purikii!" },
        { "ja": "ヌギヌギ", "en": "Nugi nugi" },
        { "ja": "ブギウギ！", "en": "Boogie woogie!" }
      ]
    }
  ]
}
```

Fields:
- `id`: Sequential integer (json-server uses this for REST operations)
- `filename`: Links back to the source screenshot in `public/screenshots/`
- `question.ja`: Japanese question text extracted via OCR
- `question.en`: English translation of the question
- `options`: Array of exactly 4 items, each with `ja` (Japanese) and `en` (English)

## Processing Script

### Technology

- `@anthropic-ai/claude-agent-sdk` (TypeScript)

### Behavior

1. Uses `Glob` tool to discover all `.png` files in `screenshots/`
2. For each screenshot, the agent:
   - Reads the image file using the built-in `Read` tool
   - Extracts the question text and 4 options in Japanese
   - Translates each to English
   - Returns structured JSON
3. The script collects all results and writes `db.json`

### Agent Configuration

- `allowedTools`: `["Read", "Glob"]`
- `permissionMode`: `"acceptEdits"`
- System prompt: Instructs the agent to act as a Japanese OCR + translation specialist
- Structured output enforces consistent JSON shape

## React App

### Tech Stack

- Vite + React (TypeScript)
- Plain CSS / CSS modules for styling
- `fetch` for API calls to json-server
- json-server on port 3001, Vite dev server on 5173 with proxy

### Views

#### QuestionList (main view)

- Scrollable list/grid of all questions
- Each item shows: screenshot thumbnail, Japanese question text, English translation
- Click to expand/focus a question

#### QuestionCard (detail/edit view)

- Full screenshot image
- Question displayed in Japanese and English — both editable text inputs
- All 4 options displayed with Japanese and English — all editable
- "Save" button that PATCHes edited data to json-server (`PATCH /questions/:id`)
- Visual indicator when a field has been edited

### Data Flow

```
db.json <--json-server--> React App
                            |
                   GET /questions (load all)
                   PATCH /questions/:id (save edits)
```

## Running the Project

1. `npm run process` — Run the processing script to generate `db.json`
2. Copy screenshots to `public/screenshots/`
3. `npm run dev` — Start Vite dev server + json-server concurrently
