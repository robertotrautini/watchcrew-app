/**
 * Pure progress-calculation helper shared by the M6 filmography/collection
 * sub-view screens (Filmreihe/collection, Regisseur-/Schauspieler-/
 * Studio-Filmografie) — each of those screens fetches its own already-
 * filtered list of TMDB ids for "this filmography" plus the current user's
 * (or group's) set of watched TMDB ids, and hands both to this function to
 * get the "x von y gesehen · z%" progress-header data for `MovieGrid`.
 *
 * Intentionally has zero knowledge of Supabase/TanStack Query/fetching —
 * callers own that; this module only does the counting/formatting math.
 */

export interface FilmographyProgress {
  watched: number;
  total: number;
  /** Integer 0-100, rounded (round-half-up via Math.round). */
  percent: number;
  /** Exactly: `${watched} von ${total} gesehen · ${percent}%` (German, middle dot U+00B7). */
  label: string;
}

export function computeFilmographyProgress(
  filmographyTmdbIds: number[],
  watchedTmdbIds: ReadonlySet<number>,
): FilmographyProgress {
  const uniqueFilmographyIds = new Set(filmographyTmdbIds);
  const total = uniqueFilmographyIds.size;

  let watched = 0;
  for (const tmdbId of uniqueFilmographyIds) {
    if (watchedTmdbIds.has(tmdbId)) {
      watched += 1;
    }
  }

  const percent = total === 0 ? 0 : Math.round((watched / total) * 100);

  return {
    watched,
    total,
    percent,
    label: `${watched} von ${total} gesehen · ${percent}%`,
  };
}
