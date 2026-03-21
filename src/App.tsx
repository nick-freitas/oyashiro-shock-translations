import { useCallback, useMemo, useRef, useState } from "react";
import type { Entry } from "./types";
import { entries } from "./data/entries";
import { useImportantMarks } from "./hooks/useImportantMarks";
import { ReferenceList } from "./components/ReferenceList";
import { SectionTabs } from "./components/SectionTabs";
import "./App.css";

const LEVELS = [...new Set(entries.map((e) => e.level))].sort((a, b) => a - b);

export default function App() {
  const [selectedLevel, setSelectedLevel] = useState(1);
  const { marks, toggle } = useImportantMarks();
  const mainRef = useRef<HTMLDivElement>(null);

  const handleSelectLevel = useCallback((level: number) => {
    setSelectedLevel(level);
    mainRef.current?.scrollTo(0, 0);
  }, []);

  const filtered = useMemo(
    () => entries.filter((e: Entry) => e.level === selectedLevel),
    [selectedLevel]
  );

  return (
    <div className="app-layout">
      <div className="main-content" ref={mainRef}>
        <ReferenceList
          entries={filtered}
          importantMarks={marks}
          onToggleImportant={toggle}
        />
      </div>

      <SectionTabs
        levels={LEVELS}
        selectedLevel={selectedLevel}
        onSelectLevel={handleSelectLevel}
      />

      <aside className="title-sidebar">
        <div className="sidebar-titles">
          <div className="sidebar-subtitle">新・クイズ・ショック</div>
          <div className="sidebar-title">おやしろさまショック</div>
        </div>
      </aside>
    </div>
  );
}
