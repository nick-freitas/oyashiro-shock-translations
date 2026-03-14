import { useState } from "react";
import { Question, TranslatedText } from "../types";
import "./QuestionCard.css";

interface QuestionCardProps {
  question: Question;
  onBack: () => void;
  onSave: (updated: Question) => void;
}

export function QuestionCard({ question, onBack, onSave }: QuestionCardProps) {
  const [edited, setEdited] = useState<Question>(question);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function updateQuestion(field: keyof TranslatedText, value: string) {
    setEdited((prev) => ({
      ...prev,
      question: { ...prev.question, [field]: value },
    }));
    setDirty(true);
  }

  function updateOption(
    index: number,
    field: keyof TranslatedText,
    value: string
  ) {
    setEdited((prev) => {
      const newOptions = [...prev.options] as Question["options"];
      newOptions[index] = { ...newOptions[index], [field]: value };
      return { ...prev, options: newOptions };
    });
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(edited);
      setDirty(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="question-card">
      <div className="card-header">
        <button className="back-button" onClick={onBack}>
          &larr; Back
        </button>
        <button
          className="save-button"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {saveError && <p className="save-error">{saveError}</p>}

      <img
        src={`/screenshots/${encodeURIComponent(question.filename)}`}
        alt={question.question.en}
        className="card-image"
      />

      <div className="card-fields">
        <section className="field-group">
          <h2>Question</h2>
          <label>
            <span className="field-label">Japanese</span>
            <input
              type="text"
              value={edited.question.ja}
              onChange={(e) => updateQuestion("ja", e.target.value)}
              className={
                edited.question.ja !== question.question.ja ? "modified" : ""
              }
            />
          </label>
          <label>
            <span className="field-label">English</span>
            <input
              type="text"
              value={edited.question.en}
              onChange={(e) => updateQuestion("en", e.target.value)}
              className={
                edited.question.en !== question.question.en ? "modified" : ""
              }
            />
          </label>
        </section>

        {edited.options.map((opt, i) => (
          <section key={i} className="field-group">
            <h3>Option {i + 1}</h3>
            <label>
              <span className="field-label">Japanese</span>
              <input
                type="text"
                value={opt.ja}
                onChange={(e) => updateOption(i, "ja", e.target.value)}
                className={
                  opt.ja !== question.options[i].ja ? "modified" : ""
                }
              />
            </label>
            <label>
              <span className="field-label">English</span>
              <input
                type="text"
                value={opt.en}
                onChange={(e) => updateOption(i, "en", e.target.value)}
                className={
                  opt.en !== question.options[i].en ? "modified" : ""
                }
              />
            </label>
          </section>
        ))}
      </div>
    </div>
  );
}
