import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { SearchResultsArea } from "@/components/ui/SearchResultsArea";

const base = {
  testID: "area",
  loadingTestID: "area-loading",
  emptyTestID: "area-empty",
  emptyIcon: "person" as const,
  emptyTitle: "Nichts da",
};

describe("SearchResultsArea", () => {
  it("renders a flex-1 wrapper that holds exactly one state", async () => {
    const { getByTestId } = await render(
      <SearchResultsArea {...base} isEmpty>
        <Text>x</Text>
      </SearchResultsArea>,
    );
    expect(getByTestId("area").props.className).toContain("flex-1");
  });

  it("empty: EmptyState sits directly in the flex-1 wrapper (no ScrollView around it)", async () => {
    const { getByTestId, queryByTestId } = await render(
      <SearchResultsArea {...base} isEmpty>
        <Text>x</Text>
      </SearchResultsArea>,
    );
    const empty = getByTestId("area-empty");
    expect(empty.props.className).toContain("flex-1");
    expect(empty.props.className).toContain("justify-center");
    expect(empty.props.className).toContain("items-center");
    expect(queryByTestId("area-scroll")).toBeNull();
    expect(queryByTestId("area-loading")).toBeNull();
  });

  it("content: scroll=true renders a ScrollView with flex-grow content", async () => {
    const { getByTestId } = await render(
      <SearchResultsArea {...base} scroll>
        <Text testID="child">x</Text>
      </SearchResultsArea>,
    );
    const scroll = getByTestId("area-scroll");
    expect(scroll.props.contentContainerClassName).toContain("flex-grow");
    expect(getByTestId("child")).toBeTruthy();
  });

  it("content: scroll=false renders children directly in the wrapper", async () => {
    const { queryByTestId, getByTestId } = await render(
      <SearchResultsArea {...base}>
        <Text testID="child">x</Text>
      </SearchResultsArea>,
    );
    expect(queryByTestId("area-scroll")).toBeNull();
    expect(getByTestId("child")).toBeTruthy();
  });

  it("loading and error replace content", async () => {
    const { getByTestId, queryByTestId, rerender } = await render(
      <SearchResultsArea {...base} isLoading>
        <Text testID="child">x</Text>
      </SearchResultsArea>,
    );
    expect(getByTestId("area-loading")).toBeTruthy();
    expect(queryByTestId("child")).toBeNull();
    await rerender(
      <SearchResultsArea {...base} isError errorTestID="area-error" errorMessage="Kaputt">
        <Text testID="child">x</Text>
      </SearchResultsArea>,
    );
    expect(getByTestId("area-error")).toBeTruthy();
    expect(queryByTestId("child")).toBeNull();
  });
});
