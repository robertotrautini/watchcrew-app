import { useState } from "react";

import type { SortState } from "@/lib/entrySorting";

/**
 * Key for a FlatList that is deliberately remounted when the sort changes:
 * React then renders only the first window fresh instead of reordering and
 * re-measuring ~100 cells, and the scroll offset resets to the top.
 * `skipFade` is true after a sort-only change (rows must not replay the fade);
 * a mode change (grid/list/cards) resets it so the normal fade-in applies.
 */
export function useSortRemountKey(
  mode: string,
  sort: SortState,
): { listKey: string; skipFade: boolean } {
  const sortKey = `${sort.field}-${sort.direction}`;
  const [state, setState] = useState({ mode, sortKey, skipFade: false });
  if (state.mode !== mode) {
    setState({ mode, sortKey, skipFade: false });
  } else if (state.sortKey !== sortKey) {
    setState({ mode, sortKey, skipFade: true });
  }
  return { listKey: `${mode}-${sortKey}`, skipFade: state.skipFade };
}
