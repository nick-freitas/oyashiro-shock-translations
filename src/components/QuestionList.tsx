import type { Question } from "../types";
import "./QuestionList.css";

interface QuestionListProps {
  questions: Question[];
  onSelect: (question: Question) => void;
}

export function QuestionList({ questions, onSelect }: QuestionListProps) {
  return (
    <div className="question-list">
      <h1>Quiz: Shin Oyashiro Shock!</h1>
      <p className="subtitle">{questions.length} questions</p>
      <div className="question-grid">
        {questions.map((q) => (
          <button
            key={q.id}
            className="question-item"
            onClick={() => onSelect(q)}
          >
            <img
              src={`/screenshots/${encodeURIComponent(q.filename)}`}
              alt={q.question.en}
              className="question-thumbnail"
              loading="lazy"
            />
            <div className="question-text">
              <p className="question-ja">{q.question.ja}</p>
              <p className="question-en">{q.question.en}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
