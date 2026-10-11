
import { FadeInItem } from "@/components/ui/FadeInItem";
import { LoadingArea } from "@/components/ui/LoadingArea";
import { TmdbBadge } from "@/components/ui/TmdbBadge";
import { MovieDetailCastRow, MovieDetailDirector } from "@/components/movie/MovieDetailCastRow";
import { MovieDetailGenreTags } from "@/components/movie/MovieDetailGenreTags";
import { MovieDetailMetaRow } from "@/components/movie/MovieDetailMetaRow";
import { MovieDetailProviders } from "@/components/movie/MovieDetailProviders";
import { MovieDetailSection } from "@/components/movie/MovieDetailSection";
import { formatDateForInput } from "@/lib/ratingLogic";

type MetaRowProps = Parameters<typeof MovieDetailMetaRow>[0];
type CastRowProps = Parameters<typeof MovieDetailCastRow>[0];
type DirectorProps = Parameters<typeof MovieDetailDirector>[0];

interface MovieDetailContentProps {
  /** True while nothing of the live data is known yet: shows the central loading area. */
  pending: boolean;
  /** Fade the content in only if it came out of the loading state. */
  fadeIn: boolean;
  hasDetails: boolean;
  runtimeLabel: MetaRowProps["runtimeLabel"];
  releaseInfo: { label: string; date: string } | null;
  onEditReleaseDate?: () => void;
  voteAverage: number | null;
  genres: Parameters<typeof MovieDetailGenreTags>[0]["genres"];
  director: DirectorProps["director"] | null;
  cast: CastRowProps["cast"];
  providers: Parameters<typeof MovieDetailProviders>[0]["providers"];
  hasProviders: boolean;
  onDirectorPress: (personId: number) => void;
  onCastMemberPress: (personId: number) => void;
}

/** Everything under the title block that depends on live TMDB data: details, director, cast, streaming. */
export function MovieDetailContent({
  pending,
  fadeIn,
  hasDetails,
  runtimeLabel,
  releaseInfo,
  onEditReleaseDate,
  voteAverage,
  genres,
  director,
  cast,
  providers,
  hasProviders,
  onDirectorPress,
  onCastMemberPress,
}: MovieDetailContentProps) {
  if (pending) {
    return <LoadingArea testID="movie-detail-content-loading" className="min-h-64 w-full" />;
  }

  return (
    <FadeInItem index={0} skipInitialFade={!fadeIn} testID="movie-detail-content">
      {hasDetails ? (
        <MovieDetailSection name="details" title="Details" withDivider>
          <MovieDetailMetaRow
            runtimeLabel={runtimeLabel}
            releaseInfo={
              releaseInfo ? { ...releaseInfo, date: formatDateForInput(releaseInfo.date) } : null
            }
            onEditReleaseDate={onEditReleaseDate}
            trailing={
              voteAverage != null ? (
                <TmdbBadge testID="movie-detail-score-badge" score={voteAverage} />
              ) : null
            }
          />
          <MovieDetailGenreTags genres={genres} />
        </MovieDetailSection>
      ) : null}

      {director ? (
        <MovieDetailSection name="director" title="Regie" withDivider>
          <MovieDetailDirector director={director} onDirectorPress={onDirectorPress} />
        </MovieDetailSection>
      ) : null}

      {cast.length > 0 ? (
        <MovieDetailSection name="cast" title="Besetzung" withDivider>
          <MovieDetailCastRow cast={cast} onCastMemberPress={onCastMemberPress} />
        </MovieDetailSection>
      ) : null}

      {hasProviders ? (
        <MovieDetailSection name="streaming" title="Streaming" withDivider>
          <MovieDetailProviders providers={providers} />
        </MovieDetailSection>
      ) : null}
    </FadeInItem>
  );
}

