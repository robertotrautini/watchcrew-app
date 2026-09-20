import { fireEvent, render } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: (props: Record<string, unknown>) => <View {...props} />,
  };
});

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
