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

- **Display mode** (not editing): Question and option `ja` text rendered via `parseRuby()` — furigana appears above kanji
- **Edit mode** (textarea focused): Shows raw `[漢字]{かな}` markup in the textarea
- **Live preview**: A preview element below each Japanese textarea renders `parseRuby()` output in real-time as the user types, so they can verify markup correctness
- CSS updates in `QuestionList.css`: Styles for ruby text and the preview area

### Card Manager (`CardManager.tsx`)

- Display text for card `ja` fields rendered via `parseRuby()`
- Editable inputs continue to show raw markup

### English text

Unchanged everywhere. Only `ja` fields use furigana markup.

## Furigana Generation

Both generation paths use Claude Agent SDK (already integrated in the project).

### New Screenshots: Modified OCR Prompt

The existing `POST /questions/reprocess` endpoint's Claude prompt is updated to instruct the model to output `ja` fields with `[漢字]{かな}` markup applied. The prompt addition:

> "For all Japanese text fields (question and options), annotate kanji with furigana using `[漢字]{かな}` syntax. Only annotate kanji characters, not katakana or hiragana. Example: `[店内]{てんない}に[響]{ひび}いた`"

Same endpoint, same flow, same response format — just richer `ja` output.

### Bulk Migration: New Endpoint `POST /questions/add-furigana`

Iterates through all questions in `db.json` and adds furigana markup to `ja` fields that don't already have it.

**Flow:**
1. Read all questions from `db.json`
2. For each question, collect the `ja` text from the question and all 4 options (5 fields per question)
3. Skip fields that already contain `[` followed by `]{` followed by `}` (already annotated)
4. Send the unannotated fields to Claude in a single call per question, asking it to add `[漢字]{かな}` markup
5. Write results back to `db.json` incrementally after each question

**Skip logic:** A field is considered already annotated if it matches the regex `/\[.+?\]\{.+?\}/`.

**Prompt:**
> "Add furigana readings to the following Japanese text using `[漢字]{かな}` syntax. Only annotate kanji characters — leave katakana, hiragana, and punctuation as-is. Return the annotated text only, preserving the exact original text except for the added markup."

**Batching:** All 5 `ja` fields per question are sent in one Claude call to reduce API round-trips (~100 calls total for the full database).

**Idempotent:** Running the endpoint multiple times is safe — already-annotated fields are skipped.

## Files Changed

| File | Change |
|------|--------|
| `src/utils/parseRuby.tsx` | **New** — `parseRuby()` utility function |
| `src/components/StudyMode.tsx` | Use `parseRuby()` for question text |
| `src/components/StudyMode.css` | Line-height and `rt` styling for ruby text |
| `src/components/QuestionList.tsx` | Display mode: `parseRuby()`. Edit mode: raw markup + live preview |
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
