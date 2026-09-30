// M3 roadmap: "Tabs: Tracker/Watchlist/Tagebuch, News ausgeblendet" — the
// old app's "News" tab must be entirely absent (not just hidden), and the
// remaining three must be exactly these three, in this order. The route
// layout file itself (src/app/(app)/(tabs)/_layout.tsx) isn't meaningfully
// unit-testable as a navigator (that's the interim web visual check's job),
// but the exported TAB_SCREENS data it renders from is a plain, testable
// regression guard for "exactly these tabs, no more, no less".
import { TAB_SCREENS } from "../src/app/(app)/(tabs)/_layout";

describe("(app)/(tabs) TAB_SCREENS", () => {
  it("contains exactly Tracker, Watchlist, Tagebuch, in that order", () => {
    expect(TAB_SCREENS.map((tab) => tab.name)).toEqual(["tracker", "watchlist", "tagebuch"]);
    expect(TAB_SCREENS.map((tab) => tab.title)).toEqual(["Tracker", "Watchlist", "Tagebuch"]);
  });

  it("does not include a News tab", () => {
    const names = TAB_SCREENS.map((tab) => tab.name.toLowerCase());
    const titles = TAB_SCREENS.map((tab) => tab.title.toLowerCase());
    expect(names).not.toContain("news");
    expect(titles).not.toContain("news");
  });
});

// Regression: tabs without `tabBarIcon` fall back to React Navigation's
// MissingIcon (box with X). Every tab needs a real Ionicons glyph.
import { Ionicons } from "@expo/vector-icons";

describe("(app)/(tabs) tab icons", () => {
  it("gives every tab an icon name that exists in the Ionicons glyph map", () => {
    for (const tab of TAB_SCREENS) {
      expect(typeof tab.icon).toBe("string");
      expect(Object.keys(Ionicons.glyphMap)).toContain(tab.icon);
      expect(Object.keys(Ionicons.glyphMap)).toContain(`${tab.icon}-outline`);
    }
  });
});
