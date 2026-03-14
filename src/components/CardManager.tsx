import { useEffect, useRef, useState } from "react";
import type { Question } from "../types";
import { Link } from "react-router-dom";
import { parseRuby } from "../utils/parseRuby";
import "./CardManager.css";

const KANJI_NUMS = [
  "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "二十一", "二十二", "二十三", "二十四",
];

function toKanji(n: number): string {
  return KANJI_NUMS[n - 1] ?? String(n);
}

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
  const [openCards, setOpenCards] = useState<Set<string> | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  // cardKey of the card currently adding a new distractor (local-only, not saved until blur)
  const [editingDistractor, setEditingDistractor] = useState<string | null>(null);
  // Format: "q1-o0-3" (cardKey + distractor index)
  const [editingJa, setEditingJa] = useState<string | null>(null);
  const cancelledRef = useRef(false);

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

  async function saveDistractors(
    questionId: number,
    optionIndex: number,
    distractors: string[]
  ) {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    const newOptions = [...question.options] as Question["options"];
    newOptions[optionIndex] = { ...newOptions[optionIndex], distractors };

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
      console.error("Save distractors failed:", err);
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

  // Default all cards to expanded on first load
  if (openCards === null && cards.length > 0) {
    setOpenCards(new Set(cards.map((c) => `q${c.questionId}-o${c.optionIndex}`)));
  }

  if (loading) return <div className="center">読み込み中…</div>;
  if (error) return <div className="center error">Error: {error}</div>;

  return (
    <div className="manage-layout">
      <div className="manage-content">
        {cards.map((card, idx) => {
          const prevCard = idx > 0 ? cards[idx - 1] : null;
          const showDivider = prevCard && prevCard.questionId !== card.questionId;
          const cardKey = `q${card.questionId}-o${card.optionIndex}`;
          const isOpen = openCards?.has(cardKey) ?? false;
          return (
            <div key={cardKey}>
              {showDivider && <div className="acc-q-divider" />}
              <div className={`acc-item${isOpen ? " open" : ""}${idx % 2 === 1 ? " alt-row" : ""}`}>
                <div className="acc-row" onClick={() => toggleCard(cardKey)}>
                  <div className="acc-id-cell">
                    <span className="acc-id">{`${toKanji(card.questionId)}問の${toKanji(card.optionIndex + 1)}`}</span>
                    {card.isCorrect && <span className="acc-correct-dot" />}
                  </div>
                  {editingJa === cardKey ? (
                    <input
                      className="acc-stem-input"
                      defaultValue={card.ja}
                      autoFocus
                      onBlur={(e) => {
                        setEditingJa(null);
                        if (e.target.value !== card.ja) {
                          saveOption(card.questionId, card.optionIndex, "ja", e.target.value);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      className="acc-ruby-display"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingJa(cardKey);
                      }}
                    >
                      {parseRuby(card.ja)}
                    </div>
                  )}
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
                      {card.distractors.map((d, di) => {
                        const chipKey = `${cardKey}-${di}`;
                        const isEditing = editingDistractor === chipKey;
                        return (
                          <span key={di} className="d-chip">
                            {isEditing ? (
                              <input
                                className="d-chip-edit"
                                defaultValue={d}
                                autoFocus
                                onBlur={(e) => {
                                  if (cancelledRef.current) {
                                    cancelledRef.current = false;
                                    setEditingDistractor(null);
                                    return;
                                  }
                                  setEditingDistractor(null);
                                  const newVal = e.target.value.trim();
                                  if (newVal && newVal !== d) {
                                    const updated = [...card.distractors];
                                    updated[di] = newVal;
                                    saveDistractors(card.questionId, card.optionIndex, updated);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                  if (e.key === "Escape") {
                                    cancelledRef.current = true;
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span
                                className="d-chip-text"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDistractor(chipKey);
                                }}
                              >
                                {d}
                              </span>
                            )}
                            <span
                              className="d-chip-x"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = card.distractors.filter((_, i) => i !== di);
                                saveDistractors(card.questionId, card.optionIndex, updated);
                              }}
                            >
                              ×
                            </span>
                          </span>
                        );
                      })}
                      {addingTo === cardKey ? (
                        <span className="d-chip">
                          <input
                            className="d-chip-edit"
                            autoFocus
                            placeholder="new distractor"
                            onBlur={(e) => {
                              if (cancelledRef.current) {
                                cancelledRef.current = false;
                                setAddingTo(null);
                                return;
                              }
                              setAddingTo(null);
                              const val = e.target.value.trim();
                              if (val) {
                                saveDistractors(card.questionId, card.optionIndex, [
                                  ...card.distractors,
                                  val,
                                ]);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") {
                                cancelledRef.current = true;
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </span>
                      ) : (
                        <button
                          className="d-add"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddingTo(cardKey);
                          }}
                        >
                          +
                        </button>
                      )}
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
        <Link to="/" className="manage-back-link">編集</Link>
        <div className="manage-sidebar-count">{cards.length}</div>
      </aside>
    </div>
  );
}
