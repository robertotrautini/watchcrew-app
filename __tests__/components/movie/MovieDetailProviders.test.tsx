import { fireEvent, render } from "@testing-library/react-native";

import { MovieDetailProviders } from "@/components/movie/MovieDetailProviders";
import type { TmdbMovieProviders } from "@/lib/movieDetailTypes";

function provider(id: number, name: string) {
  return { provider_id: id, provider_name: name };
}

describe("MovieDetailProviders", () => {
  it("renders nothing when providers is null (no crash)", async () => {
    const { queryByTestId, queryByText } = await render(
      <MovieDetailProviders providers={null} />,
    );

    expect(queryByTestId("movie-detail-provider-0")).toBeNull();
    expect(queryByText("Flatrate")).toBeNull();
  });

  it("renders nothing when all three arrays are empty (no crash, no empty headers)", async () => {
    const providers: TmdbMovieProviders = { flatrate: [], rent: [], buy: [] };
    const { queryByTestId, queryByText } = await render(
      <MovieDetailProviders providers={providers} />,
    );

    expect(queryByTestId("movie-detail-provider-0")).toBeNull();
    expect(queryByText("Flatrate")).toBeNull();
  });

  it("renders everything with no toggle for a small provider set (toggle not needed)", async () => {
    const providers: TmdbMovieProviders = {
      flatrate: [provider(1, "Netflix")],
      rent: [],
      buy: [],
    };

    const { queryByTestId, getByText } = await render(
      <MovieDetailProviders providers={providers} />,
    );

    expect(getByText("Flatrate")).toBeTruthy();
    expect(getByText("Netflix")).toBeTruthy();
    expect(queryByTestId("movie-detail-providers-toggle")).toBeNull();
  });

  it("starts collapsed showing exactly 3 preview items for a large/multi-section set, expands on tap, collapses again on second tap", async () => {
    const providers: TmdbMovieProviders = {
      flatrate: [provider(1, "Netflix"), provider(2, "Disney+")],
      rent: [provider(3, "Apple TV")],
      buy: [provider(4, "Google Play"), provider(5, "Amazon Video")],
    };

    const { getByTestId, queryByTestId, getByText, queryByText } = await render(
      <MovieDetailProviders providers={providers} />,
    );

    expect(getByTestId("movie-detail-provider-0")).toBeTruthy();
    expect(getByTestId("movie-detail-provider-1")).toBeTruthy();
    expect(getByTestId("movie-detail-provider-2")).toBeTruthy();
    expect(queryByTestId("movie-detail-provider-3")).toBeNull();
    // Flattened order flatrate -> rent -> buy: first 3 are Netflix, Disney+, Apple TV.
    expect(getByText("Netflix")).toBeTruthy();
    expect(getByText("Disney+")).toBeTruthy();
    expect(getByText("Apple TV")).toBeTruthy();
    expect(queryByText("Google Play")).toBeNull();

    await fireEvent.press(getByTestId("movie-detail-providers-toggle"));

    expect(getByTestId("movie-detail-provider-4")).toBeTruthy();
    expect(getByText("Google Play")).toBeTruthy();
    expect(getByText("Amazon Video")).toBeTruthy();

    await fireEvent.press(getByTestId("movie-detail-providers-toggle"));

    expect(queryByTestId("movie-detail-provider-3")).toBeNull();
    expect(queryByText("Google Play")).toBeNull();
  });

  it("gives the 'Alle Anbieter anzeigen' toggle its own vertical spacing so it never sits on the provider rows", async () => {
    const providers: TmdbMovieProviders = {
      flatrate: [provider(1, "A"), provider(2, "B"), provider(3, "C"), provider(4, "D")],
      rent: [],
      buy: [],
    };
    const { getByTestId } = await render(<MovieDetailProviders providers={providers} />);

    const cls = getByTestId("movie-detail-providers-toggle").props.className as string;
    expect(cls).toMatch(/\bmt-\d/);
    expect(cls).toContain("min-h-touch-comfortable");
  });

  it("the 'Alle Anbieter anzeigen' toggle is at least 48dp high", async () => {
    const providers: TmdbMovieProviders = {
      flatrate: [provider(1, "A"), provider(2, "B"), provider(3, "C"), provider(4, "D")],
      rent: [],
      buy: [],
    };
    const { getByTestId } = await render(<MovieDetailProviders providers={providers} />);
    expect(getByTestId("movie-detail-providers-toggle").props.className).toContain("min-h-touch-comfortable");
  });
});
