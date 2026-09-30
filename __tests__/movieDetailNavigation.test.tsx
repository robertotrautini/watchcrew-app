import { act, fireEvent, renderRouter, screen } from "expo-router/testing-library";
import { Pressable, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  navigateToActorFilmography,
  navigateToCollection,
  navigateToDirectorFilmography,
  navigateToMovieDetail,
} from "@/lib/movieDetailNavigation";

function MovieStub() {
  const router = useRouter();
  return (
    <>
      <Pressable testID="go-director" onPress={() => navigateToDirectorFilmography(router, 525)}>
        <Text>dir</Text>
      </Pressable>
      <Pressable testID="go-actor" onPress={() => navigateToActorFilmography(router, 7)}>
        <Text>act</Text>
      </Pressable>
      <Pressable testID="go-collection" onPress={() => navigateToCollection(router, 10, 603)}>
        <Text>col</Text>
      </Pressable>
    </>
  );
}
function DirectorStub() {
  const p = useLocalSearchParams();
  return <Text testID="director-screen">{String(p.personId)}</Text>;
}
function ActorStub() {
  const p = useLocalSearchParams();
  return <Text testID="actor-screen">{String(p.personId)}</Text>;
}
function CollectionStub() {
  const p = useLocalSearchParams();
  return <Text testID="collection-params">{`${p.collectionId}|${p.tmdbId}`}</Text>;
}

async function mount() {
  await renderRouter(
    {
      "(app)/(modals)/movie/[tmdbId]": MovieStub,
      "(app)/(modals)/filmography/director/[personId]": DirectorStub,
      "(app)/(modals)/filmography/actor/[personId]": ActorStub,
      "(app)/(modals)/collection/[collectionId]": CollectionStub,
    },
    { initialUrl: "/movie/603" },
  );
}

describe("movieDetailNavigation in a real router", () => {
  it("director push opens director filmography", async () => {
    await mount();
    await fireEvent.press(screen.getByTestId("go-director"));
    expect(await screen.findByTestId("director-screen")).toHaveTextContent("525");
  });
  it("actor push opens actor filmography", async () => {
    await mount();
    await fireEvent.press(screen.getByTestId("go-actor"));
    expect(await screen.findByTestId("actor-screen")).toHaveTextContent("7");
  });
  it("collection push carries collectionId and tmdbId", async () => {
    await mount();
    await fireEvent.press(screen.getByTestId("go-collection"));
    expect(await screen.findByTestId("collection-params")).toHaveTextContent("10|603");
  });
});

describe("navigateToMovieDetail", () => {
  it("pushes the movie overlay with group context params", () => {
    const router = { push: jest.fn() } as unknown as Parameters<typeof navigateToMovieDetail>[0];
    navigateToMovieDetail(router, { tmdbId: 603, groupId: "g1", source: "diary", watchlistEntryId: "e1" });
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/movie/[tmdbId]",
      params: { tmdbId: "603", groupId: "g1", source: "diary", watchlistEntryId: "e1" },
    });
  });
});
