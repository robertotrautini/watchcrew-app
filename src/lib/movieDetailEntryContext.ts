import { splitWatchlistAndDiary } from "@/lib/watchlistLogic";
import type { WatchlistEntry } from "@/lib/watchlistTypes";

export interface DetailEntryContext {
  groupId: string | undefined;
  source: "watchlist" | "diary" | undefined;
  watchlistEntryId: string | undefined;
  hasGroupContext: boolean;
}

export interface ResolveDetailEntryContextParams {
  routeGroupId?: string;
  routeSource?: "watchlist" | "diary";
  routeWatchlistEntryId?: string;
  tmdbId: number;
  activeGroupId: string | undefined;
  currentUserId: string | undefined;
  /** The ACTIVE group's watchlist entries (only consulted when the route has no group context). */
  activeGroupEntries: WatchlistEntry[] | undefined;
}

/**
 * The Movie-Detail screen's effective group/entry context. Route params win
 * (opened from Watchlist/Tagebuch). Without them (opened from search/add-movie)
 * the screen still must react once the movie has been added to the active
 * group (e.g. "Zur Watchlist"): it then resolves the new entry from the active
 * group's watchlist query, so the action bar switches to Bewerten/Löschen
 * instead of staying on the stale "Zur Watchlist" state.
 */
export function resolveDetailEntryContext(params: ResolveDetailEntryContextParams): DetailEntryContext {
  if (params.routeGroupId && params.routeSource) {
    return {
      groupId: params.routeGroupId,
      source: params.routeSource,
      watchlistEntryId: params.routeWatchlistEntryId,
      hasGroupContext: true,
    };
  }

  const match = params.activeGroupEntries?.find((e) => e.movie?.tmdb_id === params.tmdbId);
  if (!match || !params.activeGroupId) {
    return { groupId: undefined, source: undefined, watchlistEntryId: undefined, hasGroupContext: false };
  }

  const isDiary =
    params.currentUserId != null &&
    splitWatchlistAndDiary([match], params.currentUserId).diary.length > 0;

  return {
    groupId: params.activeGroupId,
    source: isDiary ? "diary" : "watchlist",
    watchlistEntryId: match.id,
    hasGroupContext: true,
  };
}
