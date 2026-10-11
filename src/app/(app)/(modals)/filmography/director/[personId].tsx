import { useLocalSearchParams } from "expo-router";

import { MovieGridScreen } from "@/components/movie/MovieGridScreen";
import { useDirectorFilmography } from "@/hooks/useDirectorFilmography";
import { mapMovieLikeToGridItem } from "@/lib/addMovieLogic";

/**
 * "Filmografie: Regisseur" (from a director credit in the movie detail).
 * Thin wrapper: query + props for `MovieGridScreen`, with progress header.
 */
export default function ActorFilmographyScreen() {
  const params = useLocalSearchParams<{ personId: string }>();
  const personId = Number(params.personId);
  const hasValidParams = params.personId != null && !Number.isNaN(personId);
  const query = useDirectorFilmography(hasValidParams ? personId : undefined);

  return (
    <MovieGridScreen
      testIDPrefix="director-filmography-screen"
      hasValidParams={hasValidParams}
      isLoading={query.isLoading}
      isError={query.isError}
      items={(query.data ?? []).map(mapMovieLikeToGridItem)}
      errorText="Die Filmografie konnte nicht geladen werden."
      emptyMessage="Keine Filme gefunden"
      showProgress
    />
  );
}
