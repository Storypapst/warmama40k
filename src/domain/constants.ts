import type { BreathTimingConfig } from "./types";

export const BREATH_TIMING: BreathTimingConfig = {
  redMs: 4_000,
  yellowMs: 4_000,
  greenMs: 6_000
};

export const STAGE_THRESHOLDS = {
  cabinCycles: 2,
  cabinMs: 90_000,
  flowCycles: 5,
  flowMs: 210_000
} as const;
