import { TRACKER_ROUTE, WATCHLIST_ROUTE, homeRouteFor } from "@/lib/homeRoute";

describe("homeRouteFor", () => {
  it("lands on the Tracker while the Tracker flag is on", () => {
    expect(homeRouteFor(true)).toBe(TRACKER_ROUTE);
  });

  it("lands on the Watchlist when the Tracker flag is off", () => {
    expect(homeRouteFor(false)).toBe(WATCHLIST_ROUTE);
  });

  it("points at tab routes inside the (app)/(tabs) group", () => {
    expect(TRACKER_ROUTE).toBe("/(app)/(tabs)/tracker");
    expect(WATCHLIST_ROUTE).toBe("/(app)/(tabs)/watchlist");
  });
});
