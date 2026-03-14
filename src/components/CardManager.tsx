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
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());

  function toggleCard(cardKey: string) {
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardKey)) next.delete(cardKey);
      else next.add(cardKey);
      return next;
    });
  }

  async function saveOption(
    questionId: number,
    optionIndex: number,
    field: "ja" | "en",
    value: string
  ) {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    const newOptions = [...question.options] as Question["options"];
    newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value };

    try {
      const res = await fetch(`/api/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ options: newOptions }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: Question = await res.json();
      setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    } catch (err) {
      console.error("Save failed:", err);
    }
  }

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
          const cardKey = `q${card.questionId}-o${card.optionIndex}`;
          const isOpen = openCards.has(cardKey);
          return (
            <div key={cardKey}>
              {showDivider && <div className="acc-q-divider" />}
              <div className={`acc-item${isOpen ? " open" : ""}${idx % 2 === 1 ? " alt-row" : ""}`}>
                <div className="acc-row" onClick={() => toggleCard(cardKey)}>
                  <div className="acc-id-cell">
                    <span className="acc-id">{cardKey}</span>
                    {card.isCorrect && <span className="acc-correct-dot" />}
                  </div>
                  <input
                    className="acc-stem-input"
                    defaultValue={card.ja}
                    onBlur={(e) => {
                      if (e.target.value !== card.ja) {
                        saveOption(card.questionId, card.optionIndex, "ja", e.target.value);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <input
                    className="acc-answer-input"
                    defaultValue={card.en}
                    onBlur={(e) => {
                      if (e.target.value !== card.en) {
                        saveOption(card.questionId, card.optionIndex, "en", e.target.value);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="acc-chevron">▼</div>
                </div>
                <div className="acc-panel">
                  <div className="acc-panel-inner">
                    <div className="panel-label">
                      Distractors ({card.distractors.length})
                    </div>
                    <div className="panel-chips">
                      {card.distractors.map((d, di) => (
                        <span key={di} className="d-chip">{d}</span>
                      ))}
                    </div>
                  </div>
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
