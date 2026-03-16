import { act, renderHook } from "@testing-library/react";
import { useBreathEngine } from "./useBreathEngine";

describe("useBreathEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("completes a full mobile hold cycle", () => {
    const { result } = renderHook(() => useBreathEngine({ forcedMode: "MOBILE_HOLD" }));

    act(() => {
      result.current.handlePointerDown();
    });
    expect(result.current.phase).toBe("RED");

    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(result.current.phase).toBe("YELLOW");

    act(() => {
      vi.advanceTimersByTime(4_100);
      result.current.handlePointerUp();
    });
    expect(result.current.phase).toBe("GREEN");

    act(() => {
      vi.advanceTimersByTime(6_000);
    });

    expect(result.current.phase).toBe("IDLE");
    expect(result.current.cycles).toBe(1);
  });

  it("resets mobile cycle when user releases too early", () => {
    const { result } = renderHook(() => useBreathEngine({ forcedMode: "MOBILE_HOLD" }));

    act(() => {
      result.current.handlePointerDown();
      vi.advanceTimersByTime(2_000);
      result.current.handlePointerUp();
    });

    expect(result.current.phase).toBe("IDLE");
    expect(result.current.cycles).toBe(0);
  });

  it("requires desktop minimum dwell before phase advance", () => {
    const { result } = renderHook(() => useBreathEngine({ forcedMode: "DESKTOP_CLICK" }));

    act(() => {
      result.current.handleDesktopClick();
    });
    expect(result.current.phase).toBe("RED");

    act(() => {
      result.current.handleDesktopClick();
    });
    expect(result.current.phase).toBe("RED");

    act(() => {
      vi.advanceTimersByTime(4_100);
      result.current.handleDesktopClick();
    });
    expect(result.current.phase).toBe("YELLOW");

    act(() => {
      vi.advanceTimersByTime(4_100);
      result.current.handleDesktopClick();
    });
    expect(result.current.phase).toBe("GREEN");

    act(() => {
      vi.advanceTimersByTime(6_100);
    });
    expect(result.current.phase).toBe("IDLE");
    expect(result.current.cycles).toBe(1);
  });
});
