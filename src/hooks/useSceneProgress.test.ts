import { renderHook } from "@testing-library/react";
import { useSceneProgress } from "./useSceneProgress";

describe("useSceneProgress", () => {
  it("returns LIGHT at session start", () => {
    const { result } = renderHook(() => useSceneProgress({ cycles: 0, elapsedMs: 20_000 }));
    expect(result.current).toBe("LIGHT");
  });

  it("returns CABIN based on cycles", () => {
    const { result } = renderHook(() => useSceneProgress({ cycles: 2, elapsedMs: 10_000 }));
    expect(result.current).toBe("CABIN");
  });

  it("returns FLOW based on time fallback", () => {
    const { result } = renderHook(() => useSceneProgress({ cycles: 1, elapsedMs: 210_500 }));
    expect(result.current).toBe("FLOW");
  });
});
