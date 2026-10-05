import { getDateBadgeText, isEntryDimmed } from "../../src/lib/watchlistDateBadge";
import type { Movie, StreamingAvailabilityLookup } from "../../src/lib/watchlistTypes";

// Fixed "now" for deterministic future/past comparisons.
const NOW = new Date("2025-06-15T12:00:00Z");

function makeMovie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: "movie-1",
    tmdb_id: 42,
    name: "Test Movie",
    release_date: null,
    poster: null,
    overview: null,
    runtime: null,
    director: null,
    director_id: null,
    vote_average: null,
    ...overrides,
  };
}

function lookup(entries: Array<[number, boolean]> = []): StreamingAvailabilityLookup {
  return new Map(entries);
}

describe("getDateBadgeText", () => {
  it('returns "Kommt am DD.MM.YYYY" for a future release date', () => {
    const movie = makeMovie({ release_date: "2025-07-01" });
    expect(getDateBadgeText(movie, lookup(), NOW)).toBe("Kommt am 01.07.2025");
  });

  it("returns the plain DD.MM.YYYY date for a past release date", () => {
    const movie = makeMovie({ release_date: "2024-01-10" });
    expect(getDateBadgeText(movie, lookup(), NOW)).toBe("10.01.2024");
  });

  it("treats a release date of today as already released (not future)", () => {
    const movie = makeMovie({ release_date: "2025-06-15" });
    expect(getDateBadgeText(movie, lookup(), NOW)).toBe("15.06.2025");
  });

  it('returns "Streaming verfügbar" when there is no release date but streaming is available', () => {
    const movie = makeMovie({ release_date: null, tmdb_id: 7 });
    expect(getDateBadgeText(movie, lookup([[7, true]]), NOW)).toBe("Streaming verfügbar");
  });

  it('returns "Kein Datum" when there is no release date and no streaming availability', () => {
    const movie = makeMovie({ release_date: null, tmdb_id: 7 });
    expect(getDateBadgeText(movie, lookup(), NOW)).toBe("Kein Datum");
  });

  it("zero-pads single-digit day and month", () => {
    const movie = makeMovie({ release_date: "2026-03-05" });
    expect(getDateBadgeText(movie, lookup(), NOW)).toBe("Kommt am 05.03.2026");
  });
});

describe("isEntryDimmed", () => {
  it("dims a future, non-streaming-available entry", () => {
    const movie = makeMovie({ release_date: "2025-07-01", tmdb_id: 1 });
    expect(isEntryDimmed(movie, lookup(), NOW)).toBe(true);
  });

  it("does not dim a future entry that is already streaming-available", () => {
    const movie = makeMovie({ release_date: "2025-07-01", tmdb_id: 1 });
    expect(isEntryDimmed(movie, lookup([[1, true]]), NOW)).toBe(false);
  });

  it("does not dim an already-released entry, regardless of streaming availability", () => {
    const movie = makeMovie({ release_date: "2024-01-10", tmdb_id: 1 });
    expect(isEntryDimmed(movie, lookup(), NOW)).toBe(false);
  });

  it("does not dim a dateless entry that is streaming-available", () => {
    const movie = makeMovie({ release_date: null, tmdb_id: 1 });
    expect(isEntryDimmed(movie, lookup([[1, true]]), NOW)).toBe(false);
  });

  it("dims a dateless entry with no streaming availability", () => {
    const movie = makeMovie({ release_date: null, tmdb_id: 1 });
    expect(isEntryDimmed(movie, lookup(), NOW)).toBe(true);
  });
});
