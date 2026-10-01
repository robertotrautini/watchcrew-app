// M10 (Realtime foreground sync, ADR 0006): `ToastHost`
// (src/components/ui/Toast.tsx), the sole real subscriber to
// src/lib/toast.ts's pub/sub, mounted once near the app root
// (src/app/_layout.tsx) so `showToast(...)` (called from
// src/hooks/useGroupRealtimeSync.ts) has somewhere to render.
//
// Two test-environment quirks both matter here, matching what was already
// found while writing __tests__/useGroupRealtimeSync.test.tsx:
//  1. Every `act()` wrapping a toast-pub/sub-triggered state update is the
//     ASYNC form (`await act(async () => {...})`), never the sync
//     `act(() => {...})` -- a sync, un-awaited `act()` around a state
//     update triggered from OUTSIDE a React event handler (here: a plain
//     module-level subscriber callback) leaves a dangling unflushed batch
//     that breaks the NEXT test's own effect flushing in this test
//     environment.
//  2. Fake timers are enabled AFTER the initial `render()`, never before --
//     enabling them earlier prevents the mount's own `useEffect` (which
//     subscribes to the toast pub/sub) from ever running.

import { Animated } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";

import { ToastHost } from "@/components/ui/Toast";
import { __resetToastListenersForTests, showToast } from "@/lib/toast";

describe("ToastHost", () => {
  afterEach(() => {
    __resetToastListenersForTests();
    jest.useRealTimers();
  });

  it("renders nothing before any toast is shown", async () => {
    const { queryByTestId } = await render(<ToastHost />);
    expect(queryByTestId("toast-host")).toBeNull();
  });

  it("renders the message after showToast is called", async () => {
    const { queryByTestId, getByTestId } = await render(<ToastHost />);

    await act(async () => {
      showToast("Neuer Film zur Watchlist hinzugefügt");
    });

    expect(queryByTestId("toast-host")).toBeTruthy();
    expect(getByTestId("toast-message").props.children).toBe("Neuer Film zur Watchlist hinzugefügt");
  });

  it("renders on a filled glass surface with a border (readable over the photo background)", async () => {
    const { getByTestId } = await render(<ToastHost />);

    await act(async () => {
      showToast("Hallo");
    });

    const className = getByTestId("toast-surface").props.className as string;
    expect(className).toContain("bg-bg-glass-strong");
    expect(className).toContain("border");
  });

  it("plays a fade+slide-in entrance animation when a toast is shown (M11 animation polish)", async () => {
    const timingSpy = jest.spyOn(Animated, "timing");
    await render(<ToastHost />);

    await act(async () => {
      showToast("Neuer Film zur Watchlist hinzugefügt");
    });

    // Two Animated.Value drivers (opacity + translateY), each animating
    // toward its resting value -- confirms the right API is actually wired,
    // not the visual smoothness/easing of the transition (unverifiable in
    // this environment, see this task's own instructions).
    expect(timingSpy).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ toValue: 1 }),
    );
    expect(timingSpy).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ toValue: 0 }),
    );

    timingSpy.mockRestore();
  });

  it("auto-dismisses the toast after 4 seconds", async () => {
    const { queryByTestId } = await render(<ToastHost />);
    jest.useFakeTimers();

    await act(async () => {
      showToast("Jemand hat einen Film bewertet");
    });
    expect(queryByTestId("toast-host")).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(4000);
    });

    expect(queryByTestId("toast-host")).toBeNull();
  });

  it("does not dismiss early (before the 4s duration elapses)", async () => {
    const { queryByTestId } = await render(<ToastHost />);
    jest.useFakeTimers();

    await act(async () => {
      showToast("Eine Zahlung wurde erfasst");
    });

    await act(async () => {
      jest.advanceTimersByTime(3999);
    });

    expect(queryByTestId("toast-host")).toBeTruthy();
  });

  it("replaces an in-flight toast with a newer one and restarts the dismiss timer", async () => {
    const { getByTestId } = await render(<ToastHost />);
    jest.useFakeTimers();

    await act(async () => {
      showToast("Neuer Film zur Watchlist hinzugefügt");
    });
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    await act(async () => {
      showToast("Jemand hat einen Film bewertet");
    });

    expect(getByTestId("toast-message").props.children).toBe("Jemand hat einen Film bewertet");

    // Only 2s have passed since the SECOND toast's own timer restarted at
    // t=3s -- it hasn't run its full 4s yet, so it's still visible.
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(getByTestId("toast-message").props.children).toBe("Jemand hat einen Film bewertet");
  });

  it("stops listening for new toasts after unmounting", async () => {
    const { unmount, queryByTestId } = await render(<ToastHost />);
    await unmount();

    await act(async () => {
      showToast("Neuer Film zur Watchlist hinzugefügt");
    });
    expect(queryByTestId("toast-host")).toBeNull();
  });

  it("honors a custom durationMs (stays beyond 4s, dismisses at the custom duration)", async () => {
    const { queryByTestId } = await render(<ToastHost />);
    jest.useFakeTimers();

    await act(async () => {
      showToast("Neue Features", { durationMs: 6000 });
    });

    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    expect(queryByTestId("toast-host")).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(queryByTestId("toast-host")).toBeNull();
  });

  it("calls onPress and dismisses when a toast with onPress is tapped", async () => {
    const onPress = jest.fn();
    const { queryByTestId, getByTestId } = await render(<ToastHost />);

    await act(async () => {
      showToast("Neue Features", { onPress });
    });
    await fireEvent.press(getByTestId("toast-press"));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(queryByTestId("toast-host")).toBeNull();
  });

  it("does not render a tap target for a plain toast", async () => {
    const { queryByTestId } = await render(<ToastHost />);

    await act(async () => {
      showToast("Nur Text");
    });

    expect(queryByTestId("toast-press")).toBeNull();
  });
});
