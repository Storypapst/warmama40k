import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BREATH_TIMING } from "../domain/constants";
import type { BreathPhase, BreathTimingConfig, InteractionMode } from "../domain/types";
import { useInteractionMode } from "./useInteractionMode";

interface BreathEngineConfig {
  timing?: BreathTimingConfig;
  forcedMode?: InteractionMode;
  onPhaseChange?: (phase: BreathPhase) => void;
}

interface BreathEngineResult {
  phase: BreathPhase;
  cycles: number;
  elapsedMs: number;
  phaseElapsedMs: number;
  phaseRemainingMs: number;
  mode: InteractionMode;
  canAdvanceDesktop: boolean;
  instruction: string;
  handleDesktopClick: () => void;
  handlePointerDown: () => void;
  handlePointerUp: () => void;
  handlePointerCancel: () => void;
}

export function useBreathEngine(config: BreathEngineConfig = {}): BreathEngineResult {
  const timing = config.timing ?? BREATH_TIMING;
  const mode = useInteractionMode(config.forcedMode);
  const [now, setNow] = useState(() => Date.now());
  const [sessionStartedAt] = useState(() => Date.now());
  const [phase, setPhase] = useState<BreathPhase>("IDLE");
  const [phaseStartedAt, setPhaseStartedAt] = useState<number | null>(null);
  const [phaseReadyAt, setPhaseReadyAt] = useState<number | null>(null);
  const [cycles, setCycles] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([50]);
    }
  }, []);

  const emitPhaseChange = useCallback(
    (nextPhase: BreathPhase) => {
      triggerHaptic();
      config.onPhaseChange?.(nextPhase);
    },
    [config, triggerHaptic]
  );

  const transitionTo = useCallback(
    (nextPhase: BreathPhase, durationMs?: number) => {
      const ts = Date.now();
      setPhase(nextPhase);
      setPhaseStartedAt(ts);
      setPhaseReadyAt(durationMs ? ts + durationMs : null);
      emitPhaseChange(nextPhase);
      setNow(ts);
    },
    [emitPhaseChange]
  );

  const resetToIdle = useCallback(() => {
    setPhase("IDLE");
    setPhaseStartedAt(null);
    setPhaseReadyAt(null);
    setIsHolding(false);
    emitPhaseChange("IDLE");
    setNow(Date.now());
  }, [emitPhaseChange]);

  const completeCycle = useCallback(() => {
    setCycles((prev) => prev + 1);
    resetToIdle();
  }, [resetToIdle]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setNow(Date.now());
    }, 100);

    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (phase === "GREEN" && phaseReadyAt && now >= phaseReadyAt) {
      completeCycle();
      return;
    }

    if (mode !== "MOBILE_HOLD") {
      return;
    }

    if (phase === "RED" && phaseStartedAt && now >= phaseStartedAt + timing.redMs) {
      if (isHolding) {
        transitionTo("YELLOW", timing.yellowMs);
      } else {
        resetToIdle();
      }
    }
  }, [
    completeCycle,
    isHolding,
    mode,
    now,
    phase,
    phaseReadyAt,
    phaseStartedAt,
    resetToIdle,
    timing.redMs,
    timing.yellowMs,
    transitionTo
  ]);

  const handlePointerDown = useCallback(() => {
    if (mode !== "MOBILE_HOLD") {
      return;
    }

    if (phaseRef.current !== "IDLE") {
      return;
    }

    setIsHolding(true);
    transitionTo("RED", timing.redMs);
  }, [mode, timing.redMs, transitionTo]);

  const handlePointerUp = useCallback(() => {
    if (mode !== "MOBILE_HOLD") {
      return;
    }

    setIsHolding(false);
    const ts = Date.now();

    if (phaseRef.current === "RED") {
      resetToIdle();
      return;
    }

    if (phaseRef.current === "YELLOW") {
      if (!phaseReadyAt || ts < phaseReadyAt) {
        resetToIdle();
        return;
      }

      transitionTo("GREEN", timing.greenMs);
    }
  }, [mode, phaseReadyAt, resetToIdle, timing.greenMs, transitionTo]);

  const handlePointerCancel = useCallback(() => {
    if (mode !== "MOBILE_HOLD") {
      return;
    }

    setIsHolding(false);
    if (phaseRef.current !== "IDLE") {
      resetToIdle();
    }
  }, [mode, resetToIdle]);

  const canAdvanceDesktop = useMemo(() => {
    if (mode !== "DESKTOP_CLICK") {
      return false;
    }

    if (phase === "IDLE") {
      return true;
    }

    if ((phase === "RED" || phase === "YELLOW") && phaseReadyAt) {
      return now >= phaseReadyAt;
    }

    return false;
  }, [mode, now, phase, phaseReadyAt]);

  const handleDesktopClick = useCallback(() => {
    if (mode !== "DESKTOP_CLICK") {
      return;
    }

    const ts = Date.now();

    if (phaseRef.current === "IDLE") {
      transitionTo("RED", timing.redMs);
      return;
    }

    if (phaseRef.current === "RED") {
      if (!phaseReadyAt || ts < phaseReadyAt) {
        return;
      }

      transitionTo("YELLOW", timing.yellowMs);
      return;
    }

    if (phaseRef.current === "YELLOW") {
      if (!phaseReadyAt || ts < phaseReadyAt) {
        return;
      }

      transitionTo("GREEN", timing.greenMs);
    }
  }, [mode, phaseReadyAt, timing.greenMs, timing.redMs, timing.yellowMs, transitionTo]);

  const phaseElapsedMs = phaseStartedAt ? Math.max(0, now - phaseStartedAt) : 0;
  const phaseRemainingMs = phaseReadyAt ? Math.max(0, phaseReadyAt - now) : 0;

  const instruction = useMemo(() => {
    if (mode === "MOBILE_HOLD") {
      if (phase === "IDLE") {
        return "Druecke und halte, um mit Einatmen zu starten.";
      }
      if (phase === "RED") {
        return "Halte weiter: Einatmen.";
      }
      if (phase === "YELLOW") {
        return phaseRemainingMs > 0
          ? "Halte weiter: Luft anhalten."
          : "Jetzt loslassen fuer Ausatmen.";
      }
      return "Ausatmen. Entspannen.";
    }

    if (phase === "IDLE") {
      return "Klicke, um Einatmen zu starten.";
    }

    if (phase === "RED") {
      return canAdvanceDesktop ? "Klicke fuer Haltephase." : "Einatmen.";
    }

    if (phase === "YELLOW") {
      return canAdvanceDesktop ? "Klicke fuer Ausatmen." : "Luft anhalten.";
    }

    return "Ausatmen. Naechster Zyklus startet danach.";
  }, [canAdvanceDesktop, mode, phase, phaseRemainingMs]);

  return {
    phase,
    cycles,
    elapsedMs: now - sessionStartedAt,
    phaseElapsedMs,
    phaseRemainingMs,
    mode,
    canAdvanceDesktop,
    instruction,
    handleDesktopClick,
    handlePointerDown,
    handlePointerUp,
    handlePointerCancel
  };
}
