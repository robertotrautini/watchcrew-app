import { computeFilmographyProgress } from "../../src/lib/filmographyProgress";

describe("computeFilmographyProgress", () => {
  it("computes watched/total/percent for a normal mixed case", () => {
    const result = computeFilmographyProgress([1, 2, 3, 4], new Set([1, 3]));

    expect(result).toEqual({
      watched: 2,
      total: 4,
      percent: 50,
      label: "2 von 4 gesehen · 50%",
    });
  });

  it("returns total=0, watched=0, percent=0 for an empty filmography (no divide-by-zero/NaN)", () => {
    const result = computeFilmographyProgress([], new Set([1, 2]));

    expect(result).toEqual({
      watched: 0,
      total: 0,
      percent: 0,
      label: "0 von 0 gesehen · 0%",
    });
  });

  it("computes 100% when every filmography entry is watched", () => {
    const result = computeFilmographyProgress([10, 20], new Set([10, 20]));

    expect(result).toEqual({
      watched: 2,
      total: 2,
      percent: 100,
      label: "2 von 2 gesehen · 100%",
    });
  });

  it("computes 0% when none of the filmography entries are watched", () => {
    const result = computeFilmographyProgress([10, 20], new Set([999]));

    expect(result).toEqual({
      watched: 0,
      total: 2,
      percent: 0,
      label: "0 von 2 gesehen · 0%",
    });
  });

  it("dedupes duplicate tmdb ids in the filmography list before counting total", () => {
    const result = computeFilmographyProgress([1, 1, 2, 2, 3], new Set([1]));

    expect(result).toEqual({
      watched: 1,
      total: 3,
      percent: 33,
      label: "1 von 3 gesehen · 33%",
    });
  });

  it("does not inflate watched count from watchedTmdbIds entries outside the filmography", () => {
    const result = computeFilmographyProgress([1, 2], new Set([1, 2, 3, 4, 5]));

    expect(result).toEqual({
      watched: 2,
      total: 2,
      percent: 100,
      label: "2 von 2 gesehen · 100%",
    });
  });

  it("rounds the percent using standard round-half-up behavior", () => {
    const result = computeFilmographyProgress([1, 2, 3], new Set([1]));

    // 1/3 = 33.33...% -> rounds to 33
    expect(result.percent).toBe(33);
    expect(result.label).toBe("1 von 3 gesehen · 33%");
  });
});
