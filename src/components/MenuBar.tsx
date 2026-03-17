import type { SessionMode } from "../domain/types";

interface MenuBarProps {
  mode: SessionMode;
  canOpenZen: boolean;
  onSelectMode: (next: SessionMode) => void;
}

export function MenuBar({ mode, canOpenZen, onSelectMode }: MenuBarProps) {
  return (
    <nav className="menu-bar" aria-label="Bereiche">
      <button
        type="button"
        className={mode === "WAITING" ? "menu-item active" : "menu-item"}
        onClick={() => onSelectMode("WAITING")}
      >
        Warteraum
      </button>
      <button
        type="button"
        className={mode === "COUNSELOR_FORM" ? "menu-item active" : "menu-item"}
        onClick={() => onSelectMode("COUNSELOR_FORM")}
      >
        Berater finden
      </button>
      <button
        type="button"
        className={mode === "ZEN" ? "menu-item active" : "menu-item"}
        onClick={() => canOpenZen && onSelectMode("ZEN")}
        disabled={!canOpenZen}
      >
        Zen Mode
      </button>
    </nav>
  );
}
