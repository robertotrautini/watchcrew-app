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

/**
 * Toast look: `success` = green (saved / added), `error` = red (failures),
 * `info` = neutral accent (default, e.g. realtime hints, "coming soon").
 * See docs/style-guide.md "Toasts".
 */
export type ToastVariant = "success" | "error" | "info";

export interface ToastOptions {
  variant?: ToastVariant;
  /** Overrides the host's default display duration (ms). */
  durationMs?: number;
  /** Makes the toast tappable; the host dismisses the toast after calling it. */
  onPress?: () => void;
}

export type ToastListener = (message: string, options?: ToastOptions) => void;

let listeners: ToastListener[] = [];

/** Publishes a toast message to every currently subscribed listener (normally just the one `ToastHost`). A no-op if nothing is subscribed yet. */
export function showToast(message: string, options?: ToastOptions): void {
  for (const listener of listeners) {
    if (options) {
      listener(message, options);
    } else {
      listener(message);
    }
  }
}

/** Subscribes to toast messages; returns an unsubscribe function. */
/** Green success toast (saved, added, ...). */
export function showSuccessToast(
  message: string,
  options?: Omit<ToastOptions, "variant">,
): void {
  showToast(message, { ...options, variant: "success" });
}

/** Red error toast (failed actions, validation errors). */
export function showErrorToast(
  message: string,
  options?: Omit<ToastOptions, "variant">,
): void {
  showToast(message, { ...options, variant: "error" });
}

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
