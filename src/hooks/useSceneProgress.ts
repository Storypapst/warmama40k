import { useMemo } from "react";
import { STAGE_THRESHOLDS } from "../domain/constants";
import type { CameraStage } from "../domain/types";

interface SceneProgressInput {
  cycles: number;
  elapsedMs: number;
}

export function useSceneProgress({ cycles, elapsedMs }: SceneProgressInput): CameraStage {
  return useMemo(() => {
    if (cycles >= STAGE_THRESHOLDS.flowCycles || elapsedMs >= STAGE_THRESHOLDS.flowMs) {
      return "FLOW";
    }

    if (cycles >= STAGE_THRESHOLDS.cabinCycles || elapsedMs >= STAGE_THRESHOLDS.cabinMs) {
      return "CABIN";
    }

    return "LIGHT";
  }, [cycles, elapsedMs]);
}
