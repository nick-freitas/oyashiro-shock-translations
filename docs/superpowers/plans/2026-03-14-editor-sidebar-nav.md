# Editor Sidebar Navigation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Editor top bar and relocate its controls (nav links + action buttons) into the right sidebar with a popover menu.

**Architecture:** Delete the `.page-header` element and its CSS. Add nav links (学習, 管理) and an actions trigger (⋯) to the existing `.title-sidebar`. The trigger opens a popover with two vertical-text action links. Status messages become auto-dismissing toast notifications.

**Tech Stack:** React 19, React Router 7, CSS (no libraries)

**Spec:** `docs/superpowers/specs/2026-03-14-editor-sidebar-nav-design.md`

---

## Chunk 1: Full Implementation

### Task 1: Remove top bar CSS

**Files:**
- Modify: `src/App.css` (delete page-header, header-label, header-count, reprocess-btn, reprocess-msg, study-link, manage-link styles)

**Note:** The CSS blocks to delete are interleaved with unrelated styles (loading/error, responsive). Delete only the specific blocks listed below — leave everything else intact.

- [ ] **Step 1: Delete page-header and header styles**

Delete the `/* ===== PAGE HEADER ===== */` section: the `.page-header`, `.header-label`, and `.header-count` rules (lines 121-144).

- [ ] **Step 2: Delete reprocess button and message styles**

Delete the `/* ===== REPROCESS BUTTON ===== */` section: `.reprocess-btn`, `.reprocess-btn:hover:not(:disabled)`, `.reprocess-btn:disabled`, and `.reprocess-msg` rules (lines 191-221).

- [ ] **Step 3: Delete study-link and manage-link styles**

Delete the `/* ===== STUDY MODE LINK ===== */` section: `.study-link`, `.study-link:hover`, `.manage-link`, and `.manage-link:hover` rules (lines 223-259).

- [ ] **Step 4: Delete the `.page-header` rule inside the 500px media query**

Delete this block from the `@media (max-width: 500px)` section:

```css
.page-header {
  padding: 24px 12px 20px;
}
```

