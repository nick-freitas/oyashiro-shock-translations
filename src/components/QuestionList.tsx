import { useState } from "react";
import type { Question, TranslatedText } from "../types";
import "./QuestionList.css";

const KANJI_NUMS = [
  "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "二十一", "二十二", "二十三", "二十四",
];

const OPTION_LETTERS = ["A", "B", "C", "D"];

interface QuestionRowProps {
  question: Question;
  index: number;
  onSaved: (updated: Question) => void;
}

function QuestionRow({ question, index, onSaved }: QuestionRowProps) {
  const [edited, setEdited] = useState<Question>(question);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(edited) !== JSON.stringify(question);

  function updateQuestion(field: keyof TranslatedText, value: string) {
    setEdited((prev) => ({
      ...prev,
      question: { ...prev.question, [field]: value },
    }));
  }

  function setCorrectOption(index: number) {
    setEdited((prev) => ({ ...prev, correctOption: index }));
  }

  function updateOption(i: number, field: keyof TranslatedText, value: string) {
    setEdited((prev) => {
      const newOptions = [...prev.options] as Question["options"];
      newOptions[i] = { ...newOptions[i], [field]: value };
      return { ...prev, options: newOptions };
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/questions/${edited.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: edited.question,
          options: edited.options,
          correctOption: edited.correctOption,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="quiz-row">
      <div className="screenshot-col">
        <img
          src={`/screenshots/${encodeURIComponent(question.filename)}`}
          alt={question.question.en}
          className="screenshot-img"
          loading="lazy"
        />
      </div>

      <div className="question-col">
        <div className="question-number">
          {KANJI_NUMS[index] ?? String(index + 1)}
        </div>
        <input
          type="text"
          className={`inline-input input-ja${edited.question.ja !== question.question.ja ? " modified" : ""}`}
          value={edited.question.ja}
          onChange={(e) => updateQuestion("ja", e.target.value)}
        />
        <input
          type="text"
          className={`inline-input input-en${edited.question.en !== question.question.en ? " modified" : ""}`}
          value={edited.question.en}
          onChange={(e) => updateQuestion("en", e.target.value)}
        />
      </div>

      <div className="options-col">
        {edited.options.map((opt, oi) => (
          <div
            key={oi}
            className={`option-item${edited.correctOption === oi ? " correct" : ""}`}
          >
            <div className="option-input-row">
              <button
                className={`correct-toggle${edited.correctOption === oi ? " is-correct" : ""}`}
                onClick={() => setCorrectOption(oi)}
                title="Mark as correct answer"
                type="button"
              >
                {OPTION_LETTERS[oi]}
              </button>
              <input
                type="text"
                className={`inline-input input-ja option-input${opt.ja !== question.options[oi].ja ? " modified" : ""}`}
                value={opt.ja}
                onChange={(e) => updateOption(oi, "ja", e.target.value)}
              />
            </div>
            <input
              type="text"
              className={`inline-input input-en option-input${opt.en !== question.options[oi].en ? " modified" : ""}`}
              value={opt.en}
              onChange={(e) => updateOption(oi, "en", e.target.value)}
            />
          </div>
        ))}
      </div>

      {dirty && (
        <div className="row-actions">
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

interface QuestionListProps {
  questions: Question[];
  onQuestionSaved: (updated: Question) => void;
}

export function QuestionList({ questions, onQuestionSaved }: QuestionListProps) {
  return (
    <main>
      {questions.map((q, idx) => (
        <QuestionRow
          key={q.id}
          question={q}
          index={idx}
          onSaved={onQuestionSaved}
        />
      ))}
    </main>
  );
}
