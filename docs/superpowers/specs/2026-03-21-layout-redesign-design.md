# Layout Redesign: Text Order, Entry Grid, and Section Tabs

## Overview

Redesign the entry row layout, flip bilingual text ordering (English first/larger, Japanese second/smaller), always show incorrect answers, and replace the level selector buttons with a new vertical tab sidebar.

## Approach

Minimal restructure (Approach A): modify existing components and CSS in-place, add one new `SectionTabs` component. No new abstractions or layout wrappers.

## Changes

### 1. Text Order & Sizing

Every bilingual text pair flips to English first (larger) and Japanese second (smaller).

Only font-size and render order change. Font-family assignments stay matched to language (`--font-en` for English, `--font-ja` for Japanese).

**Questions:**
- English: ~39px, rendered first (swapping size with JP, which was 39px)
- Japanese: ~30px, rendered second (swapping size with EN, which was 30px)

**Answers (correct and incorrect):**
- English: ~33px, rendered first (swapping size with JP, which was 33px)
- Japanese: ~27px, rendered second (swapping size with EN, which was 27px)

Color scheme unchanged: JP uses `--text-ja`, EN uses `--text-en`.

### 2. Entry Row Layout

Replace the current grid (screenshot left + question below, options right) with a two-column layout:

```
+---------------------------+---------------------------+
|  Question Text            |  Screenshot               |
|  (EN large above,         |  (image)                  |
|   JP small below)         |                           |
+---------------------------+---------------------------+
|  Correct Answer           |  Incorrect Answers        |
|  (green tint, EN + JP)    |  (all visible, no toggle) |
+---------------------------+---------------------------+
```

**Grid definition:**
- `grid-template-columns: 1fr 1fr`
- `grid-template-rows: auto auto`
- Col 1, Row 1: question number + question text
- Col 2, Row 1: screenshot image
- Col 1, Row 2: correct answer (keeps green tint styling)
- Col 2, Row 2: all incorrect answers

**Structural change:** The current `options-col` wrapper div is dissolved. The correct answer and wrong answers become separate top-level grid children within `.quiz-row`, each assigned to their own grid cell. The `options-col` class and its `border-left` divider are removed. A subtler separator (e.g., a top border on row 2 cells, or spacing) may replace the column divider if needed visually.

**Row actions (important star button):** Stays `position: absolute; top: 12px; right: 12px` relative to `.quiz-row`. It will now overlap the screenshot corner — this is acceptable.

**Files modified:**
- `src/components/ReferenceList.tsx` — dissolve `options-col` into separate `correct-answer` and `wrong-answers` divs as direct children of `quiz-row`. Reorder JSX: question-col to col 1 row 1, screenshot-col to col 2 row 1, correct-answer to col 1 row 2, wrong-answers to col 2 row 2. Within each text block, render English first then Japanese.
- `src/components/ReferenceList.css` — update grid-template-columns, grid assignments, font sizes. Remove `.options-col` class and its overrides in the 860px and 500px media query blocks. Add grid placement for `.correct-answer` and `.wrong-answers`, including responsive rules for those new classes at existing breakpoints.

### 3. Remove Toggle

- Delete the `expanded` state and `setExpanded` from `EntryRow`
- Delete the "Show options" / "Hide options" button
- Always render all `wrongAnswersJp`/`wrongAnswersEn` entries
- Delete `.options-toggle` CSS rules

### 4. Section Tabs Sidebar

New component `SectionTabs` replaces the level selector buttons in the existing sidebar.

**Placement:** Between main content and the existing title sidebar:

```
+------------------+------+----------+
|                  |  0   |          |
|                  |  1   | title    |
|   Main Content   | [2]  | sidebar  |
|   (scrollable)   |  3   |          |
|                  |  4   |          |
|                  | ...  | count    |
|                  |  8   |          |
+------------------+------+----------+
```

**Behavior:**
- Tabs 0-8, stacked vertically
- Selected tab: gold accent bar (`--accent-gold-bright`, ~3px wide) on the left edge of the number
- Unselected tabs: no bar, plain text in `--text-en-sub`
- Clicking a tab sets the selected level
- Sticky positioning, full viewport height, narrow width (~40-50px)
- Dark background matching `--bg-sidebar`

**Props interface:**
```typescript
interface SectionTabsProps {
  levels: number[];
  selectedLevel: number;
  onSelectLevel: (level: number) => void;
}
```

**Files created:**
- `src/components/SectionTabs.tsx` — stateless component with the above interface; imports `SectionTabs.css`
- `src/components/SectionTabs.css` — tab styling

**Files modified:**
- `src/App.tsx` — import and render `SectionTabs` between main content and title sidebar; remove level selector `<nav>` from the `<aside>`
- `src/App.css` — remove `.level-selector` and `.level-btn` rules; add layout for the three-column arrangement (main content + tabs + title sidebar)

### 5. Existing Sidebar

The title sidebar (`<aside class="title-sidebar">`) loses its level buttons but otherwise stays the same: vertical title text, subtitle, entry count.

### 6. Responsive Behavior

Existing breakpoints (1100px, 860px, 500px) are preserved with adjustments:
- At 860px: entry grid stacks to single column. Section tabs sidebar stays visible at the same width (~40-50px) — the numbers are small enough to fit.
- At 500px: further size reduction as currently implemented. Section tabs narrows slightly but remains visible.
- The section tabs sidebar does not collapse or hide at any breakpoint — it's the primary navigation.

## Files Summary

| File | Action |
|------|--------|
| `src/components/ReferenceList.tsx` | Modify — reorder grid, flip text, remove toggle |
| `src/components/ReferenceList.css` | Modify — new grid layout, flip font sizes, remove toggle CSS |
| `src/components/SectionTabs.tsx` | Create — new tab component |
| `src/components/SectionTabs.css` | Create — tab styling |
| `src/App.tsx` | Modify — add SectionTabs, remove level nav from sidebar |
| `src/App.css` | Modify — three-column layout, remove level-btn CSS |
