import { createContext } from "react";

import type { TabSwitchState } from "@/lib/motion";

/** Provided by the tabs layout; FadeInItem (with `replayTab`) replays its fade when its tab becomes active. */
export const TabSwitchContext = createContext<TabSwitchState>({ tab: null, epoch: 0 });
