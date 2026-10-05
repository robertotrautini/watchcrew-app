import { queryKeys } from "@/lib/queryKeys";

describe("queryKeys", () => {
  it("builds the exact key values the persisted cache already uses", () => {
    expect(queryKeys.userGroups.all).toEqual(["userGroups"]);
    expect(queryKeys.userGroups.byUser("u1")).toEqual(["userGroups", "u1"]);
    expect(queryKeys.userGroups.byUser(undefined)).toEqual(["userGroups", undefined]);
    expect(queryKeys.ownProfile.all).toEqual(["ownProfile"]);
    expect(queryKeys.ownProfile.byUser("u1")).toEqual(["ownProfile", "u1"]);
    expect(queryKeys.groupDetails.all).toEqual(["groupDetails"]);
    expect(queryKeys.groupDetails.byGroup("g1")).toEqual(["groupDetails", "g1"]);
    expect(queryKeys.groupMembers.all).toEqual(["groupMembers"]);
    expect(queryKeys.groupMembers.byGroup("g1")).toEqual(["groupMembers", "g1"]);
    expect(queryKeys.groupNames.all).toEqual(["groupNames"]);
    expect(queryKeys.groupNames.byIds(["a", "b"])).toEqual(["groupNames", ["a", "b"]]);
    expect(queryKeys.watchlist.all).toEqual(["watchlist"]);
    expect(queryKeys.watchlist.byGroup("g1")).toEqual(["watchlist", "g1"]);
    expect(queryKeys.pushSubscription.byGroupUser("g1", "u1")).toEqual(["pushSubscription", "g1", "u1"]);
    expect(queryKeys.movieDetail(5)).toEqual(["movieDetail", 5]);
    expect(queryKeys.movieProviders(5)).toEqual(["movieProviders", 5]);
    expect(queryKeys.similarMovies(5)).toEqual(["similarMovies", 5]);
    expect(queryKeys.collection(3, 5)).toEqual(["collection", 3, 5]);
    expect(queryKeys.directorFilmography(7)).toEqual(["directorFilmography", 7]);
    expect(queryKeys.actorFilmography(7)).toEqual(["actorFilmography", 7]);
    expect(queryKeys.studioFilmography(7)).toEqual(["studioFilmography", 7]);
    expect(queryKeys.providersList).toEqual(["providersList"]);
    expect(queryKeys.streamingProviders([1, 2])).toEqual(["streamingProviders", [1, 2]]);
    expect(queryKeys.movieSearch("x")).toEqual(["movieSearch", "x"]);
    expect(queryKeys.personSearch("x")).toEqual(["personSearch", "x"]);
    expect(queryKeys.companySearch("x")).toEqual(["companySearch", "x"]);
  });

  it("keeps the non-persisted search roots at queryKey[0]", () => {
    expect(queryKeys.movieSearch("x")[0]).toBe("movieSearch");
    expect(queryKeys.personSearch("x")[0]).toBe("personSearch");
    expect(queryKeys.companySearch("x")[0]).toBe("companySearch");
  });

  it("is JSON-safe", () => {
    const k = queryKeys.collection(1, 2);
    expect(JSON.parse(JSON.stringify(k))).toEqual(k);
  });
});
