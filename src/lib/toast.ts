/**
 * M10 (Realtime foreground sync, ADR 0006): a minimal, dependency-free
 * app-wide toast pub/sub.
 *
 * Why a plain module-level pub/sub instead of a Zustand store (the
 * project's usual client-state tool, see src/stores/): `showToast` is
 * called from src/hooks/useGroupRealtimeSync.ts, which fires from a
 * Supabase Realtime callback that isn't guaranteed to run inside a React
 * render/effect context tied to any particular component's lifecycle. A
 * plain subscribe/publish pair is the smallest primitive that does the job
 * (deliver a message to whichever `ToastHost` is currently mounted) without
 * pulling in a store's extra state-shape/selector machinery for what is, in
 * the end, a fire-and-forget event, not persisted state. `ToastHost`
 * (src/components/ui/Toast.tsx) is the sole real subscriber, mounted once
 * near the app root (src/app/_layout.tsx).
 */

export type ToastListener = (message: string) => void;

let listeners: ToastListener[] = [];

/** Publishes a toast message to every currently subscribed listener (normally just the one `ToastHost`). A no-op if nothing is subscribed yet. */
export function showToast(message: string): void {
  for (const listener of listeners) {
    listener(message);
  }
}

/** Subscribes to toast messages; returns an unsubscribe function. */
export function subscribeToToasts(listener: ToastListener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((existing) => existing !== listener);
  };
}

/** Test-only: clears all subscribers between test cases. Not for app code. */
export function __resetToastListenersForTests(): void {
  listeners = [];
}
