import { fireEvent, render } from "@testing-library/react-native";

import { EntryFilterFlyout } from "@/components/entries/EntryFilterFlyout";
import { DEFAULT_ENTRY_FILTERS, type EntryFilters } from "@/lib/listFilters";

const GENRE_NAMES = new Map([
  ["18", "Drama"],
  ["35", "Komödie"],
]);

function setup(
  overrides: Partial<React.ComponentProps<typeof EntryFilterFlyout>> = {},
) {
  const onApply = jest.fn();
  const onClose = jest.fn();
  const props: React.ComponentProps<typeof EntryFilterFlyout> = {
    tab: "watchlist",
    testIDPrefix: "watchlist",
    visible: true,
    filters: DEFAULT_ENTRY_FILTERS,
    genreIds: ["18", "35"],
    genreNamesById: GENRE_NAMES,
    years: [2024, 2023],
    onClose,
    onApply,
    ...overrides,
  };
  return { onApply, onClose, props };
}

async function open(overrides?: Partial<React.ComponentProps<typeof EntryFilterFlyout>>) {
  const s = setup(overrides);
  const r = await render(<EntryFilterFlyout {...s.props} />);
  return { ...s, r };
}

describe("EntryFilterFlyout", () => {
  it("renders nothing while not visible", async () => {
    const { r } = await open({ visible: false });
    expect(r.queryByTestId("watchlist-filter-flyout")).toBeNull();
  });

  it("shows genre, year, streaming and liked sections", async () => {
    const { r } = await open();
    expect(r.getByTestId("watchlist-section-genre")).toBeTruthy();
    expect(r.getByTestId("watchlist-section-year")).toBeTruthy();
    expect(r.getByTestId("watchlist-section-streaming")).toBeTruthy();
    expect(r.getByTestId("watchlist-section-liked")).toBeTruthy();
    expect(r.getByTestId("watchlist-genre-pill-18")).toBeTruthy();
    expect(r.getByTestId("watchlist-year-pill-2024")).toBeTruthy();
  });

  it("watchlist tab shows watchlist rating-state flags only", async () => {
    const { r } = await open({ tab: "watchlist" });
    expect(r.getByTestId("watchlist-section-rating-state")).toBeTruthy();
    expect(r.getByTestId("watchlist-filter-upcoming")).toBeTruthy();
    expect(r.getByTestId("watchlist-filter-unrated")).toBeTruthy();
    expect(r.getByTestId("watchlist-filter-has_ratings")).toBeTruthy();
    expect(r.queryByTestId("watchlist-filter-all_rated")).toBeNull();
    expect(r.queryByTestId("watchlist-filter-missing")).toBeNull();
  });

  it("diary tab shows diary rating-state flags only", async () => {
    const { r } = await open({ tab: "diary", testIDPrefix: "tagebuch" });
    expect(r.getByTestId("tagebuch-filter-all_rated")).toBeTruthy();
    expect(r.getByTestId("tagebuch-filter-missing")).toBeTruthy();
    expect(r.queryByTestId("tagebuch-filter-upcoming")).toBeNull();
    expect(r.queryByTestId("tagebuch-filter-unrated")).toBeNull();
  });

  it("hideRatingState removes the rating-state section but keeps the others", async () => {
    const { r } = await open({ tab: "diary", testIDPrefix: "tagebuch", hideRatingState: true });
    expect(r.queryByTestId("tagebuch-section-rating-state")).toBeNull();
    expect(r.queryByTestId("tagebuch-filter-all_rated")).toBeNull();
    expect(r.getByTestId("tagebuch-section-liked")).toBeTruthy();
  });

  it("showNoDateYear adds the 'Kein Datum' year pill", async () => {
    const without = await open();
    expect(without.r.queryByTestId("watchlist-year-pill-no_date")).toBeNull();
    const withNoDate = await open({ showNoDateYear: true });
    expect(withNoDate.r.getByTestId("watchlist-year-pill-no_date")).toBeTruthy();
  });

  it("starts the draft from the applied filters", async () => {
    const { r } = await open({
      filters: { ...DEFAULT_ENTRY_FILTERS, genreIds: ["35"], year: 2023, liked: true },
    });
    expect(r.getByTestId("watchlist-genre-pill-35").props.accessibilityState).toMatchObject({ selected: true });
    expect(r.getByTestId("watchlist-genre-pill-18").props.accessibilityState).toMatchObject({ selected: false });
    expect(r.getByTestId("watchlist-year-pill-2023").props.accessibilityState).toMatchObject({ selected: true });
    expect(r.getByTestId("watchlist-filter-liked").props.accessibilityState).toMatchObject({ selected: true });
  });

  it("changes nothing outwards until Anwenden", async () => {
    const { r, onApply, onClose } = await open();
    await fireEvent.press(r.getByTestId("watchlist-genre-pill-18"));
    await fireEvent.press(r.getByTestId("watchlist-filter-liked"));
    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Anwenden passes the draft and closes", async () => {
    const { r, onApply, onClose } = await open();
    await fireEvent.press(r.getByTestId("watchlist-genre-pill-18"));
    await fireEvent.press(r.getByTestId("watchlist-genre-pill-35"));
    await fireEvent.press(r.getByTestId("watchlist-year-pill-2024"));
    await fireEvent.press(r.getByTestId("watchlist-filter-liked"));
    await fireEvent.press(r.getByTestId("watchlist-filter-apply"));
    const applied = onApply.mock.calls[0][0] as EntryFilters;
    expect(applied.genreIds.sort()).toEqual(["18", "35"]);
    expect(applied.year).toBe(2024);
    expect(applied.liked).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("toggling a genre or year twice deselects it", async () => {
    const { r, onApply } = await open();
    await fireEvent.press(r.getByTestId("watchlist-genre-pill-18"));
    await fireEvent.press(r.getByTestId("watchlist-genre-pill-18"));
    await fireEvent.press(r.getByTestId("watchlist-year-pill-2024"));
    await fireEvent.press(r.getByTestId("watchlist-year-pill-2024"));
    await fireEvent.press(r.getByTestId("watchlist-filter-apply"));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ genreIds: [], year: null }),
    );
  });

  it("Zurücksetzen clears the draft to defaults (applied only on Anwenden)", async () => {
    const { r, onApply } = await open({
      filters: { ...DEFAULT_ENTRY_FILTERS, genreIds: ["18"], year: 2023, liked: true, upcoming: true },
    });
    await fireEvent.press(r.getByTestId("watchlist-filter-reset"));
    expect(onApply).not.toHaveBeenCalled();
    expect(r.getByTestId("watchlist-genre-pill-18").props.accessibilityState).toMatchObject({ selected: false });
    await fireEvent.press(r.getByTestId("watchlist-filter-apply"));
    expect(onApply).toHaveBeenCalledWith(DEFAULT_ENTRY_FILTERS);
  });

  it("provider categories appear only while 'Meine Dienste' is on and keep at least one", async () => {
    const { r, onApply } = await open();
    expect(r.queryByTestId("watchlist-provider-categories")).toBeNull();
    await fireEvent.press(r.getByTestId("watchlist-streaming-mine"));
    expect(r.getByTestId("watchlist-provider-categories")).toBeTruthy();
    // default flatrate only: removing the last one is a no-op
    await fireEvent.press(r.getByTestId("watchlist-provider-category-flatrate"));
    await fireEvent.press(r.getByTestId("watchlist-provider-category-rent"));
    await fireEvent.press(r.getByTestId("watchlist-filter-apply"));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ myStreaming: true, providerCategories: ["flatrate", "rent"] }),
    );
  });

  it("watchlist: 'Keine Bewertung' and 'Mit Bewertungen' are mutually exclusive", async () => {
    const { r, onApply } = await open();
    await fireEvent.press(r.getByTestId("watchlist-filter-unrated"));
    await fireEvent.press(r.getByTestId("watchlist-filter-has_ratings"));
    await fireEvent.press(r.getByTestId("watchlist-filter-apply"));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ unrated: false, hasRatings: true }),
    );
  });

  it("diary: 'Alle bewertet' and 'Fehlt noch' are mutually exclusive", async () => {
    const { r, onApply } = await open({ tab: "diary", testIDPrefix: "tagebuch" });
    await fireEvent.press(r.getByTestId("tagebuch-filter-all_rated"));
    await fireEvent.press(r.getByTestId("tagebuch-filter-missing"));
    await fireEvent.press(r.getByTestId("tagebuch-filter-apply"));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ allRated: false, missing: true }),
    );
  });

  it("'Kommt noch' is independent of the unrated/hasRatings pair", async () => {
    const { r, onApply } = await open({
      filters: { ...DEFAULT_ENTRY_FILTERS, hasRatings: true },
    });
    await fireEvent.press(r.getByTestId("watchlist-filter-upcoming"));
    await fireEvent.press(r.getByTestId("watchlist-filter-apply"));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ upcoming: true, hasRatings: true }),
    );
  });

  it("re-opening starts again from the applied filters (discarded draft)", async () => {
    const s = setup();
    const r = await render(<EntryFilterFlyout {...s.props} />);
    await fireEvent.press(r.getByTestId("watchlist-filter-liked"));
    await r.rerender(<EntryFilterFlyout {...s.props} visible={false} />);
    await r.rerender(<EntryFilterFlyout {...s.props} visible />);
    expect(r.getByTestId("watchlist-filter-liked").props.accessibilityState).toMatchObject({ selected: false });
  });
});
