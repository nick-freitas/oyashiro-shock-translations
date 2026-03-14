# Furigana Support Design Spec

## Overview

Add furigana (kana readings above kanji) to all Japanese text throughout the app — study cards, manage/editor view, and card manager. Furigana is stored as inline markup in the existing `ja` fields using `[漢字]{かな}` syntax, parsed to HTML `<ruby>` elements at render time, and generated via Claude Agent SDK.

## Markup Format

### Syntax

```
[漢字]{かな}
```

Example:
```
[店内]{てんない}に[響]{ひび}いたのは[何]{なに}コール？
```

### Storage

Furigana markup lives directly in the `ja` string fields of `db.json`. No new fields or types are added. The `TranslatedText` interface is unchanged:

```typescript
interface TranslatedText {
  ja: string;    // May contain [漢字]{かな} markup
  en: string;
  distractors?: string[];
}
```

### Backwards Compatibility

Text without any `[]{}`markup renders identically to today. The parser treats unmarkup'd text as plain text. This means existing data works fine before migration, and the migration can be run incrementally.

## Parsing: `parseRuby()`

A new utility at `src/utils/parseRuby.tsx` exports a function:

```typescript
function parseRuby(text: string): ReactNode
```

**Behavior:**
- Matches `[漢字]{かな}` patterns via regex
- Converts each match to: `<ruby>漢字<rp>(</rp><rt>かな</rt><rp>)</rp></ruby>`
- Plain text between matches passes through as text nodes
- Text with no markup returns a plain string (no unnecessary wrapping)
- `<rp>` tags provide `(かな)` fallback for browsers without ruby support

## Rendering

Furigana is always shown — no toggle.

### Study Mode (`StudyMode.tsx`)

- Question text (`currentCard.ja`) rendered via `parseRuby()` instead of plain `{currentCard.ja}`
- CSS updates in `StudyMode.css`:
  - Increase `line-height` on `.study-japanese` to accommodate ruby text above
  - Style `rt` elements: smaller font size, subtler color than the base kanji

### Editor / QuestionList (`QuestionList.tsx`)

The current QuestionList is a fully inline editor — all `ja` fields are always rendered as `<textarea>` elements (via `AutoTextarea`). There is no display/edit mode toggle.

To support furigana:
- **Textareas** continue to show raw `[漢字]{かな}` markup (this is what the user edits)
- **Live preview**: A preview element below each Japanese textarea (`question.ja` and each `option.ja`) renders `parseRuby()` output in real-time as the user types, so they can verify the furigana looks correct
- CSS updates in `QuestionList.css`: Styles for ruby text in preview areas, including appropriate `line-height` for ruby annotation

### Card Manager (`CardManager.tsx`)

The CardManager uses the same always-editable pattern as QuestionList — the `ja` field is an `<input>` element inside the accordion row.

To support furigana:
- **Inputs** continue to show raw `[漢字]{かな}` markup
- **Live preview**: A preview element below the `ja` input renders `parseRuby()` output, matching the QuestionList approach

### English text

Unchanged everywhere. Only `ja` fields use furigana markup.

## Furigana Generation

Both generation paths use Claude Agent SDK (already integrated in the project).

### New Screenshots: Modified OCR Prompt

The existing `POST /questions/reprocess` endpoint's Claude prompt is updated to instruct the model to output `ja` fields with `[漢字]{かな}` markup applied. The prompt addition:

> "For all Japanese text fields (question and options), annotate kanji with furigana using `[漢字]{かな}` syntax. Only annotate kanji characters, not katakana or hiragana. Example: `[店内]{てんない}に[響]{ひび}いた`"

This applies to all `ja` fields in the returned JSON — both `question.ja` and each `options[].ja`. Same endpoint, same flow, same response format — just richer `ja` output.

### Bulk Migration: New Endpoint `POST /questions/add-furigana`

Iterates through all questions in `db.json` and adds furigana markup to `ja` fields that don't already have it.

**UI trigger:** A new "Add Furigana" button is added to the existing popover menu in `App.tsx` (alongside "Process Screenshots" and "Generate Distractors"). It calls this endpoint and shows a toast with the results. An `addingFurigana` state variable disables the button during processing, matching the existing `reprocessing`/`generating` pattern.

**Concurrency:** The endpoint uses the existing `processing` mutex (shared with `/questions/reprocess` and `/questions/generate-distractors`) to prevent concurrent modifications to `db.json`. Returns 409 if another operation is in progress.

**Flow:**
1. Read all questions from `db.json`
2. For each question, collect the `ja` text from the question and all 4 options (5 fields per question)
3. Skip fields that already contain `[` followed by `]{` followed by `}` (already annotated). If all 5 fields in a question are already annotated, skip the entire question.
4. Send the unannotated fields to Claude in a single call per question
5. Write results back to `db.json` incrementally after each question

**Skip logic:** A field is considered already annotated if it matches the regex `/\[.+?\]\{.+?\}/`. If a field matches the regex, it is skipped — even if only partially annotated. This keeps the logic simple and avoids re-processing fields that may have been manually corrected. To force re-annotation of a field, the user can remove the existing markup first.

**Prompt and response format:** The prompt sends a JSON object with numbered keys for each unannotated field, and asks Claude to return a JSON object with the same keys:

```
Input:  {"1": "店内に響いたのは何コール？", "2": "可愛い", "3": "プリキー！"}
Output: {"1": "[店内]{てんない}に[響]{ひび}いたのは[何]{なに}コール？", "2": "[可愛]{かわい}い", "3": "プリキー！"}
```

This makes it unambiguous which response maps to which field. If Claude returns malformed JSON, the entire question is skipped and counted as failed.

**Response format:** `{ annotated: number, skipped: number, failed: number, total: number }` — consistent with the existing `/questions/generate-distractors` endpoint pattern.

**Idempotent:** Running the endpoint multiple times is safe — already-annotated fields are skipped.

## Files Changed

| File | Change |
|------|--------|
| `src/utils/parseRuby.tsx` | **New** — `parseRuby()` utility function |
| `src/components/StudyMode.tsx` | Use `parseRuby()` for question text |
| `src/components/StudyMode.css` | Line-height and `rt` styling for ruby text |
| `src/components/QuestionList.tsx` | Add live furigana preview below each `ja` textarea |
| `src/App.tsx` | Add "Add Furigana" button to popover menu |
| `src/components/QuestionList.css` | Ruby text and preview area styles |
| `src/components/CardManager.tsx` | Use `parseRuby()` for display text |
| `server/index.ts` | Updated OCR prompt; new `POST /questions/add-furigana` endpoint |

## Files Unchanged

| File | Reason |
|------|--------|
| `src/types.ts` | No new fields — furigana lives inside existing `ja` strings |
| `src/srs.ts` | No text rendering logic |
| `study-progress.json` | Card IDs unchanged |
| `db.json` schema | Same structure, `ja` values gain markup |
