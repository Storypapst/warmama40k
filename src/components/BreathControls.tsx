import type { BreathPhase, InteractionMode } from "../domain/types";

interface BreathControlsProps {
  mode: InteractionMode;
  phase: BreathPhase;
  instruction: string;
  canAdvanceDesktop: boolean;
  onDesktopClick: () => void;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onUserGesture: () => void;
}

export function BreathControls({
  mode,
  phase,
  instruction,
  canAdvanceDesktop,
  onDesktopClick,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onUserGesture
}: BreathControlsProps) {
  return (
    <section className="controls" aria-label="Atemsteuerung">
      <p className="instruction">{instruction}</p>
      {mode === "MOBILE_HOLD" ? (
        <button
          type="button"
          className="hold-pad"
          aria-label="Zum Atmen gedrueckt halten"
          onPointerDown={() => {
            onUserGesture();
            onPointerDown();
          }}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={onPointerCancel}
        >
          {phase === "IDLE" ? "Halten" : "Halte..."}
        </button>
      ) : (
        <button
          type="button"
          className="advance-button"
          onClick={() => {
            onUserGesture();
            onDesktopClick();
          }}
          disabled={!canAdvanceDesktop}
        >
          {phase === "IDLE" ? "Start" : "Naechste Phase"}
        </button>
      )}
    </section>
  );
}
