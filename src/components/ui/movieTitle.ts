/**
 * Movie-title typography. Font = Outfit (token `font-title`, SemiBold).
 * MOVIE_TITLE_TEXT: titles in sheet cards and tiles/grid: Outfit, accent colour.
 * Table rows (GlassTable) use MOVIE_TITLE_FONT + white (TABLE_TITLE_CELL).
 * MOVIE_TITLE_FONT: font only (colour set at call site, e.g. detail title in accent).
 * Size is set per call site. List titles are always one line
 * (`numberOfLines={1}` + `ellipsizeMode="tail"`).
 */
export const MOVIE_TITLE_FONT = "font-title";
export const MOVIE_TITLE_TEXT = `${MOVIE_TITLE_FONT} text-accent-light`;
