import "./SectionTabs.css";

interface SectionTabsProps {
  levels: number[];
  selectedLevel: number;
  onSelectLevel: (level: number) => void;
}

export function SectionTabs({ levels, selectedLevel, onSelectLevel }: SectionTabsProps) {
  return (
    <nav className="section-tabs">
      {levels.map((level) => (
        <button
          key={level}
          className={`section-tab${level === selectedLevel ? " active" : ""}`}
          onClick={() => onSelectLevel(level)}
          type="button"
        >
          {level}
        </button>
      ))}
    </nav>
  );
}
