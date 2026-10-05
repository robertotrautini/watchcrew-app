import { useRef } from "react";

import { nextTabSwitchState, type TabSwitchState } from "@/lib/motion";

/** Tracks tab-to-tab switches (see `nextTabSwitchState`); idempotent per render. */
export function useTabSwitchState(tab: string | null): TabSwitchState {
  const ref = useRef<TabSwitchState>({ tab: null, epoch: 0 });
  ref.current = nextTabSwitchState(ref.current, tab);
  return ref.current;
}
