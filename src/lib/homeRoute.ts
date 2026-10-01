export const TRACKER_ROUTE = "/(app)/(tabs)/tracker";
export const WATCHLIST_ROUTE = "/(app)/(tabs)/watchlist";

/** Default landing tab; Watchlist when the per-device Tracker flag is off. */
export function homeRouteFor(trackerEnabled: boolean) {
  return trackerEnabled ? TRACKER_ROUTE : WATCHLIST_ROUTE;
}
