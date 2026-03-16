import { useEffect, useState, useRef, useCallback } from "react";
import type { Entry } from "./types";
import { ReferenceList } from "./components/ReferenceList";
import "./App.css";

const KANJI_NUMS = [
  "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "二十一", "二十二", "二十三", "二十四",
];

function toKanjiCount(n: number): string {
  return KANJI_NUMS[n - 1] ?? String(n);
}

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessMsg, setReprocessMsg] = useState<string | null>(null);
  const [addingFurigana, setAddingFurigana] = useState(false);
  const [furiganaMsg, setFuriganaMsg] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function fetchEntries() {
    setLoading(true);
    fetch("/api/entries")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setEntries)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function handleEntrySaved(updated: Entry) {
    setEntries((prev) =>
      prev.map((q) => (q.id === updated.id ? updated : q))
    );
  }

  function handleEntryDeleted(id: number) {
    setEntries((prev) => prev.filter((q) => q.id !== id));
  }

  function showToast(setter: (msg: string | null) => void, message: string) {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    // Clear all message states so only one toast shows at a time
    setReprocessMsg(null);
    setFuriganaMsg(null);
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
    if (e.key === "Escape") {
      setPopoverOpen(false);
      triggerRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, []);

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

  async function handleReprocess() {
    setReprocessing(true);
    setReprocessMsg(null);
    try {
      const res = await fetch("/api/entries/reprocess", { method: "POST" });
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
        fetchEntries();
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

  async function handleAddFurigana() {
    setAddingFurigana(true);
    setFuriganaMsg(null);
    try {
      const res = await fetch("/api/entries/add-furigana", { method: "POST" });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        showToast(setFuriganaMsg, `Server error: ${text}`);
        return;
      }
      if (!res.ok) {
        showToast(setFuriganaMsg, data.error || "Failed");
        return;
      }
      const parts = [`Annotated ${data.annotated}`, `skipped ${data.skipped}`];
      if (data.failed > 0) parts.push(`failed ${data.failed}`);
      showToast(setFuriganaMsg, `${parts.join(", ")} (${data.total} total)`);
      if (data.annotated > 0) {
        fetchEntries();
      }
    } catch (err) {
      showToast(setFuriganaMsg, err instanceof Error ? err.message : "Failed");
    } finally {
      setAddingFurigana(false);
      setPopoverOpen(false);
    }
  }

  if (loading) return <div className="center">読み込み中&hellip;</div>;
  if (error) return <div className="center error">Error: {error}</div>;

  return (
    <div className="app-layout">
      <div className="main-content">
        <ReferenceList
          entries={entries}
          onEntrySaved={handleEntrySaved}
          onEntryDeleted={handleEntryDeleted}
        />
      </div>

      <aside className="title-sidebar">
        <div className="sidebar-nav-links">
          <button
            ref={triggerRef}
            className="sidebar-actions-trigger"
            onClick={() => setPopoverOpen((prev) => !prev)}
            aria-expanded={popoverOpen}
            aria-haspopup="true"
          >
            ⋮
          </button>
          <span className="sidebar-nav-link">REFERENCE</span>
        </div>
        {popoverOpen && (
          <div ref={popoverRef} className="sidebar-popover" role="dialog">
            <button
              className="sidebar-popover-action"
              onClick={handleReprocess}
              disabled={reprocessing}
            >
              {reprocessing ? "Processing..." : "Process Screenshots"}
            </button>
            <button
              className="sidebar-popover-action"
              onClick={handleAddFurigana}
              disabled={addingFurigana}
            >
              {addingFurigana ? "Adding Furigana..." : "Add Furigana"}
            </button>
          </div>
        )}
        <div className="sidebar-titles">
          <div className="sidebar-subtitle">新・クイズ・ショック</div>
          <div className="sidebar-title">おやしろさまショック</div>
        </div>
        <div className="sidebar-count">
          {toKanjiCount(entries.length)}
        </div>
      </aside>
      {(reprocessMsg || furiganaMsg) && (
        <div className="toast-message" role="status">
          {reprocessMsg || furiganaMsg}
        </div>
      )}
    </div>
  );
}
