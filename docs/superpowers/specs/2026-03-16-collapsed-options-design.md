# Collapsed Options — Design Spec

**Date:** 2026-03-16
**Status:** Draft

## Overview

Change the options display in `EntryRow` so that only the correct answer is shown prominently. The other 3 options are hidden behind an expand/collapse toggle. This makes the correct answer the focal point of each entry in the reference view.

## Changes

### Remove option numbering

Remove the `OPTION_COUNTERS` array (`["一", "二", "三", "四"]`) and the `<button className="correct-toggle">` elements that display them. Options no longer have numbered labels.

### Correct answer display

- The correct answer option is rendered first, with the existing `.correct` green container shading applied to the whole option item
- It displays the Japanese text (with furigana) and English translation, same as today but without the number button

### Expand/collapse toggle

- Below the correct answer, a toggle button shows "Show options" when collapsed and "Hide options" when expanded
- The button is styled subtly (small text, muted color) — not a primary action
- When expanded, the remaining 3 options appear below the toggle
- Default state: collapsed

### Clicking an alternate option

- When expanded, clicking any alternate option calls `setCorrectOption(originalIndex)` where `originalIndex` is the option's position in the `options` array (0-3), not its display position
- This persists the new correct answer to the server (existing behavior)
- The newly correct option moves to the prominent top position
- The previously correct option moves into the hidden group
- The options **stay expanded** after a swap

### No correct answer set

- If `correctOption` is undefined (no answer selected yet), all 4 options are shown without collapse — the user needs to see all options to pick one
- Once a correct answer is selected, the collapse behavior activates

### State

- `expanded` boolean state added to `EntryRow`, default `false`
- Reset to `false` is not needed on answer swap (stays expanded per requirement)

## Files Modified

- `src/components/ReferenceList.tsx` — component logic changes
- `src/components/ReferenceList.css` — styling for toggle button

## What Does NOT Change

- `setCorrectOption` server call logic
- Option editing (Japanese/English inline textareas)
- Save/Delete buttons
- Screenshot display
- Question text display
- `updateQuestion` function
- `KANJI_NUMS` array (used for entry numbering, not option numbering)
