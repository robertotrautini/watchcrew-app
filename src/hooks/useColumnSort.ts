import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { nextColumnSort, type ColumnSortState } from "@/lib/columnSort";

/**
 * Local (non-persisted) column-header sort of a list screen: tap cycles
 * asc -> desc -> none for a column. Resets whenever the screen loses focus.
 */
export function useColumnSort<C extends string>() {
  const [columnSort, setColumnSort] = useState<ColumnSortState<C> | null>(null);

  useFocusEffect(
    useCallback(() => {
      return () => setColumnSort(null);
    }, []),
  );

  const toggleColumn = useCallback(
    (column: C) => setColumnSort((current) => nextColumnSort(current, column)),
    [],
  );

  return { columnSort, toggleColumn };
}
