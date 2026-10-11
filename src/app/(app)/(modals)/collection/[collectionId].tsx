import { useLocalSearchParams } from "expo-router";

import { MovieGridScreen } from "@/components/movie/MovieGridScreen";
import { ProviderFilteredMovieGrid } from "@/components/movie/ProviderFilteredMovieGrid";
import { useCollection } from "@/hooks/useCollection";
import { mapMovieLikeToGridItem } from "@/lib/addMovieLogic";

/**
 * "Filmreihe" (TMDB collection). Thin wrapper: query + props for
 * `MovieGridScreen` (title line, provider filter). Needs the collection id
 * (route segment) AND the originating movie's tmdbId (search param), since
 * the `collection` tmdb-proxy action keys its cache on both.
 */
export default function CollectionScreen() {
  const params = useLocalSearchParams<{ collectionId: string; tmdbId?: string }>();
  const collectionId = Number(params.collectionId);
  const tmdbId = Number(params.tmdbId);
  const hasValidParams = !Number.isNaN(collectionId) && !Number.isNaN(tmdbId);
  const query = useCollection(hasValidParams ? tmdbId : undefined, hasValidParams ? collectionId : undefined);

  return (
    <MovieGridScreen
      testIDPrefix="collection-screen"
      hasValidParams={hasValidParams}
      invalidParamsText="Ungültige Filmreihen-Referenz."
      isLoading={query.isLoading}
      isError={query.isError}
      items={(query.data?.parts ?? []).map(mapMovieLikeToGridItem)}
      errorText="Die Filmreihe konnte nicht geladen werden."
      errorTestIDSuffix="error-data"
      emptyMessage="Keine weiteren Teile gefunden"
      title={query.data?.name ?? "Filmreihe"}
      Grid={ProviderFilteredMovieGrid}
    />
  );
}
