import { DIARY_SORT_SHORT_LABELS, WATCHLIST_SORT_SHORT_LABELS } from "../../src/lib/listFilters";

describe("sort short labels", () => {
  it("shortens the long streaming label", () => {
    expect(WATCHLIST_SORT_SHORT_LABELS.my_streaming).toBe("Streaming-Dienste");
    expect(DIARY_SORT_SHORT_LABELS.my_streaming).toBe("Streaming-Dienste");
    expect(DIARY_SORT_SHORT_LABELS.missing).toBe("Bewertung fehlt");
  });

  it("covers every option and stays <= 18 chars", () => {
    expect(Object.keys(WATCHLIST_SORT_SHORT_LABELS).sort()).toEqual(
      ["added", "genre", "has_ratings", "my_streaming", "tmdb_score", "unrated", "upcoming", "year"],
    );
    expect(Object.keys(DIARY_SORT_SHORT_LABELS).sort()).toEqual(
      ["all_rated", "genre", "liked", "missing", "my_diary", "my_streaming", "rating", "tmdb_score", "year"],
    );
    for (const l of [...Object.values(WATCHLIST_SORT_SHORT_LABELS), ...Object.values(DIARY_SORT_SHORT_LABELS)]) {
      expect(l.length).toBeLessThanOrEqual(18);
    }
  });
});
