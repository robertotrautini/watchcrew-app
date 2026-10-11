import { useQuery } from "@tanstack/react-query";

import { mapMyDiaryRows, type MyDiaryRow } from "@/lib/myDiary";
import { queryKeys } from "@/lib/queryKeys";
import { getMyDiaryRows } from "@/lib/watchlist";
import type { WatchlistEntry } from "@/lib/watchlistTypes";

function selectEntries(rows: MyDiaryRow[]): WatchlistEntry[] {
  return mapMyDiaryRows(Array.isArray(rows) ? rows : []);
}

/**
 * Tagebuch scope "Mein Tagebuch": every movie the user rated/saw, across all
 * groups and including movies that sit in no group (ADR 0014, Phase 5).
 * Cached rows are the raw query rows (JSON-safe); `select` maps them onto the
 * entry shape. Invalidated by the rating mutations and by Realtime events on
 * the user's own `user_movie_ratings` rows.
 */
export function useMyDiary(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.myDiary.byUser(userId),
    queryFn: async (): Promise<MyDiaryRow[]> => {
      const { data, error } = await getMyDiaryRows(userId as string);
      if (error) {
        throw error;
      }
      return (data ?? []) as MyDiaryRow[];
    },
    select: selectEntries,
    enabled: !!userId,
  });
}
