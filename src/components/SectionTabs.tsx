import "./SectionTabs.css";

export type StarFilter = "all" | "important" | "unimportant";

interface SectionTabsProps {
  levels: number[];
  selectedLevel: number | null;
  onSelectLevel: (level: number | null) => void;
  starFilter: StarFilter;
  onToggleStarFilter: () => void;
}

const STAR_ICONS: Record<StarFilter, string> = {
  all: "◐",
  important: "★",
  unimportant: "☆",
};

export function SectionTabs({ levels, selectedLevel, onSelectLevel, starFilter, onToggleStarFilter }: SectionTabsProps) {
  return (
    <nav className="section-tabs">
      <button
        className={`section-tab${selectedLevel === null ? " active" : ""}`}
        onClick={() => onSelectLevel(null)}
        type="button"
      >
        A
      </button>
      <hr className="tab-divider" />
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
      <button
        className={`section-tab star-filter${starFilter !== "all" ? " active" : ""}`}
        onClick={onToggleStarFilter}
        title={starFilter === "all" ? "Showing all" : starFilter === "important" ? "Showing starred only" : "Showing unstarred only"}
        type="button"
      >
        {STAR_ICONS[starFilter]}
      </button>
    </nav>
  );
}
