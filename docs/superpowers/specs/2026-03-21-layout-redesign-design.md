# Layout Redesign: Text Order, Entry Grid, and Section Tabs

## Overview

Redesign the entry row layout, flip bilingual text ordering (English first/larger, Japanese second/smaller), always show incorrect answers, and replace the level selector buttons with a new vertical tab sidebar.

## Approach

Minimal restructure (Approach A): modify existing components and CSS in-place, add one new `SectionTabs` component. No new abstractions or layout wrappers.

## Changes

### 1. Text Order & Sizing

Every bilingual text pair flips to English first (larger) and Japanese second (smaller).

**Questions:**
- English: ~39px, `--font-en`, primary weight (currently this is the JP size)
- Japanese: ~30px, `--font-ja`, lighter (currently this is the EN size)

**Answers (correct and incorrect):**
- English: ~33px (currently `option-ja` size)
- Japanese: ~27px (currently `option-en` size)

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

**Files modified:**
- `src/components/ReferenceList.tsx` — reorder JSX: question-col moves to col 1 row 1, screenshot-col to col 2 row 1, correct answer to col 1 row 2, wrong answers to col 2 row 2. Within each text block, render English first then Japanese.
- `src/components/ReferenceList.css` — update grid-template-columns, grid assignments, font sizes.

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

**Files created:**
- `src/components/SectionTabs.tsx` — stateless component, receives `levels`, `selectedLevel`, `onSelectLevel` props
- `src/components/SectionTabs.css` — tab styling

**Files modified:**
- `src/App.tsx` — import and render `SectionTabs` between main content and title sidebar; remove level selector `<nav>` from the `<aside>`
- `src/App.css` — remove `.level-selector` and `.level-btn` rules; add layout for the three-column arrangement (main content + tabs + title sidebar)

### 5. Existing Sidebar

The title sidebar (`<aside class="title-sidebar">`) loses its level buttons but otherwise stays the same: vertical title text, subtitle, entry count.

### 6. Responsive Behavior

Existing breakpoints (1100px, 860px, 500px) are preserved with adjustments:
- At 860px: entry grid stacks to single column; section tabs may collapse to a narrower strip or hide numbers (keep just the accent bar)
- At 500px: further size reduction as currently implemented
- Section tabs sidebar follows the same responsive narrowing as the title sidebar

## Files Summary

| File | Action |
|------|--------|
| `src/components/ReferenceList.tsx` | Modify — reorder grid, flip text, remove toggle |
| `src/components/ReferenceList.css` | Modify — new grid layout, flip font sizes, remove toggle CSS |
| `src/components/SectionTabs.tsx` | Create — new tab component |
| `src/components/SectionTabs.css` | Create — tab styling |
| `src/App.tsx` | Modify — add SectionTabs, remove level nav from sidebar |
| `src/App.css` | Modify — three-column layout, remove level-btn CSS |
