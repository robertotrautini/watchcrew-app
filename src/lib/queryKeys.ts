/**
 * Central TanStack Query key factory. Key VALUES are persisted (see
 * queryPersistence.ts) and `queryKey[0]` roots are matched by
 * NON_PERSISTED_ROOTS -- do not change a value without bumping
 * CACHE_SCHEMA_VERSION. Keys must stay JSON-safe.
 *
 * `.all` is the bare root (prefix match for invalidation).
 */
export const queryKeys = {
  userGroups: {
    all: ["userGroups"] as const,
    byUser: (userId: string | undefined) => ["userGroups", userId] as const,
  },
  ownProfile: {
    all: ["ownProfile"] as const,
    byUser: (userId: string | undefined) => ["ownProfile", userId] as const,
  },
  groupDetails: {
    all: ["groupDetails"] as const,
    byGroup: (groupId: string | undefined) => ["groupDetails", groupId] as const,
  },
  groupMembers: {
    all: ["groupMembers"] as const,
    byGroup: (groupId: string | undefined) => ["groupMembers", groupId] as const,
  },
  groupNames: {
    all: ["groupNames"] as const,
    byIds: (groupIds: string[]) => ["groupNames", groupIds] as const,
  },
  watchlist: {
    all: ["watchlist"] as const,
    byGroup: (groupId: string | undefined) => ["watchlist", groupId] as const,
  },
  pushSubscription: {
    byGroupUser: (groupId: string | undefined, userId: string | undefined) =>
      ["pushSubscription", groupId, userId] as const,
  },
  movieDetail: (tmdbId: number | undefined) => ["movieDetail", tmdbId] as const,
  movieProviders: (tmdbId: number | undefined) => ["movieProviders", tmdbId] as const,
  similarMovies: (tmdbId: number | undefined) => ["similarMovies", tmdbId] as const,
  collection: (collectionId: number | undefined, tmdbId: number | undefined) =>
    ["collection", collectionId, tmdbId] as const,
  directorFilmography: (personId: number | undefined) => ["directorFilmography", personId] as const,
  actorFilmography: (personId: number | undefined) => ["actorFilmography", personId] as const,
  studioFilmography: (companyId: number | undefined) => ["studioFilmography", companyId] as const,
  providersList: ["providersList"] as const,
  streamingProviders: (sortedIds: number[]) => ["streamingProviders", sortedIds] as const,
  movieSearch: (query: string) => ["movieSearch", query] as const,
  personSearch: (query: string) => ["personSearch", query] as const,
  companySearch: (query: string) => ["companySearch", query] as const,
};
