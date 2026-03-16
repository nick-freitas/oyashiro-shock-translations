# Collapsed Options — Design Spec

**Date:** 2026-03-16
**Status:** Draft

## Overview

Change the options display in `EntryRow` so that only the correct answer is shown prominently. The other 3 options are hidden behind an expand/collapse toggle. This makes the correct answer the focal point of each entry in the reference view.

## Changes

### Remove option numbering

Remove the `OPTION_COUNTERS` array (`["一", "二", "三", "四"]`) and the `<button className="correct-toggle">` elements that display them. Options no longer have numbered labels or position indicators — this is intentional since option index is an internal detail, not meaningful to the user.

### Correct answer display

- The correct answer option is rendered first, with the existing `.correct` green container shading applied to the whole option item
- It displays the Japanese text (with furigana) and English translation, same as today but without the number button
- The existing `::before` dot indicator is kept on the correct option (green dot)

### Expand/collapse toggle

- Below the correct answer, a toggle button shows "Show options" when collapsed and "Hide options" when expanded
- New class `.options-toggle` styled with `font-size: 18px`, `color: var(--text-en-sub)`, `font-family: var(--font-en)`, no border, transparent background. On hover, `color: var(--accent-indigo-light)`
- When expanded, the remaining 3 options appear below the toggle (no animation, instant show/hide)
- Default state: collapsed

### Click target for selecting an alternate answer

When expanded, each non-correct option shows a small radio-style circle on the left (in the same position the number button occupied). Clicking this circle calls `setCorrectOption(originalIndex)`. Clicking the option text still enters edit mode (existing behavior preserved).

New class `.correct-select` for the radio circle, styled similar to the old `.correct-toggle` but without text — just a small bordered circle that fills on hover.

### Clicking an alternate option

- When expanded, clicking the radio circle on any alternate option calls `setCorrectOption(originalIndex)` where `originalIndex` is the option's position in the `options` array (0-3), not its display position
- This persists the new correct answer to the server (existing behavior)
- The newly correct option moves to the prominent top position
- The previously correct option moves into the hidden group
- The options **stay expanded** after a swap

### No correct answer set

- If `correctOption` is undefined (no answer selected yet), all 4 options are shown without collapse — the user needs to see all options to pick one
- Each option shows the radio circle so the user can select one
- Once a correct answer is selected, the collapse behavior activates

### Editing and collapse interaction

- The correct option is always editable (both Japanese click-to-edit and English textarea), regardless of collapse state
- Non-correct options are editable only when expanded
- Collapsing clears `editingField` if it references a non-correct option (e.g., if `editingField` is `option-ja-2` and option 2 is not the correct answer, it resets to `null`)
- The toggle button is always available (not disabled during edits)

### State

- `expanded` boolean state added to `EntryRow`, default `false`
- Reset to `false` is not needed on answer swap (stays expanded per requirement)
- The `expanded` state is local to `EntryRow`. The `onSaved` callback updates the parent's entry list but does not cause `EntryRow` to remount (keyed by `q.id`, which does not change on correct-answer swap), so `expanded` is preserved

## Files Modified

- `src/components/ReferenceList.tsx` — component logic changes
- `src/components/ReferenceList.css` — styling for toggle button and radio circle

## What Does NOT Change

- `setCorrectOption` server call logic
- Option editing (Japanese/English inline textareas)
- Save/Delete buttons
- Screenshot display
- Question text display
- `updateQuestion` function
- `KANJI_NUMS` array (used for entry numbering, not option numbering)
- `OPTION_COUNTERS` is removed (not kept)