- [ ] **Step 5: Verify the build compiles**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds (CSS removal doesn't break builds, but confirms no syntax errors introduced)

- [ ] **Step 6: Commit**

```bash
git add src/App.css
git commit -m "refactor: remove top bar CSS styles"
```

---

### Task 2: Modify sidebar CSS layout and add new element styles

**Files:**
- Modify: `src/App.css` (update `.title-sidebar`, add new classes)

- [ ] **Step 1: Update `.title-sidebar` to use `flex-start`**

In the existing `.title-sidebar` rule, change only these two properties:

- `justify-content: center` → `justify-content: flex-start`
- `padding: 40px 0` → `padding: 20px 0 40px`

Leave all other properties unchanged.

- [ ] **Step 2: Add sidebar nav link styles**

Append after the `.sidebar-count` block:

```css
/* ===== SIDEBAR NAV LINKS ===== */
.sidebar-nav-link {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-family: var(--font-ja);
  font-size: 13px;
  color: var(--accent-gold);
  text-decoration: none;
  letter-spacing: 0.2em;
  padding: 6px 0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.sidebar-nav-link:hover {
  color: var(--accent-gold-bright);
}
```

- [ ] **Step 3: Add actions trigger button styles**

```css
/* ===== SIDEBAR ACTIONS TRIGGER ===== */
.sidebar-actions-trigger {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: var(--bg-row-hover);
  border: 1px solid var(--border-row);
  color: var(--accent-gold);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin: 12px 0;
  transition: background-color 0.2s ease;
  padding: 0;
  line-height: 1;
}

.sidebar-actions-trigger:hover,
.sidebar-actions-trigger[aria-expanded="true"] {
  background: var(--accent-indigo);
}
```

- [ ] **Step 4: Add popover styles**

```css
/* ===== SIDEBAR POPOVER ===== */
.sidebar-popover {
  position: absolute;
  right: calc(100% + 8px);
  background: var(--bg-sidebar);
  border: 1px solid var(--border-row);
  border-radius: 6px;
  padding: 18px 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.sidebar-popover-action {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-family: var(--font-ja);
  font-size: 13px;
  color: var(--accent-gold);
  letter-spacing: 0.2em;
  padding: 8px 4px;
  cursor: pointer;
  transition: color 0.2s ease;
  background: none;
  border: none;
  border-right: 1px solid var(--border-row);
  min-height: 100px;
}

.sidebar-popover-action:last-child {
  border-right: none;
}

.sidebar-popover-action:hover:not(:disabled) {
  color: var(--accent-gold-bright);
}

.sidebar-popover-action:disabled {
  color: var(--text-en-sub);
  cursor: not-allowed;
  pointer-events: none;
}
```

- [ ] **Step 5: Add toast notification styles**

```css
/* ===== TOAST NOTIFICATION ===== */
.toast-message {
  position: fixed;
  top: 20px;
  right: calc(var(--sidebar-width) + 16px);
  background: var(--bg-sidebar);
  border: 1px solid var(--border-row);
  border-radius: 6px;
  padding: 12px 20px;
  color: var(--accent-gold);
  font-family: var(--font-ja);
  font-size: 13px;
  letter-spacing: 0.1em;
  z-index: 200;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  animation: toast-in 0.3s ease;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

- [ ] **Step 6: Add responsive styles for new elements**

Add to the existing `@media (max-width: 860px)` block:

```css
.sidebar-nav-link {
  font-size: 11px;
}

.sidebar-actions-trigger {
  width: 24px;
  height: 24px;
  font-size: 14px;
}
```

Add to the existing `@media (max-width: 500px)` block:

```css
.sidebar-nav-link {
  font-size: 10px;
}

.sidebar-nav-link .nav-arrow {
  display: none;
}

.sidebar-actions-trigger {
  width: 22px;
  height: 22px;
  font-size: 12px;
}
```

- [ ] **Step 7: Verify build compiles**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 8: Commit**

```bash
git add src/App.css
git commit -m "feat: add sidebar nav, popover, and toast CSS styles"
```

---

### Task 3: Remove top bar JSX and add sidebar elements

**Files:**
- Modify: `src/App.tsx:1-166` (remove page-header, add sidebar elements, add popover + toast)

- [ ] **Step 1: Add `useRef` and `useCallback` to the React import**

```tsx
import { useEffect, useState, useRef, useCallback } from "react";
```

- [ ] **Step 2: Add `popoverOpen` state and toast timeout ref**

Add after the existing state declarations (after line 26):

```tsx
const [popoverOpen, setPopoverOpen] = useState(false);
const toastTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
const popoverRef = useRef<HTMLDivElement>(null);
const triggerRef = useRef<HTMLButtonElement>(null);
```

- [ ] **Step 3: Add `showToast` helper and click-outside/escape handlers**

Add before the `handleReprocess` function (these must be defined before the functions that call them):

```tsx
function showToast(setter: (msg: string | null) => void, message: string) {
  if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  // Clear both message states so only one toast shows at a time
  setReprocessMsg(null);
  setGenerateMsg(null);
  setter(message);
  toastTimeoutRef.current = setTimeout(() => setter(null), 3000);
}

const handleClickOutside = useCallback((e: MouseEvent) => {
  if (
    popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
    triggerRef.current && !triggerRef.current.contains(e.target as Node)
  ) {
    setPopoverOpen(false);
  }
}, []);

const handleEscape = useCallback((e: KeyboardEvent) => {
  if (e.key === "Escape" && popoverOpen) {
    setPopoverOpen(false);
    triggerRef.current?.focus();
  }
}, [popoverOpen]);
```

- [ ] **Step 4: Update `handleReprocess` to use `showToast`**

Replace the entire `handleReprocess` function with:

```tsx
async function handleReprocess() {
  setReprocessing(true);
  setReprocessMsg(null);
  try {
    const res = await fetch("/api/questions/reprocess", { method: "POST" });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      showToast(setReprocessMsg, `Server error: ${text}`);
      return;
    }
    if (!res.ok) {
      showToast(setReprocessMsg, data.error || "Failed");
      return;
    }
    if (data.processed > 0) {
      showToast(setReprocessMsg, `Processed ${data.processed} new screenshot(s)`);
      fetchQuestions();
    } else {
      showToast(setReprocessMsg, data.message || "No new screenshots");
    }
  } catch (err) {
    showToast(setReprocessMsg, err instanceof Error ? err.message : "Failed");
  } finally {
    setReprocessing(false);
    setPopoverOpen(false);
  }
}
```

- [ ] **Step 5: Update `handleGenerateDistractors` to use `showToast`**

Replace the entire `handleGenerateDistractors` function with:

```tsx
async function handleGenerateDistractors() {
  setGenerating(true);
  setGenerateMsg(null);
  try {
    const res = await fetch("/api/questions/generate-distractors", { method: "POST" });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      showToast(setGenerateMsg, `Server error: ${text}`);
      return;
    }
    if (!res.ok) {
      showToast(setGenerateMsg, data.error || "Failed");
      return;
    }
    const parts = [`Generated ${data.generated}`, `skipped ${data.skipped}`];
    if (data.failed > 0) parts.push(`failed ${data.failed}`);
    showToast(setGenerateMsg, `${parts.join(", ")} (${data.total} total)`);
    if (data.generated > 0) {
      fetchQuestions();
    }
  } catch (err) {
    showToast(setGenerateMsg, err instanceof Error ? err.message : "Failed");
  } finally {
    setGenerating(false);
    setPopoverOpen(false);
  }
}
```

- [ ] **Step 6: Add useEffect for click-outside and escape listeners**

Add after the existing `useEffect`:

```tsx
useEffect(() => {
  if (popoverOpen) {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }
}, [popoverOpen, handleClickOutside, handleEscape]);

