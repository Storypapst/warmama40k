import { motion, useReducedMotion } from "framer-motion";
import type { BreathPhase, CameraStage } from "../domain/types";

interface BreathSceneProps {
  phase: BreathPhase;
  stage: CameraStage;
  cycles: number;
}

const stageTransforms: Record<CameraStage, { scale: number; x: number; y: number }> = {
  LIGHT: { scale: 2.8, x: -920, y: -1220 },
  CABIN: { scale: 1.55, x: -300, y: -420 },
  FLOW: { scale: 1, x: 0, y: 0 }
};

const phaseColor: Record<BreathPhase, string> = {
  IDLE: "transparent",
  RED: "#de3131",
  YELLOW: "#d8b322",
  GREEN: "#14914a"
};

const phasePulse: Record<BreathPhase, { scale: number; opacity: number }> = {
  IDLE: { scale: 1, opacity: 0.08 },
  RED: { scale: 1.22, opacity: 0.3 },
  YELLOW: { scale: 1.12, opacity: 0.18 },
  GREEN: { scale: 0.92, opacity: 0.22 }
};

const stageCopy: Record<CameraStage, { eyebrow: string; title: string; body: string }> = {
  LIGHT: {
    eyebrow: "Stage 1",
    title: "Nur die Ampel und dein Atem.",
    body: "Der Fokus bleibt eng. Ein Signal, ein Rhythmus, ein naechster Atemzug."
  },
  CABIN: {
    eyebrow: "Stage 2",
    title: "Der Raum oeffnet sich.",
    body: "Armaturen, Windschutzscheibe, Horizont. Du sitzt noch im selben Moment, aber mit mehr Weite."
  },
  FLOW: {
    eyebrow: "Stage 3",
    title: "Du bist Teil eines groesseren Flusses.",
    body: "Andere Fahrzeuge, andere Wartende. Die Schlange bewegt sich gemeinsam, ruhig und stetig."
  }
};

const trafficCars = [
  { x: 455, y: 160, width: 92, height: 144, roof: 28, delay: 0 },
  { x: 332, y: 118, width: 76, height: 116, roof: 22, delay: 0.12 },
  { x: 592, y: 114, width: 76, height: 116, roof: 22, delay: 0.22 },
  { x: 250, y: 72, width: 64, height: 98, roof: 19, delay: 0.34 },
  { x: 688, y: 74, width: 64, height: 98, roof: 19, delay: 0.44 },
  { x: 202, y: 22, width: 54, height: 86, roof: 16, delay: 0.56 },
  { x: 744, y: 20, width: 54, height: 86, roof: 16, delay: 0.68 }
];

