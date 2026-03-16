import { useCallback, useEffect, useRef, useState } from "react";
import type { BreathPhase } from "../domain/types";

interface DeepSoundNodes {
  context: AudioContext;
  gain: GainNode;
  filter: BiquadFilterNode;
  oscA: OscillatorNode;
  oscB: OscillatorNode;
}

interface DeepSoundConfig {
  enabled: boolean;
  phase: BreathPhase;
}

const phaseMap: Record<BreathPhase, { gain: number; filterHz: number }> = {
  IDLE: { gain: 0, filterHz: 180 },
  RED: { gain: 0.06, filterHz: 95 },
  YELLOW: { gain: 0.04, filterHz: 150 },
  GREEN: { gain: 0.025, filterHz: 220 }
};

export function useDeepSound({ enabled, phase }: DeepSoundConfig) {
  const nodesRef = useRef<DeepSoundNodes | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSupported] = useState(
    () => typeof window !== "undefined" && ("AudioContext" in window || "webkitAudioContext" in window)
  );

  const ensureNodes = useCallback(() => {
    if (!isSupported) {
      return null;
    }

    if (nodesRef.current) {
      return nodesRef.current;
    }

    const AudioCtx = (window.AudioContext ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitAudioContext) as typeof AudioContext;
    const context = new AudioCtx();
    const gain = context.createGain();
    gain.gain.value = 0;

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 180;

    const oscA = context.createOscillator();
    oscA.type = "sine";
    oscA.frequency.value = 48;

    const oscB = context.createOscillator();
    oscB.type = "triangle";
    oscB.frequency.value = 55;

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    oscA.start();
    oscB.start();

    nodesRef.current = { context, gain, filter, oscA, oscB };
    return nodesRef.current;
  }, [isSupported]);

  const unlockAudio = useCallback(async () => {
    const nodes = ensureNodes();
    if (!nodes) {
      return;
    }

    if (nodes.context.state !== "running") {
      await nodes.context.resume();
    }

    setIsUnlocked(true);
  }, [ensureNodes]);

  useEffect(() => {
    const nodes = nodesRef.current;
    if (!nodes) {
      return;
    }

    const now = nodes.context.currentTime;
    const target = enabled ? phaseMap[phase] : phaseMap.IDLE;

    nodes.filter.frequency.cancelScheduledValues(now);
    nodes.filter.frequency.linearRampToValueAtTime(target.filterHz, now + 0.35);

    nodes.gain.gain.cancelScheduledValues(now);
    nodes.gain.gain.linearRampToValueAtTime(target.gain, now + 0.35);
  }, [enabled, phase]);

  useEffect(() => {
    return () => {
      const nodes = nodesRef.current;
      if (!nodes) {
        return;
      }

      nodes.oscA.stop();
      nodes.oscB.stop();
      void nodes.context.close();
      nodesRef.current = null;
    };
  }, []);

  return {
    isSupported,
    isUnlocked,
    unlockAudio
  };
}
