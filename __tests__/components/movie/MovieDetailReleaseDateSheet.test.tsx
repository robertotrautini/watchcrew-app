import { fireEvent, render } from "@testing-library/react-native";

const mockSetReleaseDateMutate = jest.fn();

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View {...props} />,
  };
});

jest.mock("@/hooks/useMovieDetailMutations", () => ({
  useSetReleaseDateOverride: () => ({ mutate: mockSetReleaseDateMutate, isPending: false }),
}));

import { MovieDetailReleaseDateSheet } from "@/components/movie/MovieDetailReleaseDateSheet";

describe("MovieDetailReleaseDateSheet", () => {
  beforeEach(() => mockSetReleaseDateMutate.mockClear());

  function renderSheet(extra: Record<string, unknown> = {}) {
    const onClose = jest.fn();
    const utils = render(
      <MovieDetailReleaseDateSheet
        visible
        onClose={onClose}
        groupId="group-1"
        watchlistEntryId="entry-1"
        releaseDate="2026-12-24"
        {...extra}
      />,
    );
    return { onClose, utils };
  }

  it("shows the 'Eintrag bearbeiten' sheet with the date as DD.MM.YYYY", async () => {
    const { utils } = renderSheet();
    const { getByTestId, getByText } = await utils;
    expect(getByTestId("movie-detail-release-date-field")).toBeTruthy();
    expect(getByText("Eintrag bearbeiten")).toBeTruthy();
    expect(getByText("24.12.2026")).toBeTruthy();
  });

  it("renders nothing when not visible", async () => {
    const { utils } = renderSheet({ visible: false });
    const { queryByTestId } = await utils;
    expect(queryByTestId("movie-detail-release-date-field")).toBeNull();
  });

  async function pickDate(getByTestId: (id: string) => any) {
    await fireEvent.press(getByTestId("movie-detail-release-date-field"));
    await fireEvent(
      getByTestId("movie-detail-release-date-field-picker"),
      "change",
      { type: "set" },
      new Date(2027, 2, 5),
    );
  }

  it("picking a date only changes the draft: nothing saved, sheet stays open", async () => {
    const { utils, onClose } = renderSheet();
    const { getByTestId, getByText } = await utils;
    await pickDate(getByTestId);
    expect(getByText("05.03.2027")).toBeTruthy();
    expect(mockSetReleaseDateMutate).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Speichern saves the picked date as ISO and closes the sheet", async () => {
    const { utils, onClose } = renderSheet();
    const { getByTestId } = await utils;
    await pickDate(getByTestId);
    await fireEvent.press(getByTestId("movie-detail-release-date-save-button"));
    expect(mockSetReleaseDateMutate).toHaveBeenCalledWith({
      watchlistEntryId: "entry-1",
      groupId: "group-1",
      releaseDate: "2027-03-05",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("Abbrechen discards the draft: nothing saved, sheet closes", async () => {
    const { utils, onClose } = renderSheet();
    const { getByTestId } = await utils;
    await pickDate(getByTestId);
    await fireEvent.press(getByTestId("movie-detail-release-date-cancel-button"));
    expect(mockSetReleaseDateMutate).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("offers reset to the TMDB date only when an override exists; reset is a draft until Speichern, then saves null", async () => {
    const first = renderSheet();
    const a = await first.utils;
    expect(a.queryByTestId("movie-detail-release-date-reset")).toBeNull();
    await a.unmount();

    const { utils, onClose } = renderSheet({ hasReleaseDateOverride: true });
    const { getByTestId } = await utils;
    await fireEvent.press(getByTestId("movie-detail-release-date-reset"));
    expect(mockSetReleaseDateMutate).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    await fireEvent.press(getByTestId("movie-detail-release-date-save-button"));
    expect(mockSetReleaseDateMutate).toHaveBeenCalledWith({
      watchlistEntryId: "entry-1",
      groupId: "group-1",
      releaseDate: null,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("reset + Abbrechen saves nothing", async () => {
    const { utils } = renderSheet({ hasReleaseDateOverride: true });
    const { getByTestId } = await utils;
    await fireEvent.press(getByTestId("movie-detail-release-date-reset"));
    await fireEvent.press(getByTestId("movie-detail-release-date-cancel-button"));
    expect(mockSetReleaseDateMutate).not.toHaveBeenCalled();
  });

  it("works with an empty initial date: placeholder shown, no reset button, picking + Speichern saves", async () => {
    const { utils, onClose } = renderSheet({ releaseDate: null });
    const { getByTestId, getByText, queryByTestId } = await utils;
    expect(getByText("Datum wählen")).toBeTruthy();
    expect(queryByTestId("movie-detail-release-date-reset")).toBeNull();
    await pickDate(getByTestId);
    await fireEvent.press(getByTestId("movie-detail-release-date-save-button"));
    expect(mockSetReleaseDateMutate).toHaveBeenCalledWith({
      watchlistEntryId: "entry-1",
      groupId: "group-1",
      releaseDate: "2027-03-05",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("does not save without a watchlist entry/group", async () => {
    const { utils } = renderSheet({ watchlistEntryId: undefined });
    const { getByTestId } = await utils;
    await pickDate(getByTestId);
    await fireEvent.press(getByTestId("movie-detail-release-date-save-button"));
    expect(mockSetReleaseDateMutate).not.toHaveBeenCalled();
  });
});
