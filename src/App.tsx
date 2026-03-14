import { useEffect, useState } from "react";
import type { Question } from "./types";
import { QuestionList } from "./components/QuestionList";
import "./App.css";

const KANJI_NUMS = [
  "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "二十一", "二十二", "二十三", "二十四",
];

function toKanjiCount(n: number): string {
  return KANJI_NUMS[n - 1] ?? String(n);
}

function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessMsg, setReprocessMsg] = useState<string | null>(null);

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

  useEffect(() => {
    fetchQuestions();
  }, []);

  function handleQuestionSaved(updated: Question) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updated.id ? updated : q))
    );
  }

  function handleQuestionDeleted(id: number) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  async function handleReprocess() {
    setReprocessing(true);
    setReprocessMsg(null);
    try {
      const res = await fetch("/api/questions/reprocess", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setReprocessMsg(data.error || "Failed");
        return;
      }
      if (data.processed > 0) {
        setReprocessMsg(`Processed ${data.processed} new screenshot(s)`);
        fetchQuestions();
      } else {
        setReprocessMsg(data.message || "No new screenshots");
      }
    } catch (err) {
      setReprocessMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setReprocessing(false);
    }
  }

  if (loading) return <div className="center">読み込み中&hellip;</div>;
  if (error) return <div className="center error">Error: {error}</div>;

  return (
    <div className="app-layout">
      <div className="main-content">
        <header className="page-header">
          <span className="header-label">Shin Oyashiro Shock!</span>
          <span className="header-count">
            {toKanjiCount(questions.length)}問
          </span>
          <button
            className="reprocess-btn"
            onClick={handleReprocess}
            disabled={reprocessing}
          >
            {reprocessing ? "Processing\u2026" : "Process New Screenshots"}
          </button>
          {reprocessMsg && (
            <span className="reprocess-msg">{reprocessMsg}</span>
          )}
        </header>
        <QuestionList
          questions={questions}
          onQuestionSaved={handleQuestionSaved}
          onQuestionDeleted={handleQuestionDeleted}
        />
      </div>

      <aside className="title-sidebar">
        <div className="sidebar-titles">
          <div className="sidebar-subtitle">新・クイズ・ショック</div>
          <div className="sidebar-title">おやしろさま</div>
        </div>
        <div className="sidebar-count">
          {toKanjiCount(questions.length)}
        </div>
      </aside>
    </div>
  );
}

export default App;
