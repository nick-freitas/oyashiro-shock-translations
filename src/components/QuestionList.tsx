import { useCallback, useRef, useState } from "react";
import type { Question, TranslatedText } from "../types";
import { parseRuby } from "../utils/parseRuby";
import "./QuestionList.css";

function useAutoResize() {
  const resize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);
  return resize;
}

function AutoTextarea({
  className,
  value,
  onChange,
}: {
  className: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  const resize = useAutoResize();
  const ref = useRef<HTMLTextAreaElement | null>(null);

  return (
    <textarea
      ref={(el) => {
        ref.current = el;
        resize(el);
      }}
      className={className}
      value={value}
      rows={1}
      onChange={(e) => {
        onChange(e);
        resize(e.target);
      }}
    />
  );
}

const KANJI_NUMS = [
  "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "二十一", "二十二", "二十三", "二十四",
];

const OPTION_COUNTERS = ["一", "二", "三", "四"];

interface QuestionRowProps {
  question: Question;
  index: number;
  onSaved: (updated: Question) => void;
  onDeleted: (id: number) => void;
}

function QuestionRow({ question, index, onSaved, onDeleted }: QuestionRowProps) {
  const [edited, setEdited] = useState<Question>(question);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(edited) !== JSON.stringify(question);

  function updateQuestion(field: keyof TranslatedText, value: string) {
    setEdited((prev) => ({
      ...prev,
      question: { ...prev.question, [field]: value },
    }));
  }

  async function setCorrectOption(optionIndex: number) {
    setEdited((prev) => ({ ...prev, correctOption: optionIndex }));
    try {
      const res = await fetch(`/api/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correctOption: optionIndex }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      onSaved(updated);
    } catch (err) {
      console.error("Save correct answer failed:", err);
    }
  }

  function updateOption(i: number, field: keyof TranslatedText, value: string) {
    setEdited((prev) => {
      const newOptions = [...prev.options] as Question["options"];
      newOptions[i] = { ...newOptions[i], [field]: value };
      return { ...prev, options: newOptions };
    });
  }

  async function handleDelete() {
    if (!confirm("Delete this question and its screenshot?")) return;
    try {
      const res = await fetch(`/api/questions/${question.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onDeleted(question.id);
    } catch (err) {
      console.error("Delete failed:", err);
    }
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
    } catch (err) {
      console.error("Save failed:", err);
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
        <AutoTextarea
          className={`inline-input input-ja${edited.question.ja !== question.question.ja ? " modified" : ""}`}
          value={edited.question.ja}
          onChange={(e) => updateQuestion("ja", e.target.value)}
        />
        <div className="ruby-preview">{parseRuby(edited.question.ja)}</div>
        <AutoTextarea
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
                {OPTION_COUNTERS[oi]}
              </button>
              <AutoTextarea
                className={`inline-input input-ja option-input${opt.ja !== question.options[oi].ja ? " modified" : ""}`}
                value={opt.ja}
                onChange={(e) => updateOption(oi, "ja", e.target.value)}
              />
            </div>
            <div className="ruby-preview ruby-preview-option">{parseRuby(opt.ja)}</div>
            <AutoTextarea
              className={`inline-input input-en option-input${opt.en !== question.options[oi].en ? " modified" : ""}`}
              value={opt.en}
              onChange={(e) => updateOption(oi, "en", e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="row-actions">
        {dirty && (
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        )}
        <button className="delete-btn" onClick={handleDelete} title="Delete question" type="button">
          ✕
        </button>
      </div>
    </div>
  );
}

interface QuestionListProps {
  questions: Question[];
  onQuestionSaved: (updated: Question) => void;
  onQuestionDeleted: (id: number) => void;
}

export function QuestionList({ questions, onQuestionSaved, onQuestionDeleted }: QuestionListProps) {
  return (
    <main>
      {questions.map((q, idx) => (
        <QuestionRow
          key={q.id}
          question={q}
          index={idx}
          onSaved={onQuestionSaved}
          onDeleted={onQuestionDeleted}
        />
      ))}
    </main>
  );
}
