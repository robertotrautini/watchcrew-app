import {
  BG_IMAGE_ASPECT,
  BG_IMAGE_HEIGHT,
  BG_IMAGE_WIDTH,
  BG_PARALLAX_EDGE_INSET_DP,
  BG_PARALLAX_TRAVEL_FRACTION,
  backgroundLayout,
  parallaxTranslateX,
  swipeTabProgress,
  tabIndexOf,
  tabPanFraction,
} from "@/lib/parallax";

describe("source image", () => {
  it("is the original legacy photo (1920x1280 landscape)", () => {
    expect(BG_IMAGE_WIDTH).toBe(1920);
    expect(BG_IMAGE_HEIGHT).toBe(1280);
    expect(BG_IMAGE_ASPECT).toBeCloseTo(1.5);
  });
});

describe("backgroundLayout (100% screen height, no vertical overscan)", () => {
  // Pixel 6 Pro in dp
  const w = 412;
  const h = 892;
  it("fits the photo exactly to the screen height", () => {
    const l = backgroundLayout(w, h);
    expect(l.boxHeight).toBeCloseTo(h);
    expect(l.scale).toBeCloseTo(h / BG_IMAGE_HEIGHT);
    expect(l.boxWidth).toBeCloseTo(BG_IMAGE_WIDTH * l.scale);
    expect(l.top).toBe(0);
    expect(l.left).toBe(0);
  });
  it("exposes the real horizontal slack (image width minus screen width)", () => {
    const l = backgroundLayout(w, h);
    expect(l.slackX).toBeCloseTo(h * BG_IMAGE_ASPECT - w);
    expect(l.slackX).toBeGreaterThan(0);
  });
  it("falls back to cover when the screen is wider than the height-fit image (no negative slack)", () => {
    const l = backgroundLayout(1600, 800);
    expect(l.boxWidth).toBeCloseTo(1600);
    expect(l.slackX).toBeCloseTo(0);
    expect(l.boxHeight).toBeGreaterThan(800);
    expect(l.top).toBeCloseTo((800 - l.boxHeight) / 2);
  });
});

describe("tabIndexOf", () => {
  it("returns the index within the visible tabs, null for non-tab segments", () => {
    const tabs = ["tracker", "watchlist", "tagebuch"];
    expect(tabIndexOf("tracker", tabs)).toBe(0);
    expect(tabIndexOf("tagebuch", tabs)).toBe(2);
    expect(tabIndexOf("settings", tabs)).toBeNull();
    expect(tabIndexOf("watchlist", ["watchlist", "tagebuch"])).toBe(0);
  });
});

describe("tabPanFraction (evenly spread over N tabs)", () => {
  it.each([2, 3, 4])("N=%i: first tab 0, last tab 1, even steps", (n) => {
    expect(tabPanFraction(0, n)).toBe(0);
    expect(tabPanFraction(n - 1, n)).toBe(1);
    for (let i = 0; i < n; i++) expect(tabPanFraction(i, n)).toBeCloseTo(i / (n - 1));
  });
  it("N=3: middle tab is centred", () => {
    expect(tabPanFraction(1, 3)).toBeCloseTo(0.5);
  });
  it("is continuous between tabs (fractional index) and clamped", () => {
    expect(tabPanFraction(0.5, 3)).toBeCloseTo(0.25);
    expect(tabPanFraction(-1, 3)).toBe(0);
    expect(tabPanFraction(9, 3)).toBe(1);
  });
  it("N<=1: centred", () => {
    expect(tabPanFraction(0, 1)).toBeCloseTo(0.5);
  });
});

describe("parallaxTranslateX (centred, reduced travel)", () => {
  const slack = 926;
  const inset = BG_PARALLAX_EDGE_INSET_DP;
  const travel = BG_PARALLAX_TRAVEL_FRACTION * (slack - 2 * inset);
  it("travel fraction is 0.45 (was 1.0)", () => {
    expect(BG_PARALLAX_TRAVEL_FRACTION).toBe(0.45);
  });
  it("middle tab: centred", () => {
    expect(parallaxTranslateX(tabPanFraction(1, 3), slack)).toBeCloseTo(-slack / 2);
  });
  it("first/last tab: equally far left/right of the centre", () => {
    expect(parallaxTranslateX(0, slack)).toBeCloseTo(-slack / 2 + travel / 2);
    expect(parallaxTranslateX(1, slack)).toBeCloseTo(-slack / 2 - travel / 2);
  });
  it.each([2, 3, 4])("N=%i: linear in between and image always covers the screen", (n) => {
    const step = travel / (n - 1);
    for (let i = 0; i < n; i++) {
      const x = parallaxTranslateX(tabPanFraction(i, n), slack);
      expect(x).toBeCloseTo(-(slack / 2 - travel / 2 + i * step));
      expect(x).toBeLessThanOrEqual(0);
      expect(x).toBeGreaterThanOrEqual(-slack);
    }
  });
  it("small slack: clamped and centred (no inversion)", () => {
    expect(parallaxTranslateX(0, 50)).toBeCloseTo(-25);
    expect(parallaxTranslateX(1, 50)).toBeCloseTo(-25);
    expect(parallaxTranslateX(0.5, 0)).toBeCloseTo(0);
  });
});

describe("swipeTabProgress (follows the finger)", () => {
  it("dragging left by one screen width advances one tab", () => {
    expect(swipeTabProgress(0, -400, 400, 3)).toBeCloseTo(1);
  });
  it("dragging right goes back, half a width = half a tab", () => {
    expect(swipeTabProgress(2, 200, 400, 3)).toBeCloseTo(1.5);
  });
  it("clamps at the first and last tab", () => {
    expect(swipeTabProgress(0, 300, 400, 3)).toBe(0);
    expect(swipeTabProgress(2, -300, 400, 3)).toBe(2);
  });
});
