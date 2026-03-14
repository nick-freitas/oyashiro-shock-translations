import { useEffect, useState } from "react";
import type { Question } from "./types";
import { QuestionList } from "./components/QuestionList";
import { QuestionCard } from "./components/QuestionCard";
import "./App.css";

function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/questions")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setQuestions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(updated: Question) {
    const res = await fetch(`/api/questions/${updated.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: updated.question,
        options: updated.options,
      }),
    });

    if (!res.ok) throw new Error(`Save failed: HTTP ${res.status}`);

    const saved: Question = await res.json();
    setQuestions((prev) =>
      prev.map((q) => (q.id === saved.id ? saved : q))
    );
    setSelected(saved);
  }

  if (loading) return <div className="center">Loading...</div>;
  if (error) return <div className="center error">Error: {error}</div>;

  if (selected) {
    return (
      <QuestionCard
        key={selected.id}
        question={selected}
        onBack={() => setSelected(null)}
        onSave={handleSave}
      />
    );
  }

  return <QuestionList questions={questions} onSelect={setSelected} />;
}

export default App;
