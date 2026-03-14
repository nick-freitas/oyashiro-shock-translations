# Study Card Management Page — Design Spec

## Overview

A new `/manage` route that displays a flat list of all study cards (one per question option) in an accordion layout. Each row shows the card's stem (Japanese) and answer (English) inline-editable, with an expandable panel revealing the distractor pool for full CRUD. Auto-saves on blur.

## Route & Navigation

- New route: `/manage`
- Sits alongside `/` (editor) and `/study` (study mode) via React Router
- Navigation link added to the existing page header in `App.tsx` (same style as the existing "Study" link)
- Uses the same app shell layout as the main page

## Page Structure

### Right Sidebar

Matches the existing app sidebar pattern:

- Fixed right sidebar, same width/background/border as the main page (`--bg-sidebar`, `--sidebar-width`)
- Vertical `管理` title in large weight-900 Zen Old Mincho, vertically oriented (`writing-mode: vertical-rl`)
- Card count at the bottom (e.g., "96")
- No top header bar — the sidebar replaces it

### Main Content Area

Scrollable flat list of accordion rows with no header above.

### Card List

- All options from all questions rendered as accordion rows
- Ordered by question ID then option index: q1-o0, q1-o1, q1-o2, q1-o3, q2-o0, ...
- Subtle indigo gradient divider line between each group of 4 cards (question boundary)
- Alternating row backgrounds (`--bg` / `--bg-row-alt`), hover highlight (`--bg-row-hover`)

## Accordion Row (Collapsed)

4-column CSS grid: `72px 1fr 1fr 48px`

| Column | Content |
|--------|---------|
| Card ID | `q1-o0` style label in Cormorant, gold accent, with green dot if correct answer |
| Stem | Japanese text in Zen Old Mincho, 21px, inline-editable |
| Answer | English text in Cormorant italic, 17px, inline-editable |
| Chevron | Dropdown arrow, rotates 180° when open, indigo when expanded |

### Hover behavior

- Row background transitions to `--bg-row-hover`
- Gold 2px left border accent appears
- Card ID opacity increases from 0.5 to 1

### Open state

- Left border switches from gold to `--accent-indigo-light`
- Chevron rotates and turns indigo
- Panel slides open below with CSS `max-height` transition

## Accordion Panel (Expanded)

Appears below the row when expanded. Contains the distractor chip area.

### Layout

- Indented to align with the stem column (`padding-left: 132px`)
- "Distractors (N)" label with trailing gradient line
- Flex-wrap row of distractor chips

## Inline Editing

### Stem & Answer fields

- Same `inline-input` pattern as the existing QuestionList editor
- Transparent background, border appears on hover (`--border-row`), indigo highlight on focus (`--accent-indigo-light`)
- Auto-save on blur via `PATCH /api/questions/:questionId`
- Gold border flash on successful save, then fades back

### No save button

All edits auto-save on blur.

## Distractor CRUD

### Display

Chips in a wrapping flex row. Each chip:

- Styled with indigo-tinted background, subtle border, Cormorant font
- Delete `×` button hidden by default, visible on chip hover
- Chip text is click-to-edit

### Edit

- Click chip text to enter edit mode (swap to input or contenteditable)
- On blur, auto-saves the updated distractors array via PATCH

### Delete

- Click `×` to remove the distractor from the array
- Auto-saves immediately via PATCH

### Add

- `+` button at the end of the chip row (dashed border, indigo accent)
- Click to append a new empty chip in edit mode
- Type text, blur to save

### Save mechanism

All distractor changes go through `PATCH /api/questions/:questionId`, sending the full updated `distractors` array for that option.

### No minimum enforcement

Study mode already handles cards with fewer than 3 distractors gracefully (excludes them). The management page does not enforce a minimum — the user may be mid-edit.

## Data Flow & API

### Fetch

- On mount: `GET /api/questions`
- Flatten into card list: `[{questionId, optionIndex, ja, en, distractors, isCorrect}, ...]`

### Save

- Stem/answer edits: `PATCH /api/questions/:questionId` with updated option text
- Distractor edits: same endpoint, send full updated `distractors` array for that option

### No new endpoints

The existing API covers all needed operations.

## Component Structure

| File | Purpose |
|------|---------|
| `src/components/CardManager.tsx` | New component — accordion list with inline editing and distractor CRUD |
| `src/components/CardManager.css` | Styles matching app design system |
| `src/App.tsx` | Add `/manage` route and navigation link |

## Visual Design

All styling uses the existing CSS custom properties and design patterns:

- Fonts: `--font-ja` (Zen Old Mincho) for stems, `--font-en` (Cormorant) for answers/labels/chips
- Colors: `--accent-gold` for IDs/accents, `--accent-indigo` for interactive states, `--text-ja`/`--text-en` for content
- Grain overlay, subtle animations (row fade-in on load, chevron rotation, panel slide)
- Responsive: single-column layout on narrow screens
