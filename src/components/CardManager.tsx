import { useEffect, useState } from "react";
import type { Question } from "../types";
import { Link } from "react-router-dom";
import "./CardManager.css";

interface Card {
  questionId: number;
  optionIndex: number;
  ja: string;
  en: string;
  distractors: string[];
  isCorrect: boolean;
}

function flattenToCards(questions: Question[]): Card[] {
  const cards: Card[] = [];
  for (const q of questions) {
    for (let i = 0; i < q.options.length; i++) {
      const opt = q.options[i];
      cards.push({
        questionId: q.id,
        optionIndex: i,
        ja: opt.ja,
        en: opt.en,
        distractors: opt.distractors ?? [],
        isCorrect: q.correctOption === i,
      });
    }
  }
  return cards;
}

export function CardManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
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

  const cards = flattenToCards(questions);

  if (loading) return <div className="center">読み込み中…</div>;
  if (error) return <div className="center error">Error: {error}</div>;

  return (
    <div className="manage-layout">
      <div className="manage-content">
        {cards.map((card, idx) => {
          const prevCard = idx > 0 ? cards[idx - 1] : null;
          const showDivider = prevCard && prevCard.questionId !== card.questionId;
          return (
            <div key={`q${card.questionId}-o${card.optionIndex}`}>
              {showDivider && <div className="acc-q-divider" />}
              <div className={`acc-item${idx % 2 === 1 ? " alt-row" : ""}`}>
                <div className="acc-row">
                  <div className="acc-id-cell">
                    <span className="acc-id">q{card.questionId}-o{card.optionIndex}</span>
                    {card.isCorrect && <span className="acc-correct-dot" />}
                  </div>
                  <div className="acc-stem">{card.ja}</div>
                  <div className="acc-answer">{card.en}</div>
                  <div className="acc-chevron">▼</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <aside className="manage-sidebar">
        <div className="manage-sidebar-title">管理</div>
        <Link to="/" className="manage-back-link">← Editor</Link>
        <div className="manage-sidebar-count">{cards.length}</div>
      </aside>
    </div>
  );
}
