// M10 (Realtime foreground sync, ADR 0006): the tiny app-wide toast
// pub/sub in src/lib/toast.ts. `showToast` is called from
// src/hooks/useGroupRealtimeSync.ts (no React tree access there), and
// src/components/ui/Toast.tsx's `ToastHost` is the sole subscriber, mounted
// once near the app root (src/app/_layout.tsx).

import { __resetToastListenersForTests, showToast, subscribeToToasts } from "@/lib/toast";

describe("toast pub/sub", () => {
  afterEach(() => {
    __resetToastListenersForTests();
  });

  it("delivers a shown toast message to a subscribed listener", () => {
    const listener = jest.fn();
    subscribeToToasts(listener);

    showToast("Neuer Film zur Watchlist hinzugefügt");

    expect(listener).toHaveBeenCalledWith("Neuer Film zur Watchlist hinzugefügt");
  });

  it("delivers to every currently subscribed listener", () => {
    const listenerA = jest.fn();
    const listenerB = jest.fn();
    subscribeToToasts(listenerA);
    subscribeToToasts(listenerB);

    showToast("Jemand hat einen Film bewertet");

    expect(listenerA).toHaveBeenCalledWith("Jemand hat einen Film bewertet");
    expect(listenerB).toHaveBeenCalledWith("Jemand hat einen Film bewertet");
  });

  it("stops delivering to a listener after it unsubscribes", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToToasts(listener);
    unsubscribe();

    showToast("Eine Zahlung wurde erfasst");

    expect(listener).not.toHaveBeenCalled();
  });

  it("does not throw when no listener is subscribed", () => {
    expect(() => showToast("Neuer Film zur Watchlist hinzugefügt")).not.toThrow();
  });

  it("only unsubscribes the exact listener, leaving others intact", () => {
    const listenerA = jest.fn();
    const listenerB = jest.fn();
    const unsubscribeA = subscribeToToasts(listenerA);
    subscribeToToasts(listenerB);
    unsubscribeA();

    showToast("Eine Zahlung wurde erfasst");

    expect(listenerA).not.toHaveBeenCalled();
    expect(listenerB).toHaveBeenCalledWith("Eine Zahlung wurde erfasst");
  });
});