export function BreathScene({ phase, stage, cycles }: BreathSceneProps) {
  const reducedMotion = useReducedMotion();
  const camera = stageTransforms[stage];
  const pulse = phasePulse[phase];
  const copy = stageCopy[stage];

  return (
    <section className="scene-shell" aria-label="Atemvisualisierung">
      <div className="scene-copy">
        <p className="scene-eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
      </div>

      <div className="scene-wrapper">
        <motion.svg
          viewBox="0 0 1000 1000"
          className="scene-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="sceneGlow" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
              <stop offset="100%" stopColor="rgba(236,232,220,0)" />
            </radialGradient>
            <linearGradient id="skyFade" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#fbf9f1" />
              <stop offset="100%" stopColor="#efebdf" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="1000" height="1000" className="bg-panel" />
          <rect x="0" y="0" width="1000" height="440" fill="url(#skyFade)" />
          <circle cx="500" cy="350" r="330" fill="url(#sceneGlow)" opacity="0.7" />

          <g className="ambient-lines">
            <path d="M90 258 C220 194, 390 198, 498 256" />
            <path d="M130 220 C254 170, 410 174, 534 228" />
            <path d="M630 238 C736 186, 842 184, 910 230" />
            <path d="M112 615 C286 566, 714 566, 888 615" />
          </g>

          <motion.g
            animate={camera}
            transition={{
              duration: reducedMotion ? 0.01 : 2.8,
              ease: "easeInOut"
            }}
            style={{ transformOrigin: "500px 500px" }}
          >
            <g className="road-grid">
              <path d="M320 1000 L470 0" />
              <path d="M680 1000 L530 0" />
              <path d="M410 1000 L492 0" />
              <path d="M590 1000 L508 0" />
              <path d="M0 610 L1000 610" />
              <path d="M0 465 L1000 465" />
              <path d="M0 356 L1000 356" />
            </g>

            <motion.g
              className="flow-layer"
              animate={{ opacity: stage === "LIGHT" ? 0.12 : stage === "CABIN" ? 0.42 : 0.9 }}
              transition={{ duration: reducedMotion ? 0.01 : 1.6 }}
            >
              {trafficCars.map((car) => (
                <motion.g
                  key={`${car.x}-${car.y}`}
                  className="traffic-car"
                  animate={{
                    y: phase === "GREEN" && stage === "FLOW" ? [0, -6, 0] : 0
                  }}
                  transition={{
                    duration: reducedMotion ? 0.01 : 4.4,
                    ease: "easeInOut",
                    repeat: phase === "GREEN" && stage === "FLOW" ? Number.POSITIVE_INFINITY : 0,
                    delay: car.delay
                  }}
                >
                  <rect x={car.x} y={car.y} width={car.width} height={car.height} rx="20" />
                  <path
                    d={`M ${car.x + 16} ${car.y + 32} Q ${car.x + car.width / 2} ${car.y + 6} ${car.x + car.width - 16} ${car.y + 32}`}
                  />
                  <line x1={car.x + 18} y1={car.y + car.height - 24} x2={car.x + car.width - 18} y2={car.y + car.height - 24} />
                  <circle cx={car.x + 18} cy={car.y + car.height - 14} r="4" />
                  <circle cx={car.x + car.width - 18} cy={car.y + car.height - 14} r="4" />
                  <path
                    d={`M ${car.x + 12} ${car.y + 48} L ${car.x + car.width - 12} ${car.y + 48}`}
                  />
                </motion.g>
              ))}
            </motion.g>

            <motion.g
              className="cabin-layer"
              animate={{ opacity: stage === "LIGHT" ? 0.08 : 1 }}
              transition={{ duration: reducedMotion ? 0.01 : 1.3 }}
            >
              <path d="M60 635 C202 530, 372 482, 500 472 C628 482, 798 530, 940 635" />
              <path d="M180 828 C292 740, 708 740, 820 828" />
              <path d="M198 904 C334 846, 666 846, 802 904" />
              <circle cx="500" cy="805" r="126" />
              <circle cx="500" cy="805" r="62" />
              <line x1="500" y1="742" x2="500" y2="868" />
              <path d="M374 716 C414 690, 586 690, 626 716" />
              <path d="M186 564 L328 444" />
              <path d="M814 564 L672 444" />
              <path d="M100 615 C238 546, 388 514, 500 508 C612 514, 762 546, 900 615" />
            </motion.g>

            <g className="light-column">
              <line x1="500" y1="452" x2="500" y2="685" />
              <rect x="435" y="186" width="130" height="298" rx="22" />
              <path d="M451 206 L549 206" />
              <motion.circle
                cx="500"
                cy="282"
                r="68"
                className="light-breath-pulse"
                animate={{ scale: pulse.scale, opacity: pulse.opacity }}
                transition={{ duration: reducedMotion ? 0.01 : 1.1, ease: "easeInOut" }}
                fill={phase === "IDLE" ? "#ffffff" : phaseColor[phase]}
              />
              <circle
                cx="500"
                cy="266"
                r="28"
                className={phase === "RED" ? "light-active" : "light-idle"}
                fill={phaseColor.RED}
                style={{ color: phaseColor.RED }}
              />
              <circle
                cx="500"
                cy="335"
                r="28"
                className={phase === "YELLOW" ? "light-active" : "light-idle"}
                fill={phaseColor.YELLOW}
                style={{ color: phaseColor.YELLOW }}
              />
              <circle
                cx="500"
                cy="404"
                r="28"
                className={phase === "GREEN" ? "light-active" : "light-idle"}
                fill={phaseColor.GREEN}
                style={{ color: phaseColor.GREEN }}
              />
            </g>
          </motion.g>
        </motion.svg>

        <div className="scene-overlay">
          <div className="scene-stat">
            <span className="scene-stat-label">Stage</span>
            <strong>{stage}</strong>
          </div>
          <div className="scene-stat">
            <span className="scene-stat-label">Zyklen</span>
            <strong>{cycles}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
