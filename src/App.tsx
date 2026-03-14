import { useEffect, useState, useRef, useCallback } from "react";
import { Routes, Route, Link } from "react-router-dom";
import type { Question } from "./types";
import { QuestionList } from "./components/QuestionList";
import { StudyMode } from "./components/StudyMode";
import { CardManager } from "./components/CardManager";
import "./App.css";

const KANJI_NUMS = [
  "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "二十一", "二十二", "二十三", "二十四",
];

function toKanjiCount(n: number): string {
  return KANJI_NUMS[n - 1] ?? String(n);
}

function Editor() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessMsg, setReprocessMsg] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState<string | null>(null);
  const [addingFurigana, setAddingFurigana] = useState(false);
  const [furiganaMsg, setFuriganaMsg] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function fetchQuestions() {
    setLoading(true);
    fetch("/api/questions")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setQuestions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function handleQuestionSaved(updated: Question) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updated.id ? updated : q))
    );
  }

  function handleQuestionDeleted(id: number) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function showToast(setter: (msg: string | null) => void, message: string) {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    // Clear all message states so only one toast shows at a time
    setReprocessMsg(null);
    setGenerateMsg(null);
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
    fetchQuestions();
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

  async function handleAddFurigana() {
    setAddingFurigana(true);
    setFuriganaMsg(null);
    try {
      const res = await fetch("/api/questions/add-furigana", { method: "POST" });
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
        fetchQuestions();
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
        <QuestionList
          questions={questions}
          onQuestionSaved={handleQuestionSaved}
          onQuestionDeleted={handleQuestionDeleted}
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
            ⋯
          </button>
          <Link to="/study" className="sidebar-nav-link">学習</Link>
          <Link to="/manage" className="sidebar-nav-link">管理</Link>
        </div>
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
            <button
              className="sidebar-popover-action"
              onClick={handleAddFurigana}
              disabled={addingFurigana}
            >
              {addingFurigana ? "振仮名追加中…" : "振仮名を追加"}
            </button>
          </div>
        )}
        <div className="sidebar-titles">
          <div className="sidebar-subtitle">新・クイズ・ショック</div>
          <div className="sidebar-title">おやしろさまショック</div>
        </div>
        <div className="sidebar-count">
          {toKanjiCount(questions.length)}
        </div>
      </aside>
      {(reprocessMsg || generateMsg || furiganaMsg) && (
        <div className="toast-message" role="status">
          {reprocessMsg || generateMsg || furiganaMsg}
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Editor />} />
      <Route path="/study" element={<StudyMode />} />
      <Route path="/manage" element={<CardManager />} />
    </Routes>
  );
}

export default App;
