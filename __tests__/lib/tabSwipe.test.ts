import {
  getAdjacentTab,
  shouldCommitSwipe,
  SWIPE_COMMIT_FRACTION,
  SWIPE_COMMIT_VELOCITY,
} from "@/lib/tabSwipe";

const ALL = ["tracker", "watchlist", "tagebuch"];
const NO_TRACKER = ["watchlist", "tagebuch"];

describe("getAdjacentTab", () => {
  it("swipe left goes to the next tab", () => {
    expect(getAdjacentTab(ALL, "tracker", "left")).toBe("watchlist");
    expect(getAdjacentTab(ALL, "watchlist", "left")).toBe("tagebuch");
  });
  it("swipe right goes to the previous tab", () => {
    expect(getAdjacentTab(ALL, "tagebuch", "right")).toBe("watchlist");
    expect(getAdjacentTab(ALL, "watchlist", "right")).toBe("tracker");
  });
  it("does not wrap around at the edges", () => {
    expect(getAdjacentTab(ALL, "tagebuch", "left")).toBeNull();
    expect(getAdjacentTab(ALL, "tracker", "right")).toBeNull();
  });
  it("skips the hidden tracker tab", () => {
    expect(getAdjacentTab(NO_TRACKER, "watchlist", "right")).toBeNull();
    expect(getAdjacentTab(NO_TRACKER, "watchlist", "left")).toBe("tagebuch");
  });
  it("returns null for an unknown current tab", () => {
    expect(getAdjacentTab(ALL, "nope", "left")).toBeNull();
  });
});

describe("shouldCommitSwipe", () => {
  const W = 400;
  it("constants", () => {
    expect(SWIPE_COMMIT_FRACTION).toBe(0.18);
    expect(SWIPE_COMMIT_VELOCITY).toBe(550);
  });
  it("commits on distance above 18% of the width (left and right)", () => {
    expect(shouldCommitSwipe(-80, 0, W, "left")).toBe(true);
    expect(shouldCommitSwipe(80, 0, W, "right")).toBe(true);
  });
  it("does not commit short, slow drags", () => {
    expect(shouldCommitSwipe(-60, -100, W, "left")).toBe(false);
    expect(shouldCommitSwipe(60, 100, W, "right")).toBe(false);
  });
  it("commits on a fast fling in the swipe direction even for a short distance", () => {
    expect(shouldCommitSwipe(-60, -700, W, "left")).toBe(true);
    expect(shouldCommitSwipe(60, 700, W, "right")).toBe(true);
  });
  it("ignores velocity in the opposite direction", () => {
    expect(shouldCommitSwipe(-60, 900, W, "left")).toBe(false);
    expect(shouldCommitSwipe(60, -900, W, "right")).toBe(false);
  });
  it("ignores a tiny twitch even with high velocity", () => {
    expect(shouldCommitSwipe(-5, -900, W, "left")).toBe(false);
  });
});
