import {
  formatRuntime,
  pickRuntime,
  pickPreferredReleaseDate,
  pickGenres,
  shouldShowMoreToggle,
  shouldShowAllProvidersToggle,
  getVisibleActions,
} from "../../src/lib/movieDetailLogic";
import type { GermanReleaseDate, TmdbMovieProviders } from "../../src/lib/movieDetailTypes";
import type { MovieGenreLink } from "../../src/lib/watchlistTypes";

// M6 part 2a: pure business logic for the Movie-Detail-Overlay screen.

describe("formatRuntime", () => {
  it("returns null when input is null", () => {
    expect(formatRuntime(null)).toBeNull();
  });

  it("formats a runtime with a whole-hour component (125 -> 2h 5min)", () => {
    expect(formatRuntime(125)).toBe("2h 5min");
  });

  it("formats a runtime under 1 hour, still showing the 0h component (45 -> 0h 45min)", () => {
    expect(formatRuntime(45)).toBe("0h 45min");
  });

  it("formats a runtime of exactly 0 (0 -> 0h 0min)", () => {
    expect(formatRuntime(0)).toBe("0h 0min");
  });

  it("formats a runtime that is an exact multiple of 60 (120 -> 2h 0min)", () => {
    expect(formatRuntime(120)).toBe("2h 0min");
  });
});

describe("pickRuntime", () => {
  it("prefers storedRuntime when present", () => {
    expect(pickRuntime(90, 100)).toBe(90);
  });

  it("falls back to liveRuntime when storedRuntime is null", () => {
    expect(pickRuntime(null, 100)).toBe(100);
  });

  it("treats storedRuntime of 0 as present (uses 0, not liveRuntime)", () => {
    expect(pickRuntime(0, 100)).toBe(0);
  });

  it("returns null when both are null", () => {
    expect(pickRuntime(null, null)).toBeNull();
  });
});

describe("pickPreferredReleaseDate", () => {
  const german: GermanReleaseDate = { category: "Digital", release_date: "2024-05-01", type: 4 };

  it("both present -> uses germanReleaseDate", () => {
    expect(pickPreferredReleaseDate(german, "2024-01-01")).toEqual({
      label: "Digital",
      date: "2024-05-01",
    });
  });

  it("only germanReleaseDate present -> uses it", () => {
    expect(pickPreferredReleaseDate(german, null)).toEqual({
      label: "Digital",
      date: "2024-05-01",
    });
  });

  it("only fallbackReleaseDate present -> uses German fallback label 'Erscheinungsdatum'", () => {
    expect(pickPreferredReleaseDate(null, "2024-01-01")).toEqual({
      label: "Erscheinungsdatum",
      date: "2024-01-01",
    });
  });

  it("both null -> returns null", () => {
    expect(pickPreferredReleaseDate(null, null)).toBeNull();
  });

  it("passes through the exact category as label (Kino)", () => {
    const kino: GermanReleaseDate = { category: "Kino", release_date: "2024-03-01", type: 3 };
    expect(pickPreferredReleaseDate(kino, null)).toEqual({ label: "Kino", date: "2024-03-01" });
  });

  it("passes through the exact category as label (TV)", () => {
    const tv: GermanReleaseDate = { category: "TV", release_date: "2024-07-01", type: 6 };
    expect(pickPreferredReleaseDate(tv, null)).toEqual({ label: "TV", date: "2024-07-01" });
  });
});

describe("pickGenres", () => {
  const links: MovieGenreLink[] = [
    { genre_id: "1", genres: { name: "Action" } },
    { genre_id: "2", genres: { name: "Comedy" } },
  ];

  it("uses liveGenres as-is when it's a non-null array", () => {
    expect(pickGenres(["Drama"], links)).toEqual(["Drama"]);
  });

  it("uses liveGenres even when empty (loaded but has none)", () => {
    expect(pickGenres([], links)).toEqual([]);
  });

  it("falls back to mapped fallbackGenreLinks when liveGenres is null", () => {
    expect(pickGenres(null, links)).toEqual(["Action", "Comedy"]);
  });

  it("falls back to mapped fallbackGenreLinks when liveGenres is undefined", () => {
    expect(pickGenres(undefined, links)).toEqual(["Action", "Comedy"]);
  });

  it("filters out fallback links with missing genre names", () => {
    const linksWithMissing: MovieGenreLink[] = [
      { genre_id: "1", genres: { name: "Action" } },
      { genre_id: "2", genres: null },
      { genre_id: "3" },
    ];
    expect(pickGenres(null, linksWithMissing)).toEqual(["Action"]);
  });

  it("returns [] when liveGenres is null/undefined and fallbackGenreLinks is also null/undefined", () => {
    expect(pickGenres(null, null)).toEqual([]);
    expect(pickGenres(undefined, undefined)).toEqual([]);
  });
});

describe("shouldShowMoreToggle", () => {
  it("returns false when measured line count is below max", () => {
    expect(shouldShowMoreToggle(2, 3)).toBe(false);
  });

  it("returns false when measured line count equals max", () => {
    expect(shouldShowMoreToggle(3, 3)).toBe(false);
  });

  it("returns true when measured line count exceeds max", () => {
    expect(shouldShowMoreToggle(4, 3)).toBe(true);
  });
});

