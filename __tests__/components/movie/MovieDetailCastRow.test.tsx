import { fireEvent, render } from "@testing-library/react-native";

import {
  MovieDetailCastRow,
  MovieDetailDirector,
} from "@/components/movie/MovieDetailCastRow";
import type { TmdbCastMember, TmdbCrewMember } from "@/lib/movieDetailTypes";

const director: TmdbCrewMember = { id: 10, name: "Jane Director", job: "Director" };
const cast: TmdbCastMember[] = [
  { id: 1, name: "Actor One", character: "Hero" },
  { id: 2, name: "Actor Two", character: "Villain" },
];

describe("MovieDetailDirector", () => {
  it("renders the director and calls onDirectorPress with their id on tap", async () => {
    const onDirectorPress = jest.fn();
    const { getByTestId, getByText } = await render(
      <MovieDetailDirector director={director} onDirectorPress={onDirectorPress} />,
    );
    expect(getByText("Jane Director")).toBeTruthy();
    await fireEvent.press(getByTestId("movie-detail-director"));
    expect(onDirectorPress).toHaveBeenCalledWith(10);
  });

  it("the director link has no min-h/padding (tap area via hitSlop) and the row is left aligned", async () => {
    const { getByTestId } = await render(
      <MovieDetailDirector director={director} onDirectorPress={jest.fn()} />,
    );
    const link = getByTestId("movie-detail-director");
    expect(link.props.className).not.toMatch(/min-h|\bp[tby]?-|\bm[tby]?-/);
    expect(link.props.hitSlop).toEqual(expect.objectContaining({ top: 12, bottom: 12 }));
    expect(getByTestId("movie-detail-director-row").props.className).toContain("items-start");
  });
});

describe("MovieDetailCastRow", () => {
  it("renders each cast member and calls onCastMemberPress with the correct id on tap", async () => {
    const onCastMemberPress = jest.fn();
    const { getByTestId } = await render(
      <MovieDetailCastRow cast={cast} onCastMemberPress={onCastMemberPress} />,
    );
    await fireEvent.press(getByTestId("movie-detail-cast-member-0"));
    expect(onCastMemberPress).toHaveBeenCalledWith(1);
    await fireEvent.press(getByTestId("movie-detail-cast-member-1"));
    expect(onCastMemberPress).toHaveBeenCalledWith(2);
  });

  it("renders nothing for an empty cast array (no crash)", async () => {
    const { queryByTestId } = await render(
      <MovieDetailCastRow cast={[]} onCastMemberPress={jest.fn()} />,
    );
    expect(queryByTestId("movie-detail-cast-frame")).toBeNull();
    expect(queryByTestId("movie-detail-cast-member-0")).toBeNull();
  });

  it("has no own border or padding (section provides lines and spacing)", async () => {
    const { getByTestId } = await render(
      <MovieDetailCastRow cast={cast} onCastMemberPress={jest.fn()} />,
    );
    expect(getByTestId("movie-detail-cast-frame").props.className).not.toMatch(/border|\bp[tby]?-/);
  });
});
