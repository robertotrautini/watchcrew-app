import { fireEvent, render } from "@testing-library/react-native";

import { MovieDetailMetaRow } from "@/components/movie/MovieDetailMetaRow";

describe("MovieDetailMetaRow", () => {
  it("renders both runtime and release date when both are present", async () => {
    const { getByTestId } = await render(
      <MovieDetailMetaRow
        runtimeLabel="2h 14min"
        releaseInfo={{ label: "Kinostart", date: "12.03.2024" }}
      />,
    );

    expect(getByTestId("movie-detail-runtime").props.children).toBe("2h 14min");
    expect(getByTestId("movie-detail-release-date").props.children).toBe("Kinostart 12.03.2024");
  });

  it("renders only the runtime when releaseInfo is null", async () => {
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailMetaRow runtimeLabel="2h 14min" releaseInfo={null} />,
    );

    expect(getByTestId("movie-detail-runtime")).toBeTruthy();
    expect(queryByTestId("movie-detail-release-date")).toBeNull();
  });

  it("renders only the release date when runtimeLabel is null", async () => {
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailMetaRow
        runtimeLabel={null}
        releaseInfo={{ label: "Kinostart", date: "12.03.2024" }}
      />,
    );

    expect(queryByTestId("movie-detail-runtime")).toBeNull();
    expect(getByTestId("movie-detail-release-date")).toBeTruthy();
  });

  it("renders neither (empty row, no crash) when both are null", async () => {
    const { queryByTestId, getByTestId } = await render(
      <MovieDetailMetaRow runtimeLabel={null} releaseInfo={null} />,
    );

    expect(getByTestId("movie-detail-meta-row")).toBeTruthy();
    expect(queryByTestId("movie-detail-runtime")).toBeNull();
    expect(queryByTestId("movie-detail-release-date")).toBeNull();
  });

  it("keeps the release date a plain, non-pressable text without onEditReleaseDate", async () => {
    const { queryByTestId } = await render(
      <MovieDetailMetaRow runtimeLabel={null} releaseInfo={{ label: "Kino", date: "12.03.2024" }} />,
    );
    expect(queryByTestId("movie-detail-release-date-edit")).toBeNull();
  });

  it("makes the release date a tappable button with edit icon when onEditReleaseDate is given", async () => {
    const onEdit = jest.fn();
    const { getByTestId } = await render(
      <MovieDetailMetaRow
        runtimeLabel={null}
        releaseInfo={{ label: "Kino", date: "12.03.2024" }}
        onEditReleaseDate={onEdit}
      />,
    );
    const edit = getByTestId("movie-detail-release-date-edit");
    expect(edit.props.accessibilityRole).toBe("button");
    expect(edit.props.accessibilityLabel).toBe("Erscheinungsdatum ändern");
    expect(getByTestId("movie-detail-release-date").props.children).toBe("Kino 12.03.2024");
    await fireEvent.press(edit);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("shows a tappable 'Kein Datum' placeholder when there is no date but onEditReleaseDate is given", async () => {
    const onEdit = jest.fn();
    const { getByTestId } = await render(
      <MovieDetailMetaRow runtimeLabel="2h" releaseInfo={null} onEditReleaseDate={onEdit} />,
    );
    const edit = getByTestId("movie-detail-release-date-edit");
    expect(edit.props.accessibilityLabel).toBe("Erscheinungsdatum ändern");
    expect(getByTestId("movie-detail-release-date").props.children).toBe("Kein Datum");
    await fireEvent.press(edit);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("uses explicit style gaps (no className gap) and wraps", async () => {
    const { META_ROW_GAP, META_ROW_ROW_GAP } = require("@/components/movie/MovieDetailMetaRow");
    const { StyleSheet } = require("react-native");
    const { getByTestId } = await render(
      <MovieDetailMetaRow runtimeLabel="2h" releaseInfo={{ label: "Kino", date: "01.01.2024" }} />,
    );
    const row = getByTestId("movie-detail-meta-row");
    const cls = row.props.className as string;
    expect(cls).toContain("flex-row");
    expect(cls).toContain("flex-wrap");
    expect(cls).not.toMatch(/gap-/);
    expect(META_ROW_GAP).toBe(8);
    expect(META_ROW_ROW_GAP).toBe(6);
    expect(StyleSheet.flatten(row.props.style).rowGap).toBe(META_ROW_ROW_GAP);
    const sep = getByTestId("movie-detail-meta-separator-0");
    expect(sep.props.children).toBe("\u00B7");
    const flat = StyleSheet.flatten(sep.props.style);
    expect(flat.marginLeft).toBe(META_ROW_GAP);
    expect(flat.marginRight).toBe(META_ROW_GAP);
  });

  it("renders separators only between present items", async () => {
    const { Text } = require("react-native");
    const trailing = <Text testID="trailing-item">x</Text>;
    const all = await render(
      <MovieDetailMetaRow runtimeLabel="2h" releaseInfo={{ label: "Kino", date: "d" }} trailing={trailing} />,
    );
    expect(all.queryAllByTestId(/^movie-detail-meta-separator-/)).toHaveLength(2);
    all.unmount();
    const noRuntime = await render(
      <MovieDetailMetaRow runtimeLabel={null} releaseInfo={{ label: "Kino", date: "d" }} trailing={trailing} />,
    );
    expect(noRuntime.queryAllByTestId(/^movie-detail-meta-separator-/)).toHaveLength(1);
    noRuntime.unmount();
    const onlyTrailing = await render(
      <MovieDetailMetaRow runtimeLabel={null} releaseInfo={null} trailing={trailing} />,
    );
    expect(onlyTrailing.queryAllByTestId(/^movie-detail-meta-separator-/)).toHaveLength(0);
    onlyTrailing.unmount();
    const two = await render(<MovieDetailMetaRow runtimeLabel="2h" releaseInfo={null} />);
    expect(two.queryAllByTestId(/^movie-detail-meta-separator-/)).toHaveLength(0);
  });
});
