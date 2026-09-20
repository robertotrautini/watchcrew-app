import { act, renderHook } from "@testing-library/react-native";

import { useDebouncedValue } from "../src/hooks/useDebouncedValue";

// M7 part 2 (Add-Movie-Modal): generic debounce hook backing the three
// search modes' differing debounce timings (Film 350ms, Regisseur/
// Besetzung 250ms, Studio 300ms per the task spec).

describe("useDebouncedValue", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    jest.useRealTimers();
  });

  it("returns the initial value immediately, before any delay elapses", async () => {
    const { result, unmount } = await renderHook(() => useDebouncedValue("a", 350));
    expect(result.current).toBe("a");
    await unmount();
  });

  it("does not update until the delay has fully elapsed", async () => {
    const { result, rerender, unmount } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 350),
      { initialProps: { value: "a" } },
    );

    await rerender({ value: "ab" });
    expect(result.current).toBe("a");

    await act(async () => {
      jest.advanceTimersByTime(349);
    });
    expect(result.current).toBe("a");

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe("ab");

    await unmount();
  });

  it("resets the timer on every intermediate change (only the final value after the delay wins)", async () => {
    const { result, rerender, unmount } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 350),
      { initialProps: { value: "a" } },
    );

    await rerender({ value: "ab" });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    await rerender({ value: "abc" });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    // Only 200ms have elapsed since the last change ("abc") -- not yet 350ms.
    expect(result.current).toBe("a");

    await act(async () => {
      jest.advanceTimersByTime(150);
    });
    expect(result.current).toBe("abc");

    await unmount();
  });

  it("uses a different delay value per call, independently", async () => {
    const { result, rerender, unmount } = await renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebouncedValue(value, delay),
      { initialProps: { value: "a", delay: 250 } },
    );

    await rerender({ value: "ab", delay: 250 });
    await act(async () => {
      jest.advanceTimersByTime(250);
    });
    expect(result.current).toBe("ab");

    await unmount();
  });
});
