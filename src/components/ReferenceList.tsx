import type { Entry } from "../types";
import "./ReferenceList.css";

interface EntryRowProps {
  entry: Entry;
  index: number;
  isImportant: boolean;
  onToggleImportant: () => void;
}

function EntryRow({
  entry,
  index,
  isImportant,
  onToggleImportant,
}: EntryRowProps) {
  return (
    <div className={`quiz-row${isImportant ? " important" : ""}`}>
      <div className="question-col">
        <div className="question-number">
          {entry.level} - {index + 1}
        </div>
        <div className="question-en">{entry.questionEn}</div>
        <div className="question-ja">{entry.questionJp}</div>
        <div className="question-romaji">{entry.questionRomaji}</div>
      </div>

      <div className="screenshot-col">
        <img
          src={`/${entry.questionImage}`}
          alt={entry.questionEn}
          className="screenshot-img"
          loading="lazy"
        />
      </div>

      <div className="correct-answer">
        <div className="option-item correct">
          <div className="option-en">{entry.correctAnswerEn}</div>
          <div className="option-ja">{entry.correctAnswerJp}</div>
          <div className="option-romaji">{entry.correctAnswerRomaji}</div>
        </div>
      </div>

      <div className="wrong-answers">
        {entry.wrongAnswersJp.map((wrongJp, i) => (
          <div key={i} className="option-item">
            <div className="option-en">{entry.wrongAnswersEn[i]}</div>
            <div className="option-ja">{wrongJp}</div>
            <div className="option-romaji">{entry.wrongAnswersRomaji[i]}</div>
          </div>
        ))}
      </div>

      <div className="row-actions">
        <button
          className={`important-btn${isImportant ? " active" : ""}`}
          onClick={onToggleImportant}
          title={isImportant ? "Remove important mark" : "Mark as important"}
          type="button"
        >
          ★
        </button>
      </div>
    </div>
  );
}

interface ReferenceListProps {
  entries: Entry[];
  importantMarks: Set<string>;
  onToggleImportant: (id: string) => void;
}

export function ReferenceList({
  entries,
  importantMarks,
  onToggleImportant,
}: ReferenceListProps) {
  return (
    <main>
      {entries.map((entry, idx) => (
        <EntryRow
          key={entry.id}
          entry={entry}
          index={idx}
          isImportant={importantMarks.has(entry.id)}
          onToggleImportant={() => onToggleImportant(entry.id)}
        />
      ))}
    </main>
  );
}