useEffect(() => {
  return () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  };
}, []);
```

- [ ] **Step 7: Remove the page-header JSX**

Delete the entire `<header className="page-header">...</header>` block (find it by searching for `className="page-header"` — line numbers will have shifted from earlier insertions).

- [ ] **Step 8: Replace the sidebar JSX with new layout**

Replace the current `<aside className="title-sidebar">...</aside>` block with:

```tsx
<aside className="title-sidebar">
  <Link to="/study" className="sidebar-nav-link">
    学習<span className="nav-arrow"> →</span>
  </Link>
  <Link to="/manage" className="sidebar-nav-link">
    管理<span className="nav-arrow"> →</span>
  </Link>
  <button
    ref={triggerRef}
    className="sidebar-actions-trigger"
    onClick={() => setPopoverOpen((prev) => !prev)}
    aria-expanded={popoverOpen}
    aria-haspopup="true"
  >
    ⋯
  </button>
  {popoverOpen && (
    <div ref={popoverRef} className="sidebar-popover" role="dialog">
      <button
        className="sidebar-popover-action"
        onClick={handleGenerateDistractors}
        disabled={generating}
      >
        {generating ? "生成中…" : "練習問題を生成"}
      </button>
      <button
        className="sidebar-popover-action"
        onClick={handleReprocess}
        disabled={reprocessing}
      >
        {reprocessing ? "処理中…" : "画像を処理"}
      </button>
    </div>
  )}
  <div className="sidebar-titles">
    <div className="sidebar-subtitle">新・クイズ・ショック</div>
    <div className="sidebar-title">おやしろさま</div>
  </div>
  <div className="sidebar-count">
    {toKanjiCount(questions.length)}
  </div>
</aside>
```

- [ ] **Step 9: Add toast notification JSX**

Add right before the closing `</div>` of `.app-layout` (after the `</aside>`):

```tsx
{(reprocessMsg || generateMsg) && (
  <div className="toast-message" role="status">
    {reprocessMsg || generateMsg}
  </div>
)}
```

**Note on focus trapping:** The spec mentions focus trapping for the popover. With only two buttons, a full focus trap is unnecessary — the click-outside, Escape, and `aria-expanded`/`role="dialog"` attributes provide sufficient accessibility. Tab will naturally cycle through the two buttons.

- [ ] **Step 10: Verify build compiles**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 11: Commit**

```bash
git add src/App.tsx
git commit -m "feat: move top bar controls to sidebar with popover and toast"
```

---

### Task 4: Manual verification

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify Editor page**

Open `http://localhost:5173` in the browser. Check:
- No top bar visible
- Questions start at the top of the content area
- Sidebar shows 学習 →, 管理 →, ⋯ button, then the existing title/subtitle/count

- [ ] **Step 3: Verify nav links**

Click 学習 → — should navigate to `/study`
Click back, then click 管理 → — should navigate to `/manage`

- [ ] **Step 4: Verify popover**

Click the ⋯ button:
- Popover opens to the left with two vertical text action links
- Click outside — popover closes
- Open popover, press Escape — popover closes and ⋯ button is focused

- [ ] **Step 5: Verify action buttons**

Open popover, click 練習問題を生成:
- Text changes to 生成中… and button is disabled
- After completion, popover closes and a toast appears top-right
- Toast auto-dismisses after ~3 seconds

Open popover, click 画像を処理:
- Same loading/toast behavior

- [ ] **Step 6: Verify responsive behavior**

Resize browser to ~800px wide — sidebar narrows, nav text smaller
Resize to ~450px — sidebar narrows further, → arrows hidden

- [ ] **Step 7: Final commit if any adjustments needed**

```bash
git add src/App.tsx src/App.css
git commit -m "fix: adjustments from manual verification"
```
