/**
 * TMDB image URL helper. The `movies.poster` column (and TMDB responses'
 * `poster_path`) store only the bare path ("/abc.jpg"); an image component
 * needs the full URL. Absolute URLs (legacy/already-resolved values) pass
 * through unchanged.
 */
export type TmdbImageSize =
  "w92" | "w185" | "w342" | "w500" | "w780" | "original";

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export function buildTmdbImageUrl(
  path: string | null | undefined,
  size: TmdbImageSize = "w342",
): string | null {
  if (!path) {
    return null;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE_URL}/${size}${normalizedPath}`;
}