describe("shouldShowAllProvidersToggle", () => {
  function makeProviders(overrides: Partial<TmdbMovieProviders> = {}): TmdbMovieProviders {
    return { flatrate: [], rent: [], buy: [], ...overrides };
  }
  const REF = { provider_id: 1, provider_name: "Netflix" };
  const refs = (n: number) => Array.from({ length: n }, () => REF);

  it("returns false when providers is null", () => {
    expect(shouldShowAllProvidersToggle(null)).toBe(false);
  });

  it("returns false when all three arrays are empty", () => {
    expect(shouldShowAllProvidersToggle(makeProviders())).toBe(false);
  });

  it("returns false for exactly 1 non-empty section with 1 item", () => {
    expect(shouldShowAllProvidersToggle(makeProviders({ flatrate: refs(1) }))).toBe(false);
  });

  it("returns false for exactly 1 non-empty section with 2 items", () => {
    expect(shouldShowAllProvidersToggle(makeProviders({ flatrate: refs(2) }))).toBe(false);
  });

  it("returns false for exactly 1 non-empty section with 3 items", () => {
    expect(shouldShowAllProvidersToggle(makeProviders({ flatrate: refs(3) }))).toBe(false);
  });

  it("returns true for exactly 1 non-empty section with 4 items (total>3 clause)", () => {
    expect(shouldShowAllProvidersToggle(makeProviders({ flatrate: refs(4) }))).toBe(true);
  });

  it("returns true for exactly 2 non-empty sections with 1 item each, total=2 (multi-section clause)", () => {
    expect(
      shouldShowAllProvidersToggle(makeProviders({ flatrate: refs(1), rent: refs(1) }))
    ).toBe(true);
  });

  it("returns true for all 3 sections non-empty with 1 item each, total=3 (multi-section clause)", () => {
    expect(
      shouldShowAllProvidersToggle(
        makeProviders({ flatrate: refs(1), rent: refs(1), buy: refs(1) })
      )
    ).toBe(true);
  });

  it("boundary: exactly 3 items in one section, others empty -> false", () => {
    expect(shouldShowAllProvidersToggle(makeProviders({ buy: refs(3) }))).toBe(false);
  });

  it("boundary: exactly 4 items in one section, others empty -> true", () => {
    expect(shouldShowAllProvidersToggle(makeProviders({ buy: refs(4) }))).toBe(true);
  });
});

describe("getVisibleActions", () => {
  it("hasGroupContext=true, watchlist, released, not streaming, no collection", () => {
    expect(
      getVisibleActions({
        hasGroupContext: true,
        source: "watchlist",
        isReleased: true,
        isOnStreaming: false,
        hasCollection: false,
      })
    ).toEqual(["bewerten", "bearbeiten", "aehnliche", "loeschen"]);
  });

  it("hasGroupContext=true, watchlist, not released, on streaming, has collection", () => {
    expect(
      getVisibleActions({
        hasGroupContext: true,
        source: "watchlist",
        isReleased: false,
        isOnStreaming: true,
        hasCollection: true,
      })
    ).toEqual(["bewerten", "bearbeiten", "aehnliche", "loeschen", "filmreihe"]);
  });

  it("hasGroupContext=true, watchlist, not released, not streaming, no collection -> no bewerten", () => {
    expect(
      getVisibleActions({
        hasGroupContext: true,
        source: "watchlist",
        isReleased: false,
        isOnStreaming: false,
        hasCollection: false,
      })
    ).toEqual(["bearbeiten", "aehnliche", "loeschen"]);
  });

  it("hasGroupContext=true, source=diary, released+streaming -> no bewerten (source not watchlist)", () => {
    expect(
      getVisibleActions({
        hasGroupContext: true,
        source: "diary",
        isReleased: true,
        isOnStreaming: true,
        hasCollection: false,
      })
    ).toEqual(["bearbeiten", "aehnliche", "loeschen"]);
  });

  it("hasGroupContext=true, source=undefined, released+streaming+collection -> no bewerten, has filmreihe", () => {
    expect(
      getVisibleActions({
        hasGroupContext: true,
        source: undefined,
        isReleased: true,
        isOnStreaming: true,
        hasCollection: true,
      })
    ).toEqual(["bearbeiten", "aehnliche", "loeschen", "filmreihe"]);
  });

  it("hasGroupContext=true, hasCollection=true isolated (other fields held constant) -> includes filmreihe", () => {
    expect(
      getVisibleActions({
        hasGroupContext: true,
        source: "diary",
        isReleased: false,
        isOnStreaming: false,
        hasCollection: true,
      })
    ).toEqual(["bearbeiten", "aehnliche", "loeschen", "filmreihe"]);
  });

  it("hasGroupContext=true, hasCollection=false isolated (other fields held constant) -> excludes filmreihe", () => {
    expect(
      getVisibleActions({
        hasGroupContext: true,
        source: "diary",
        isReleased: false,
        isOnStreaming: false,
        hasCollection: false,
      })
    ).toEqual(["bearbeiten", "aehnliche", "loeschen"]);
  });

  it("hasGroupContext=false, hasCollection=false", () => {
    expect(
      getVisibleActions({
        hasGroupContext: false,
        source: "watchlist",
        isReleased: true,
        isOnStreaming: true,
        hasCollection: false,
      })
    ).toEqual(["zur_watchlist", "direkt_bewerten", "aehnliche"]);
  });

  it("hasGroupContext=false, hasCollection=true", () => {
    expect(
      getVisibleActions({
        hasGroupContext: false,
        source: "watchlist",
        isReleased: true,
        isOnStreaming: true,
        hasCollection: true,
      })
    ).toEqual(["zur_watchlist", "direkt_bewerten", "aehnliche", "filmreihe"]);
  });

  it("hasGroupContext=false ignores source/isReleased/isOnStreaming entirely", () => {
    expect(
      getVisibleActions({
        hasGroupContext: false,
        source: "diary",
        isReleased: false,
        isOnStreaming: false,
        hasCollection: false,
      })
    ).toEqual(["zur_watchlist", "direkt_bewerten", "aehnliche"]);
  });
});
