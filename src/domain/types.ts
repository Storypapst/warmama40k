export type BreathPhase = "IDLE" | "RED" | "YELLOW" | "GREEN";

export type InteractionMode = "MOBILE_HOLD" | "DESKTOP_CLICK";

export type CameraStage = "LIGHT" | "CABIN" | "FLOW";

export type SessionMode = "WAITING" | "COUNSELOR_FORM" | "REQUEST_SENT" | "ZEN";

export interface BreathTimingConfig {
  redMs: number;
  yellowMs: number;
  greenMs: number;
}
