import {
  filterByProviderCategory,
  matchesOwnProviders,
  filterByMyStreaming,
} from "../../src/lib/movieProviderFilter";
import type { TmdbMovieProviders } from "../../src/lib/tmdbProxy";

// M6 part 2b: filters a list of tmdbId-bearing items down to only those
// available in a given provider category (flatrate/rent/buy), using an
// already-fetched tmdbId -> providers map (see src/hooks/useMoviesProviders.ts).

function makeProviders(overrides: Partial<TmdbMovieProviders> = {}): TmdbMovieProviders {
  return { flatrate: [], rent: [], buy: [], ...overrides };
}

const PROVIDER_REF = { provider_id: 1, provider_name: "Netflix" };

describe("filterByProviderCategory", () => {
  it("returns items unchanged when category is null (passthrough), even with an empty map", () => {
    const items = [{ tmdbId: 1 }, { tmdbId: 2 }];

    expect(filterByProviderCategory(items, new Map(), null)).toEqual(items);
  });

  it("excludes items with no entry in the providers map when a category filter is active", () => {
    const items = [{ tmdbId: 1 }, { tmdbId: 2 }];
    const map = new Map([[1, makeProviders({ flatrate: [PROVIDER_REF] })]]);

    const result = filterByProviderCategory(items, map, "flatrate");

    expect(result).toEqual([{ tmdbId: 1 }]);
  });

  it("excludes items whose providers entry has an empty array for the given category", () => {
    const items = [{ tmdbId: 1 }, { tmdbId: 2 }];
    const map = new Map([
      [1, makeProviders({ rent: [PROVIDER_REF] })],
      [2, makeProviders({ rent: [] })],
    ]);

    const result = filterByProviderCategory(items, map, "rent");

    expect(result).toEqual([{ tmdbId: 1 }]);
  });

  it("returns a mixed result set matching only the requested category across items", () => {
    const items = [{ tmdbId: 1 }, { tmdbId: 2 }, { tmdbId: 3 }];
    const map = new Map([
      [1, makeProviders({ buy: [PROVIDER_REF] })],
      [2, makeProviders({ flatrate: [PROVIDER_REF] })],
      [3, makeProviders({ buy: [PROVIDER_REF] })],
    ]);

    const result = filterByProviderCategory(items, map, "buy");

    expect(result).toEqual([{ tmdbId: 1 }, { tmdbId: 3 }]);
  });

  it("returns an empty array when the map is empty and a category filter is active", () => {
    const items = [{ tmdbId: 1 }, { tmdbId: 2 }];

    expect(filterByProviderCategory(items, new Map(), "flatrate")).toEqual([]);
  });

  it("preserves extra fields on items beyond tmdbId", () => {
    const items = [{ tmdbId: 1, title: "Movie One" }];
    const map = new Map([[1, makeProviders({ flatrate: [PROVIDER_REF] })]]);

    expect(filterByProviderCategory(items, map, "flatrate")).toEqual([
      { tmdbId: 1, title: "Movie One" },
    ]);
  });
});

describe("matchesOwnProviders", () => {
  const netflix = { provider_id: 8, provider_name: "Netflix" };
  const disney = { provider_id: 337, provider_name: "Disney+" };

  it("is false without providers data", () => {
    expect(matchesOwnProviders(undefined, ["flatrate"], [8])).toBe(false);
  });

  it("requires an OWN provider (by id) inside one of the active categories", () => {
    const p = makeProviders({ flatrate: [disney], rent: [netflix] });
    expect(matchesOwnProviders(p, ["flatrate"], [8])).toBe(false);
    expect(matchesOwnProviders(p, ["rent"], [8])).toBe(true);
    expect(matchesOwnProviders(p, ["flatrate", "rent"], [8])).toBe(true);
    expect(matchesOwnProviders(p, ["buy"], [8])).toBe(false);
  });

  it("with no own services selected, any provider in an active category counts", () => {
    const p = makeProviders({ flatrate: [disney] });
    expect(matchesOwnProviders(p, ["flatrate"], [])).toBe(true);
    expect(matchesOwnProviders(p, ["rent"], [])).toBe(false);
  });
});

describe("filterByProviderCategory with own services", () => {
  it("narrows the category match to the user's own provider ids when given", () => {
    const items = [{ tmdbId: 1 }, { tmdbId: 2 }];
    const map = new Map([
      [1, makeProviders({ flatrate: [{ provider_id: 8, provider_name: "Netflix" }] })],
      [2, makeProviders({ flatrate: [{ provider_id: 9, provider_name: "Prime" }] })],
    ]);

    expect(filterByProviderCategory(items, map, "flatrate", [8])).toEqual([{ tmdbId: 1 }]);
    expect(filterByProviderCategory(items, map, "flatrate", [])).toEqual(items);
    expect(filterByProviderCategory(items, map, null, [8])).toEqual(items);
  });
});

describe("filterByMyStreaming (Add-Movie streaming toggle)", () => {
  it("keeps items available at an own provider in ANY category", () => {
    const items = [{ tmdbId: 1 }, { tmdbId: 2 }, { tmdbId: 3 }];
    const map = new Map([
      [1, makeProviders({ buy: [{ provider_id: 8, provider_name: "Netflix" }] })],
      [2, makeProviders({ flatrate: [{ provider_id: 9, provider_name: "Prime" }] })],
    ]);

    expect(filterByMyStreaming(items, map, [8])).toEqual([{ tmdbId: 1 }]);
  });
});
