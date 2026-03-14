import { useEffect, useState } from "react";
import type { InteractionMode } from "../domain/types";

function computeMode(): InteractionMode {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "DESKTOP_CLICK";
  }

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const touchPoints = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
  return coarse || touchPoints ? "MOBILE_HOLD" : "DESKTOP_CLICK";
}

export function useInteractionMode(forcedMode?: InteractionMode): InteractionMode {
  const [mode, setMode] = useState<InteractionMode>(forcedMode ?? computeMode());

  useEffect(() => {
    if (forcedMode) {
      setMode(forcedMode);
      return;
    }

    const media = window.matchMedia("(pointer: coarse)");
    const onChange = () => setMode(computeMode());
    media.addEventListener("change", onChange);
    window.addEventListener("resize", onChange);

    return () => {
      media.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, [forcedMode]);

  return mode;
}
