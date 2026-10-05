import { fireEvent, render } from "@testing-library/react-native";

import { MovieDetailCastRow } from "@/components/movie/MovieDetailCastRow";
import type { TmdbCastMember, TmdbCrewMember } from "@/lib/movieDetailTypes";

const director: TmdbCrewMember = { id: 10, name: "Jane Director", job: "Director" };
const cast: TmdbCastMember[] = [
  { id: 1, name: "Actor One", character: "Hero" },
  { id: 2, name: "Actor Two", character: "Villain" },
];

describe("MovieDetailCastRow", () => {
  it("renders the director and calls onDirectorPress with their id on tap", async () => {
    const onDirectorPress = jest.fn();
    const onCastMemberPress = jest.fn();

    const { getByTestId } = await render(
      <MovieDetailCastRow
        director={director}
        cast={[]}
        onDirectorPress={onDirectorPress}
        onCastMemberPress={onCastMemberPress}
      />,
    );

    await fireEvent.press(getByTestId("movie-detail-director"));

    expect(onDirectorPress).toHaveBeenCalledWith(10);
  });

  it("renders no director element when director is null (no crash)", async () => {
    const { queryByTestId } = await render(
      <MovieDetailCastRow
        director={null}
        cast={[]}
        onDirectorPress={jest.fn()}
        onCastMemberPress={jest.fn()}
      />,
    );

    expect(queryByTestId("movie-detail-director")).toBeNull();
  });

  it("renders each cast member and calls onCastMemberPress with the correct id on tap", async () => {
    const onCastMemberPress = jest.fn();

    const { getByTestId } = await render(
      <MovieDetailCastRow
        director={null}
        cast={cast}
        onDirectorPress={jest.fn()}
        onCastMemberPress={onCastMemberPress}
      />,
    );

    await fireEvent.press(getByTestId("movie-detail-cast-member-0"));
    expect(onCastMemberPress).toHaveBeenCalledWith(1);

    await fireEvent.press(getByTestId("movie-detail-cast-member-1"));
    expect(onCastMemberPress).toHaveBeenCalledWith(2);
  });

  it("renders zero cast-member testIDs for an empty cast array (no crash)", async () => {
    const { queryByTestId } = await render(
      <MovieDetailCastRow
        director={null}
        cast={[]}
        onDirectorPress={jest.fn()}
        onCastMemberPress={jest.fn()}
      />,
    );

    expect(queryByTestId("movie-detail-cast-member-0")).toBeNull();
  });
});

describe("MovieDetailCastRow gold frame", () => {
  it("frames the cast block with faint gold hairlines", async () => {
    const { render } = require("@testing-library/react-native");
    const { MovieDetailCastRow } = require("@/components/movie/MovieDetailCastRow");
    const view = await render(
      <MovieDetailCastRow
        director={null}
        cast={[{ id: 1, name: "A", character: "B", profile_path: null }]}
        onDirectorPress={() => {}}
        onCastMemberPress={() => {}}
      />,
    );
    const cls = view.getByTestId("movie-detail-cast-frame").props.className as string;
    expect(cls).toContain("border-y");
    expect(cls).toContain("border-accent-a30");
  });

  it("uses the same gold hairline colour above Regie as around the cast block", async () => {
    const { render } = require("@testing-library/react-native");
    const { MovieDetailCastRow } = require("@/components/movie/MovieDetailCastRow");
    const view = await render(
      <MovieDetailCastRow director={director} cast={[]} onDirectorPress={() => {}} onCastMemberPress={() => {}} />,
    );
    const cls = view.getByTestId("movie-detail-director").parent?.props.className as string;
    expect(cls).toContain("border-t");
    expect(cls).toContain("border-accent-a30");
  });

  it("the director link is at least 48dp high", async () => {
    const { getByTestId } = await render(
      <MovieDetailCastRow
        director={{ id: 1, name: "D" } as never}
        cast={[]}
        onDirectorPress={jest.fn()}
        onCastMemberPress={jest.fn()}
      />,
    );
    expect(getByTestId("movie-detail-director").props.className).toContain("min-h-touch-comfortable");
  });
});
