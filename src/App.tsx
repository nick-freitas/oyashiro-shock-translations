import { useMemo, useState } from "react";
import type { Entry } from "./types";
import { entries } from "./data/entries";
import { useImportantMarks } from "./hooks/useImportantMarks";
import { ReferenceList } from "./components/ReferenceList";
import "./App.css";

const LEVELS = [...new Set(entries.map((e) => e.level))].sort((a, b) => a - b);

export default function App() {
  const [selectedLevel, setSelectedLevel] = useState(1);
  const { marks, toggle } = useImportantMarks();

  const filtered = useMemo(
    () => entries.filter((e: Entry) => e.level === selectedLevel),
    [selectedLevel]
  );

  return (
    <div className="app-layout">
      <div className="main-content">
        <ReferenceList
          entries={filtered}
          importantMarks={marks}
          onToggleImportant={toggle}
        />
      </div>

      <aside className="title-sidebar">
        <nav className="level-selector">
          {LEVELS.map((level) => (
            <button
              key={level}
              className={`level-btn${level === selectedLevel ? " active" : ""}`}
              onClick={() => setSelectedLevel(level)}
              type="button"
            >
              {level}
            </button>
          ))}
        </nav>

        <div className="sidebar-titles">
          <div className="sidebar-subtitle">新・クイズ・ショック</div>
          <div className="sidebar-title">おやしろさまショック</div>
        </div>

        <div className="sidebar-count">{filtered.length}</div>
      </aside>
    </div>
  );
}
