import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Question, CardProgress, StudyProgress } from "../types";
import { computeNewState, selectNextCard, pickDistractors } from "../srs";
import "./StudyMode.css";

function getCardId(questionId: number, optionIndex: number): string {
  return `q${questionId}-o${optionIndex}`;
}

interface StudyCard {
  cardId: string;
  ja: string;
  correctEn: string;
  distractors: string[];
}

function buildStudyCards(questions: Question[]): StudyCard[] {
  const cards: StudyCard[] = [];
  for (const q of questions) {
    for (let oi = 0; oi < q.options.length; oi++) {
      const opt = q.options[oi];
      if (!opt.distractors || opt.distractors.length === 0) continue;
      cards.push({
        cardId: getCardId(q.id, oi),
        ja: opt.ja,
        correctEn: opt.en,
        distractors: opt.distractors,
      });
    }
  }
  return cards;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatWaitTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} seconds`;
  const minutes = Math.ceil(totalSeconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  if (remainMin === 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${hours}h ${remainMin}m`;
}

type AnswerState =
  | { type: "unanswered" }
  | { type: "correct"; selectedIndex: number }
  | { type: "wrong"; selectedIndex: number; correctIndex: number };

export function StudyMode() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [progress, setProgress] = useState<StudyProgress>({ cards: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current card state
  const [currentCard, setCurrentCard] = useState<StudyCard | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [answerState, setAnswerState] = useState<AnswerState>({ type: "unanswered" });
  const [waitMs, setWaitMs] = useState<number | null>(null);

  // Ref to track latest progress for use in callbacks/timeouts
  const progressRef = useRef(progress);
  progressRef.current = progress;

  // Load data
  useEffect(() => {
    Promise.all([
      fetch("/api/questions").then((r) => r.json()),
      fetch("/api/study/progress").then((r) => r.json()),
    ])
      .then(([q, p]) => {
        setQuestions(q);
        setProgress(p);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const studyCards = buildStudyCards(questions);

  const presentCard = useCallback(
    (cards: StudyCard[], prog: StudyProgress) => {
      const allCardIds = cards.map((c) => c.cardId);
      const result = selectNextCard(prog.cards, allCardIds, Date.now());

      if (!result) {
        setCurrentCard(null);
        setWaitMs(null);
        return;
      }

      if (!result.isDue) {
        setCurrentCard(null);
        setWaitMs(result.waitMs ?? null);
        return;
      }

      const card = cards.find((c) => c.cardId === result.cardId)!;
      const distractorChoices = pickDistractors(card.distractors);
      const allChoices = shuffleArray([card.correctEn, ...distractorChoices]);

      setCurrentCard(card);
      setChoices(allChoices);
      setAnswerState({ type: "unanswered" });
      setWaitMs(null);
    },
    []
  );

  // Present first card when data loads
  useEffect(() => {
    if (!loading && studyCards.length > 0) {
      presentCard(studyCards, progress);
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAnswer(selectedIndex: number) {
    if (!currentCard || answerState.type !== "unanswered") return;

    const selectedAnswer = choices[selectedIndex];
    const correct = selectedAnswer === currentCard.correctEn;
    const correctIndex = choices.indexOf(currentCard.correctEn);

    const existingCard: CardProgress = progress.cards[currentCard.cardId] ?? {
      bucket: 0,
      nextDue: null,
      lastReviewed: null,
    };

    const newState = computeNewState(existingCard, correct, Date.now());

    // Update server (best effort — continue even if it fails)
    try {
      await fetch("/api/study/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: currentCard.cardId,
          ...newState,
        }),
      });
    } catch (err) {
      console.error("Failed to save progress:", err);
    }

    // Update local progress
    const newProgress = {
      ...progress,
      cards: { ...progress.cards, [currentCard.cardId]: newState },
    };
    setProgress(newProgress);

    if (correct) {
      setAnswerState({ type: "correct", selectedIndex });
      // Auto-advance after 400ms
      setTimeout(() => {
        presentCard(studyCards, newProgress);
      }, 400);
    } else {
      setAnswerState({ type: "wrong", selectedIndex, correctIndex });
    }
  }

  function handleNext() {
    presentCard(studyCards, progressRef.current);
  }

  // Compute bucket stats for progress indicator
  const bucketCounts = [0, 0, 0, 0, 0, 0];
  let dueCount = 0;
  const now = Date.now();
  for (const card of studyCards) {
    const cp = progress.cards[card.cardId];
    if (!cp || cp.bucket === 0) {
      bucketCounts[0]++;
      dueCount++;
    } else {
      bucketCounts[cp.bucket]++;
      if (cp.nextDue && now >= new Date(cp.nextDue).getTime()) {
        dueCount++;
      }
    }
  }

  if (loading) return <div className="study-center">読み込み中&hellip;</div>;
  if (error) return <div className="study-center study-error">Error: {error}</div>;

  if (studyCards.length === 0) {
    const totalOptions = questions.reduce((sum, q) => sum + q.options.length, 0);
    return (
      <div className="study-container">
        <div className="study-empty">
          <p>No study cards available.</p>
          <p className="study-empty-sub">
            {totalOptions} options found, but none have distractors yet.
            Generate them from the editor.
          </p>
          <Link to="/" className="study-back-link">Back to Editor</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="study-container">
      <header className="study-header">
        <Link to="/" className="study-back-link">Back to Editor</Link>
        <div className="study-progress">
          <span className="study-due">{dueCount} due</span>
          <span className="study-total">{studyCards.length} cards</span>
          <span className="study-buckets">
            {bucketCounts.map((count, i) => (
              <span key={i} className={`bucket-pip${count > 0 ? " active" : ""}`} title={`Bucket ${i}: ${count}`}>
                {count}
              </span>
            ))}
          </span>
        </div>
      </header>

      <main className="study-card-area">
        {currentCard ? (
          <>
            <div className="study-japanese">{currentCard.ja}</div>
            <div className="study-choices">
              {choices.map((choice, i) => {
                let btnClass = "study-choice-btn";
                if (answerState.type === "correct" && answerState.selectedIndex === i) {
                  btnClass += " correct";
                } else if (answerState.type === "wrong") {
                  if (answerState.selectedIndex === i) btnClass += " wrong";
                  if (answerState.correctIndex === i) btnClass += " correct";
                }
                return (
                  <button
                    key={i}
                    className={btnClass}
                    onClick={() => handleAnswer(i)}
                    disabled={answerState.type !== "unanswered"}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
            {answerState.type === "wrong" && (
              <button className="study-next-btn" onClick={handleNext}>
                Next
              </button>
            )}
          </>
        ) : waitMs !== null ? (
          <div className="study-waiting">
            <p>All caught up!</p>
            <p className="study-waiting-sub">
              Next card due in {formatWaitTime(waitMs)}
            </p>
            <Link to="/" className="study-back-link">Back to Editor</Link>
          </div>
        ) : (
          <div className="study-waiting">
            <p>No cards to review.</p>
            <Link to="/" className="study-back-link">Back to Editor</Link>
          </div>
        )}
      </main>
    </div>
  );
}
