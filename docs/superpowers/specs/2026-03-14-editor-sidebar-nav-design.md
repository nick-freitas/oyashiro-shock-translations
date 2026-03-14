# Editor Sidebar Navigation Design

## Overview

Remove the Editor page's top bar (`.page-header`) entirely and relocate its controls into the existing right sidebar (`.title-sidebar`). This matches the pattern already established by the CardManager page, which uses sidebar-only navigation with no top bar.

## What Gets Removed

The entire `.page-header` element and its contents:

- "Shin Oyashiro Shock!" decorative label — **dropped** (sidebar already has Japanese title)
- Header question count (e.g. "24問") — **dropped** (sidebar already has kanji count at bottom)
- Study link — **moved to sidebar**
- Manage Cards link — **moved to sidebar**
- Generate Study Distractors button — **moved to sidebar popover**
- Process New Screenshots button — **moved to sidebar popover**
- Associated status messages — **moved to toast notifications**

## Sidebar Layout

The sidebar (`.title-sidebar`) gains new elements at the top. Order from top to bottom:

1. **学習 →** — vertical text nav link to `/study` (gold, `var(--accent-gold)`)
2. **管理 →** — vertical text nav link to `/manage` (gold, `var(--accent-gold)`)
3. **⋯ button** — small square trigger that opens the actions popover (gold text on dark background)
4. **おやしろさま** — existing vertical title (unchanged)
5. **新・クイズ・ショック** — existing vertical subtitle (unchanged)
6. **二四** (kanji count) — existing count at bottom (unchanged)

### Nav Links

- Use `writing-mode: vertical-rl` to match existing sidebar text
- Gold color (`var(--accent-gold)`) with bright gold on hover (`var(--accent-gold-bright)`)
- Arrow (→) indicates these are navigation links
- React Router `<Link>` components, same as current top bar links

### ⋯ Trigger Button

- Small square (roughly 28x28px), centered in sidebar
- Background: `var(--bg-row-alt)` (#24232c)
- Border: 1px solid `var(--border-row)`
- Gold text color for the ⋯ character
- On click: toggles the actions popover

## Actions Popover

Opens to the left of the sidebar when the ⋯ button is clicked.

### Layout

- Horizontal flexbox containing two vertical-text action links side by side
- Background: `var(--bg-sidebar)` (#17161c) — matches sidebar
- Border: 1px solid `var(--border-row)`
- Border-radius: 6px
- Subtle box-shadow for depth

### Action Links

Two vertical-text links, separated by a subtle border:

1. **練習問題を生成** — "Generate Study Distractors" — calls `/api/questions/generate-distractors`
2. **画像を処理** — "Process Screenshots" — calls `/api/questions/reprocess`

- `writing-mode: vertical-rl` with letter-spacing
- Gold color, same hover behavior as nav links
- On click: triggers the API call, shows loading state, then displays status as a toast

### Behavior

- Closes on click outside the popover
- Closes on Escape key
- ⋯ button highlights (brighter background) when popover is open
- Popover positioned anchored to the ⋯ button, opening leftward

## Status Messages

Currently, status messages (`reprocessMsg`, `generateMsg`) display inline in the top bar. With the top bar removed, these become **toast notifications** that appear temporarily over the main content area.

- Position: fixed or absolute, near the top-right of the main content area (left of the sidebar)
- Gold text on dark background, matching theme
- Auto-dismiss after a few seconds
- Appears after an action completes (success or error)

## CSS Changes

### Remove

- `.page-header` and all child styles (`.header-label`, `.header-count`, `.study-link`, `.manage-link`, `.reprocess-btn`, `.reprocess-msg`)

### Modify

- `.title-sidebar` — add padding-top for nav links, adjust internal layout to accommodate new elements above the title

### Add

- `.sidebar-nav-link` — vertical text nav link style
- `.sidebar-actions-trigger` — ⋯ button style
- `.sidebar-popover` — popover container
- `.sidebar-popover-action` — vertical text action link within popover
- `.toast-message` — status toast notification

## Component Changes

### `App.tsx`

- Remove the `.page-header` JSX block (lines ~120-147)
- Remove the `reprocessMsg` and `generateMsg` state management from the header
- Add nav links and ⋯ trigger to the `.title-sidebar` JSX
- Add popover component (can be inline state-managed, no library needed)
- Add toast notification for status messages
- Add state: `popoverOpen` (boolean)
- Keep existing API call handlers (`handleReprocess`, `handleGenerateDistractors`), just wire them to the popover actions instead

### `App.css`

- Delete `.page-header` related styles
- Add new sidebar element styles
- Add popover styles
- Add toast styles

## Responsive Behavior

The sidebar already has responsive breakpoints:
- 90px default → 60px at 860px → 44px at 500px

At smaller widths:
- Nav link font size decreases slightly
- ⋯ button shrinks proportionally
- Popover still opens to the left, unaffected by sidebar width changes
- Arrow text on nav links can be dropped at smallest breakpoint

## Accessibility

- Popover should trap focus when open
- Escape closes popover and returns focus to ⋯ button
- Nav links are standard `<Link>` elements (keyboard navigable)
- Action links in popover have appropriate `role="button"` or use `<button>` elements
- Toast messages use `role="status"` for screen reader announcement
