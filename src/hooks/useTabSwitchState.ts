import { useState } from "react";

import { nextTabSwitchState, type TabSwitchState } from "@/lib/motion";

/** Tracks tab-to-tab switches (see `nextTabSwitchState`); idempotent per render. */
export function useTabSwitchState(tab: string | null): TabSwitchState {
  const [state, setState] = useState<TabSwitchState>({ tab: null, epoch: 0 });
  const next = nextTabSwitchState(state, tab);
  // Derived-state update during render (React re-renders immediately); the
  // reducer returns the same object when nothing changed, so this settles.
  if (next !== state) setState(next);
  return next;
}
