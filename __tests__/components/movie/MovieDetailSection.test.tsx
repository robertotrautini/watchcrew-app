import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import {
  MOVIE_DETAIL_SECTION_GAP_CLASSNAME,
  MOVIE_DETAIL_SECTION_PADDING_CLASSNAME,
  MovieDetailSection,
} from "@/components/movie/MovieDetailSection";

describe("MovieDetailSection", () => {
  it("renders testID, title and children, left aligned with uniform py-4", async () => {
    const { getByTestId, getByText } = await render(
      <MovieDetailSection name="details" title="Details">
        <Text>inhalt</Text>
      </MovieDetailSection>,
    );
    const section = getByTestId("movie-detail-section-details");
    expect(section.props.className).toContain("items-start");
    expect(section.props.className).toContain("py-4");
    expect(getByText("Details")).toBeTruthy();
    expect(getByText("inhalt")).toBeTruthy();
    expect(getByTestId("movie-detail-section-details-title").props.className).toContain("uppercase");
  });

  it("has no heading without title and a thin top divider only with withDivider", async () => {
    const { getByTestId, queryByTestId, rerender } = await render(
      <MovieDetailSection name="info">
        <Text>x</Text>
      </MovieDetailSection>,
    );
    expect(queryByTestId("movie-detail-section-info-title")).toBeNull();
    expect(getByTestId("movie-detail-section-info").props.className).not.toContain("border-t");
    await rerender(
      <MovieDetailSection name="info" withDivider>
        <Text>x</Text>
      </MovieDetailSection>,
    );
    const cls = getByTestId("movie-detail-section-info").props.className as string;
    expect(cls).toContain("border-t");
    expect(cls).toContain("border-glass-border");
  });

  it("uses the shared spacing constants (py-4, gap-2)", async () => {
    expect(MOVIE_DETAIL_SECTION_PADDING_CLASSNAME).toBe("py-4");
    expect(MOVIE_DETAIL_SECTION_GAP_CLASSNAME).toBe("gap-2");
    const { getByTestId } = await render(
      <MovieDetailSection name="x" title="T">
        <Text>c</Text>
      </MovieDetailSection>,
    );
    const cls = getByTestId("movie-detail-section-x").props.className as string;
    expect(cls).toContain("gap-2");
    expect(cls).toContain("py-4");
  });
});
