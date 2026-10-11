import { useLocalSearchParams } from "expo-router";

import { MovieGridScreen } from "@/components/movie/MovieGridScreen";
import { ProviderFilteredMovieGrid } from "@/components/movie/ProviderFilteredMovieGrid";
import { useSimilarMovies } from "@/hooks/useSimilarMovies";
import type { MovieGridItem } from "@/components/movie/MovieGrid";
import type { TraktRelatedMovie } from "@/lib/tmdbProxy";

/**
 * "Ähnliche Filme" (Trakt related movies via tmdb-proxy). Thin wrapper:
 * query + props for `MovieGridScreen` (provider filter, `replace` navigation
 * with group context). The proxy enriches `posterPath`/`voteAverage` from
 * TMDB (null when unavailable); items without `ids.tmdb` are dropped since
 * they cannot be linked to a badge, provider lookup or detail target.
 */
export default function SimilarMoviesScreen() {
  const params = useLocalSearchParams<{ tmdbId: string }>();
  const tmdbId = Number(params.tmdbId);
  const hasValidParams = params.tmdbId != null && !Number.isNaN(tmdbId);
  const query = useSimilarMovies(hasValidParams ? tmdbId : undefined);

  const items: MovieGridItem[] = (query.data ?? [])
    .filter((movie: TraktRelatedMovie) => typeof movie.ids.tmdb === "number")
    .map((movie: TraktRelatedMovie) => ({
      tmdbId: movie.ids.tmdb as number,
      title: movie.title,
      posterPath: movie.posterPath ?? null,
      releaseDate: movie.year ? `${movie.year}-01-01` : null,
      voteAverage: movie.voteAverage ?? null,
    }));

  return (
    <MovieGridScreen
      testIDPrefix="similar-movies-screen"
      hasValidParams={hasValidParams}
      invalidParamsText="Ungültige Film-Referenz."
      isLoading={query.isLoading}
      isError={query.isError}
      items={items}
      errorText="Ähnliche Filme konnten nicht geladen werden."
      errorTestIDSuffix="error-data"
      emptyMessage="Keine ähnlichen Filme gefunden"
      Grid={ProviderFilteredMovieGrid}
      navigation="replace"
    />
  );
}
