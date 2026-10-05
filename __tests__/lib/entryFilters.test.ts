import {
  deriveReleaseYears,
  deriveSeenYears,
  getDistinctGenreIds,
  PROVIDER_CATEGORY_LABELS,
  sortOptionLabel,
  toggleGenreId,
} from "@/lib/entryFilters";
import type { WatchlistEntry } from "@/lib/watchlistTypes";

function entry(
  id: string,
  genreIds: string[],
  releaseDate: string | null,
  ratings: Array<{ member_id: string; seen_at: string | null }> = [],
): WatchlistEntry {
  return {
    id,
    movie: {
      id: `m-${id}`,
      tmdb_id: 1,
      name: id,
      release_date: releaseDate,
      movie_genres: genreIds.map((g) => ({ genre_id: g, genres: { name: g } })),
    },
    ratings,
  } as unknown as WatchlistEntry;
}

describe("getDistinctGenreIds", () => {
  const entries = [entry("a", ["g3", "g1"], null), entry("b", ["g1", "g2"], null)];

  it("returns distinct ids in first-seen order by default", () => {
    expect(getDistinctGenreIds(entries)).toEqual(["g3", "g1", "g2"]);
  });

  it("sorts when requested", () => {
    expect(getDistinctGenreIds(entries, true)).toEqual(["g1", "g2", "g3"]);
  });

  it("handles entries without genres", () => {
    expect(getDistinctGenreIds([entry("c", [], null)])).toEqual([]);
  });
});

describe("deriveReleaseYears", () => {
  it("returns ascending distinct release years and skips undated entries", () => {
    const years = deriveReleaseYears([
      entry("a", [], "2021-05-01"),
      entry("b", [], "1999-01-01"),
      entry("c", [], "2021-09-09"),
      entry("d", [], null),
    ]);
    expect(years).toEqual([1999, 2021]);
  });
});

describe("deriveSeenYears", () => {
  it("returns descending own seen years and flags missing dates", () => {
    const result = deriveSeenYears(
      [
        entry("a", [], null, [{ member_id: "me", seen_at: "2020-01-01" }]),
        entry("b", [], null, [{ member_id: "me", seen_at: "2023-01-01" }]),
        entry("c", [], null, [{ member_id: "other", seen_at: "2024-01-01" }]),
      ],
      "me",
    );
    expect(result).toEqual({ years: [2023, 2020], hasNoDate: true });
  });

  it("reports no missing date when all entries are dated", () => {
    const result = deriveSeenYears(
      [entry("a", [], null, [{ member_id: "me", seen_at: "2020-01-01" }])],
      "me",
    );
    expect(result.hasNoDate).toBe(false);
  });
});

describe("toggleGenreId", () => {
  it("adds a missing id", () => {
    expect(toggleGenreId(["a"], "b")).toEqual(["a", "b"]);
  });
  it("removes a present id", () => {
    expect(toggleGenreId(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("sortOptionLabel", () => {
  const options = [{ key: "x", label: "Ex" }];
  it("finds the label", () => {
    expect(sortOptionLabel(options, "x")).toBe("Ex");
  });
  it("falls back to the key", () => {
    expect(sortOptionLabel(options, "y")).toBe("y");
  });
});

describe("PROVIDER_CATEGORY_LABELS", () => {
  it("labels all categories", () => {
    expect(PROVIDER_CATEGORY_LABELS).toEqual({ flatrate: "Flatrate", rent: "Leihen", buy: "Kaufen" });
  });
});
