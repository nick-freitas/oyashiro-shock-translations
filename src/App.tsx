import { useCallback, useMemo, useRef, useState } from "react";
import type { Entry } from "./types";
import { entries } from "./data/entries";
import { useImportantMarks } from "./hooks/useImportantMarks";
import { ReferenceList } from "./components/ReferenceList";
import { SectionTabs } from "./components/SectionTabs";
import type { StarFilter } from "./components/SectionTabs";
import "./App.css";

const LEVELS = [...new Set(entries.map((e) => e.level))].sort((a, b) => a - b);

export default function App() {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [starFilter, setStarFilter] = useState<StarFilter>("all");
  const { marks, toggle } = useImportantMarks();
  const mainRef = useRef<HTMLDivElement>(null);

  const handleSelectLevel = useCallback((level: number | null) => {
    setSelectedLevel(level);
    mainRef.current?.scrollTo(0, 0);
  }, []);

  const CYCLE: StarFilter[] = ["all", "important", "unimportant"];
  const handleToggleStarFilter = useCallback(() => {
    setStarFilter((prev) => CYCLE[(CYCLE.indexOf(prev) + 1) % CYCLE.length]);
  }, []);

  const filtered = useMemo(() => {
    const byLevel = selectedLevel === null ? entries.filter((e: Entry) => e.level !== 0) : entries.filter((e: Entry) => e.level === selectedLevel);
    if (starFilter === "all") return byLevel;
    if (starFilter === "important") return byLevel.filter((e) => marks.has(e.id));
    return byLevel.filter((e) => !marks.has(e.id));
  }, [selectedLevel, starFilter, marks]);

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
        starFilter={starFilter}
        onToggleStarFilter={handleToggleStarFilter}
      />

      <aside className="title-sidebar">
        <div className="sidebar-titles">
          <div className="sidebar-subtitle">新・クイズ・ショック</div>
          <div className="sidebar-title">おやしろさまショック</div>
        </div>
        <span className="sidebar-count">{filtered.length}</span>
      </aside>
    </div>
  );
}
