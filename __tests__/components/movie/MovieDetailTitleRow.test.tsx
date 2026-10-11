import { render } from "@testing-library/react-native";

import { MovieDetailTitleRow } from "@/components/movie/MovieDetailTitleRow";

describe("MovieDetailTitleRow", () => {
  it("renders the title text, left aligned (no centering) in accent colour", async () => {
    const { getByTestId } = await render(<MovieDetailTitleRow title="Alpha" />);
    const title = getByTestId("movie-detail-title");
    expect(title.props.children).toBe("Alpha");
    expect(title.props.className).not.toContain("text-center");
    expect(title.props.className).toContain("text-accent-light");
    expect(getByTestId("movie-detail-title-row").props.className).not.toContain("justify-center");
  });
});
