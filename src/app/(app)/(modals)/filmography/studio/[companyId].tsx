import { useLocalSearchParams } from "expo-router";

import { MovieGridScreen } from "@/components/movie/MovieGridScreen";
import { useStudioFilmography } from "@/hooks/useStudioFilmography";
import { mapMovieLikeToGridItem } from "@/lib/addMovieLogic";

/**
 * "Studio-Filmografie" (from a production company in the movie detail).
 * Thin wrapper: paginated query (pages flattened, de-duplicated by tmdbId
 * since TMDB pagination can repeat an item) + "Mehr laden". No progress
 * header or provider filter: a studio catalog is not "completable".
 */
export default function StudioFilmographyScreen() {
  const params = useLocalSearchParams<{ companyId: string }>();
  const companyId = Number(params.companyId);
  const hasValidParams = params.companyId != null && !Number.isNaN(companyId);
  const query = useStudioFilmography(hasValidParams ? companyId : undefined);

  const results = (query.data?.pages ?? []).flatMap((page) => page.results);
  const uniqueResults = results.filter((r, index) => results.findIndex((o) => o.id === r.id) === index);

  return (
    <MovieGridScreen
      testIDPrefix="studio-filmography-screen"
      hasValidParams={hasValidParams}
      invalidParamsText="Ungültige Studio-Referenz."
      isLoading={query.isLoading}
      isError={query.isError}
      items={uniqueResults.map(mapMovieLikeToGridItem)}
      errorText="Die Studio-Filmografie konnte nicht geladen werden."
      emptyMessage="Keine Filme gefunden"
      waitForGroups={false}
      loadMore={{
        hasMore: !!query.hasNextPage,
        isFetching: query.isFetchingNextPage,
        onPress: () => query.fetchNextPage(),
      }}
    />
  );
}
