import { useCallback, useEffect, useMemo, useState } from "react";
import { mockCounselorApi, type CounselorInquiry } from "./api/counselorApi";
import { BreathControls } from "./components/BreathControls";
import { BreathScene } from "./components/BreathScene";
import { CounselorPanel } from "./components/CounselorPanel";
import { MenuBar } from "./components/MenuBar";
import type { SessionMode } from "./domain/types";
import { useBreathEngine } from "./hooks/useBreathEngine";
import { useDeepSound } from "./hooks/useDeepSound";
import { useSceneProgress } from "./hooks/useSceneProgress";

export default function App() {
  const [sessionMode, setSessionMode] = useState<SessionMode>("WAITING");
  const [queue, setQueue] = useState<number>(8);
  const [deepSoundEnabled, setDeepSoundEnabled] = useState(false);
  const [pendingInquiry, setPendingInquiry] = useState<CounselorInquiry | null>(null);

  const breath = useBreathEngine();
  const stage = useSceneProgress({ cycles: breath.cycles, elapsedMs: breath.elapsedMs });
  const deepSound = useDeepSound({ enabled: deepSoundEnabled, phase: breath.phase });

  const isZenAvailable = Boolean(pendingInquiry);

  useEffect(() => {
    let mounted = true;

    const updateQueue = async () => {
      const estimated = await mockCounselorApi.getQueueEstimate();
      if (mounted) {
        setQueue(estimated);
      }
    };

    void updateQueue();
    const interval = window.setInterval(() => {
      void updateQueue();
    }, 15_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (breath.cycles === 0) {
      return;
    }

    setQueue((prev) => Math.max(0, prev - 1));
  }, [breath.cycles]);

  const onSelectMode = useCallback(
    (next: SessionMode) => {
      if (next === "ZEN" && !isZenAvailable) {
        return;
      }
      setSessionMode(next);
    },
    [isZenAvailable]
  );

  const panel = useMemo(() => {
    if (sessionMode === "COUNSELOR_FORM") {
      return (
        <CounselorPanel
          api={mockCounselorApi}
          onSubmitted={(result) => {
            setPendingInquiry(result);
            setSessionMode("REQUEST_SENT");
          }}
        />
      );
    }

    if (sessionMode === "REQUEST_SENT") {
      return (
        <section className="panel" aria-label="Anfrage bestaetigt">
          <h2>Request Sent</h2>
          <p className="success">
            Deine Anfrage wurde gesendet ({pendingInquiry?.requestId ?? "REQ"}). Bleib im Atemfluss waehrend du wartest.
          </p>
          <button type="button" onClick={() => setSessionMode("ZEN")}>
            Continue Breathing
          </button>
        </section>
      );
    }

    return null;
  }, [pendingInquiry?.requestId, sessionMode]);

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <p className="kicker">Waiting Room Visualization</p>
          <h1>Breath Flow</h1>
        </div>
        <button
          type="button"
          className={deepSoundEnabled ? "sound-toggle active" : "sound-toggle"}
          onClick={async () => {
            await deepSound.unlockAudio();
            setDeepSoundEnabled((prev) => !prev);
          }}
          disabled={!deepSound.isSupported}
        >
          {deepSoundEnabled ? "Deep Sound: ON" : "Deep Sound: OFF"}
        </button>
      </header>

      <MenuBar mode={sessionMode} canOpenZen={isZenAvailable} onSelectMode={onSelectMode} />

      <section className="experience-card">
        <div className="status-ribbon" aria-label="Sessionstatus">
          <span>{breath.mode === "MOBILE_HOLD" ? "Mobile Hold" : "Desktop Click"}</span>
          <span>Phase: {breath.phase}</span>
          <span>{sessionMode === "ZEN" ? "Zen Session" : `Queue: ${queue}`}</span>
        </div>

        <BreathScene phase={breath.phase} stage={stage} cycles={breath.cycles} />

        <BreathControls
          mode={breath.mode}
          phase={breath.phase}
          instruction={breath.instruction}
          canAdvanceDesktop={breath.canAdvanceDesktop}
          onDesktopClick={breath.handleDesktopClick}
          onPointerDown={breath.handlePointerDown}
          onPointerUp={breath.handlePointerUp}
          onPointerCancel={breath.handlePointerCancel}
          onUserGesture={() => {
            void deepSound.unlockAudio();
          }}
        />
      </section>

      {sessionMode !== "ZEN" ? (
        <footer className="queue-bar">
          <p>Queue: {queue} people ahead</p>
          <button type="button" onClick={() => setSessionMode("COUNSELOR_FORM")}>
            Find Local Counselor
          </button>
        </footer>
      ) : (
        <footer className="queue-bar zen">Zen Mode aktiv. Atme weiter in deinem Tempo.</footer>
      )}

      {panel}
    </main>
  );
}
