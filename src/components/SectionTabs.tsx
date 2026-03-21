import "./SectionTabs.css";

export type StarFilter = "all" | "important" | "unimportant";

interface SectionTabsProps {
  levels: number[];
  selectedLevel: number;
  onSelectLevel: (level: number) => void;
  starFilter: StarFilter;
  onToggleStarFilter: () => void;
}

const STAR_ICONS: Record<StarFilter, string> = {
  all: "⯪",
  important: "★",
  unimportant: "☆",
};

export function SectionTabs({ levels, selectedLevel, onSelectLevel, starFilter, onToggleStarFilter }: SectionTabsProps) {
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
