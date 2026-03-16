# Collapsed Options Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show only the correct answer prominently; hide the other 3 options behind an expand toggle.

**Architecture:** Modify `EntryRow` in `ReferenceList.tsx` to reorder options (correct first), add expand/collapse state, replace number buttons with radio circles for alternate options. Add CSS for toggle button and radio circles.

**Tech Stack:** React 19, TypeScript, CSS

**Spec:** `docs/superpowers/specs/2026-03-16-collapsed-options-design.md`

---

## Chunk 1: Implementation

### Task 1: Add collapsed options behavior and styling

**Files:**
- Modify: `src/components/ReferenceList.tsx`
- Modify: `src/components/ReferenceList.css`

- [ ] **Step 1: Add CSS for toggle button and radio circle**

Append to `src/components/ReferenceList.css`:

```css
/* ===== OPTIONS TOGGLE ===== */
.options-toggle {
  font-family: var(--font-en);
  font-size: 18px;
  color: var(--text-en-sub);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  transition: color 0.2s ease;
}

.options-toggle:hover {
  color: var(--accent-indigo-light);
}

/* ===== CORRECT SELECT RADIO ===== */
.correct-select {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--accent-indigo);
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
  margin-top: 10px;
  padding: 0;
}

.correct-select:hover {
  border-color: #408040;
  background: rgba(64, 128, 64, 0.2);
}
```

- [ ] **Step 2: Remove OPTION_COUNTERS and restructure options rendering in ReferenceList.tsx**

In `src/components/ReferenceList.tsx`, make these changes:

**Remove** line 56:
```typescript
const OPTION_COUNTERS = ["一", "二", "三", "四"];
```

**Add** `expanded` state to `EntryRow` (after the `editingField` state on line 68):
```typescript
const [expanded, setExpanded] = useState(false);
```

**Add** collapse-clears-editing logic. Add this function after the `updateOption` function (after line 101):
```typescript
function handleToggleExpanded() {
  if (expanded && editingField) {
    // Clear editing if it references a non-correct option being hidden
    const match = editingField.match(/^option-(?:ja|en)-(\d)$/);
    if (match && Number(match[1]) !== edited.correctOption) {
      setEditingField(null);
    }
  }
  setExpanded((prev) => !prev);
}
```

**Replace** the entire `<div className="options-col">` block (lines 176-215) with:

```tsx
<div className="options-col">
  {edited.correctOption != null ? (
    <>
      {/* Correct answer — always visible */}
      {(() => {
        const oi = edited.correctOption;
        const opt = edited.options[oi];
        return (
          <div className="option-item correct">
            <div className="option-input-row">
              {editingField === `option-ja-${oi}` ? (
                <AutoTextarea
                  className={`inline-input input-ja option-input${opt.ja !== entry.options[oi].ja ? " modified" : ""}`}
                  value={opt.ja}
                  onChange={(e) => updateOption(oi, "ja", e.target.value)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
                />
              ) : (
                <div
                  className={`ruby-display ruby-display-option input-ja${opt.ja !== entry.options[oi].ja ? " modified" : ""}`}
                  onClick={() => setEditingField(`option-ja-${oi}`)}
                >
                  {parseRuby(opt.ja)}
                </div>
              )}
            </div>
            <AutoTextarea
              className={`inline-input input-en option-input${opt.en !== entry.options[oi].en ? " modified" : ""}`}
              value={opt.en}
              onChange={(e) => updateOption(oi, "en", e.target.value)}
            />
          </div>
        );
      })()}

      {/* Toggle button */}
      <button
        className="options-toggle"
        onClick={handleToggleExpanded}
        type="button"
      >
        {expanded ? "Hide options" : "Show options"}
      </button>

      {/* Alternate options — visible when expanded */}
      {expanded && edited.options.map((opt, oi) => {
        if (oi === edited.correctOption) return null;
        return (
          <div key={oi} className="option-item">
            <div className="option-input-row">
              <button
                className="correct-select"
                onClick={() => setCorrectOption(oi)}
                title="Mark as correct answer"
                type="button"
              />
              {editingField === `option-ja-${oi}` ? (
                <AutoTextarea
                  className={`inline-input input-ja option-input${opt.ja !== entry.options[oi].ja ? " modified" : ""}`}
                  value={opt.ja}
                  onChange={(e) => updateOption(oi, "ja", e.target.value)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
                />
              ) : (
                <div
                  className={`ruby-display ruby-display-option input-ja${opt.ja !== entry.options[oi].ja ? " modified" : ""}`}
                  onClick={() => setEditingField(`option-ja-${oi}`)}
                >
                  {parseRuby(opt.ja)}
                </div>
              )}
            </div>
            <AutoTextarea
              className={`inline-input input-en option-input${opt.en !== entry.options[oi].en ? " modified" : ""}`}
              value={opt.en}
              onChange={(e) => updateOption(oi, "en", e.target.value)}
            />
          </div>
        );
      })}
    </>
  ) : (
    /* No correct answer set — show all options with radio circles */
    edited.options.map((opt, oi) => (
      <div key={oi} className="option-item">
        <div className="option-input-row">
          <button
            className="correct-select"
            onClick={() => setCorrectOption(oi)}
            title="Mark as correct answer"
            type="button"
          />
          {editingField === `option-ja-${oi}` ? (
            <AutoTextarea
              className={`inline-input input-ja option-input${opt.ja !== entry.options[oi].ja ? " modified" : ""}`}
              value={opt.ja}
              onChange={(e) => updateOption(oi, "ja", e.target.value)}
              onBlur={() => setEditingField(null)}
              autoFocus
            />
          ) : (
            <div
              className={`ruby-display ruby-display-option input-ja${opt.ja !== entry.options[oi].ja ? " modified" : ""}`}
              onClick={() => setEditingField(`option-ja-${oi}`)}
            >
              {parseRuby(opt.ja)}
            </div>
          )}
        </div>
        <AutoTextarea
          className={`inline-input input-en option-input${opt.en !== entry.options[oi].en ? " modified" : ""}`}
          value={opt.en}
          onChange={(e) => updateOption(oi, "en", e.target.value)}
        />
      </div>
    ))
  )}
</div>
```

- [ ] **Step 3: Remove old correct-toggle CSS (optional cleanup)**

The `.correct-toggle`, `.correct-toggle:hover`, and `.correct-toggle.is-correct` CSS rules in `ReferenceList.css` (lines 288-317) are no longer used. Remove them.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc -b --noEmit
```

Expected: No errors.

- [ ] **Step 5: Verify tests pass**

```bash
npx vitest run
```

Expected: All tests pass (8/8).

- [ ] **Step 6: Manual verification**

Start `npm run dev`, open `http://localhost:5173`:
- Each entry shows only the correct answer with green shading
- "Show options" button appears below correct answer
- Clicking "Show options" reveals 3 other options with radio circles
- Clicking a radio circle swaps that option to the top as the new correct answer
- Options stay expanded after a swap
- "Hide options" collapses back to just the correct answer
- Inline editing still works on all options when visible
- Entries without a correctOption show all 4 options with radio circles

- [ ] **Step 7: Commit**

```bash
git add src/components/ReferenceList.tsx src/components/ReferenceList.css
git commit -m "feat: collapse non-correct options behind expand toggle"
```
