import { TmdbBadge } from "@/components/ui/TmdbBadge";

/**
 * Shared TMDB corner badge for ALL poster tiles: flush bottom-right of the
 * poster (`bottom-0 right-0`, `rounded-tl-xl`), logo + score ("–" without
 * score). Corner badges on tiles only go through this and `PosterCornerBadge`.
 */
export interface PosterTmdbBadgeProps {
  score: number | null | undefined;
  testID?: string;
  valueTestID?: string;
}

export function PosterTmdbBadge({ score, testID = "poster-tmdb-badge", valueTestID }: PosterTmdbBadgeProps) {
  return (
    <TmdbBadge
      testID={testID}
      valueTestID={valueTestID}
      score={score ?? null}
      className="absolute bottom-0 right-0 gap-1 rounded-tl-xl bg-black/60 py-1 pl-2.5 pr-1.5"
    />
  );
}
