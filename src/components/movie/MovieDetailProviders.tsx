import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";

import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { Image } from "@/components/ui/Image";
import { buildTmdbImageUrl } from "@/lib/tmdbImage";
import { shouldShowAllProvidersToggle } from "@/lib/movieDetailLogic";
import type {
  TmdbMovieProviders,
  TmdbProviderRef,
} from "@/lib/movieDetailTypes";

const PREVIEW_COUNT = 3;

/** Shared (real content + skeleton) tokens. */
export const PROVIDER_HEADER_CLASSNAME = "text-sm font-sans-semibold text-text-primary";
export const PROVIDER_LOGO_CLASSNAME = "h-6 w-6";
export const PROVIDER_NAME_CLASSNAME = "text-text-secondary";

/**
 * Renders each provider's name, with its small TMDB logo (w92) in front when
 * the response carries a `logo_path`.
 *
 * Collapsed-preview decision (interim, not spec-mandated): when
 * `shouldShowAllProvidersToggle` says a toggle is needed, the collapsed
 * state shows at most the first 3 providers total, flattened in a fixed
 * flatrate -> rent -> buy order, still grouped under whichever section
 * headers apply to the items that made the cut. The spec only defined WHEN
 * the toggle appears, not the exact collapsed content.
 */
export interface MovieDetailProvidersProps {
  providers: TmdbMovieProviders | null;
  /** Live details still loading: header + logo/name skeleton row. */
  isLoading?: boolean;
}

interface FlatProvider extends TmdbProviderRef {
  section: "flatrate" | "rent" | "buy";
}

const SECTION_LABELS: Record<FlatProvider["section"], string> = {
  flatrate: "Flatrate",
  rent: "Leihen",
  buy: "Kaufen",
};

function flatten(providers: TmdbMovieProviders): FlatProvider[] {
  return [
    ...providers.flatrate.map((p) => ({ ...p, section: "flatrate" as const })),
    ...providers.rent.map((p) => ({ ...p, section: "rent" as const })),
    ...providers.buy.map((p) => ({ ...p, section: "buy" as const })),
  ];
}

function groupBySection(
  items: FlatProvider[],
): Map<FlatProvider["section"], FlatProvider[]> {
  const grouped = new Map<FlatProvider["section"], FlatProvider[]>();
  for (const item of items) {
    const existing = grouped.get(item.section) ?? [];
    existing.push(item);
    grouped.set(item.section, existing);
  }
  return grouped;
}

export function MovieDetailProviders({
  providers,
  isLoading = false,
}: MovieDetailProvidersProps) {
  const [expanded, setExpanded] = useState(false);

  if (providers == null && isLoading) {
    return (
      <View testID="movie-detail-providers-skeleton" className="gap-2">
        <View className="gap-2 py-1">
          <SkeletonText textClassName={PROVIDER_HEADER_CLASSNAME} className="w-20" />
          <View className="flex-row flex-wrap gap-x-3 gap-y-2">
            {[0, 1].map((index) => (
              <View key={index} className="flex-row items-center gap-1.5">
                <Skeleton className={`${PROVIDER_LOGO_CLASSNAME} rounded-md`} />
                <SkeletonText textClassName={PROVIDER_NAME_CLASSNAME} className="w-20" />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (providers == null) {
    return null;
  }

  const all = flatten(providers);
  if (all.length === 0) {
    return null;
  }

  const showToggle = shouldShowAllProvidersToggle(providers);
  const visible = showToggle && !expanded ? all.slice(0, PREVIEW_COUNT) : all;
  const grouped = groupBySection(visible);

  // Global index (across the flattened, fixed flatrate -> rent -> buy order)
  // is what testIDs are keyed on, per the task spec, even though rendering
  // is grouped by section.
  const globalIndexByProviderId = new Map<number, number>();
  all.forEach((item, index) => {
    if (!globalIndexByProviderId.has(item.provider_id)) {
      globalIndexByProviderId.set(item.provider_id, index);
    }
  });

  return (
    <View testID="movie-detail-providers" className="gap-2">
      {(["flatrate", "rent", "buy"] as const).map((section) => {
        const items = grouped.get(section);
        if (!items || items.length === 0) {
          return null;
        }
        return (
          <View key={section} className="gap-2 py-1">
            <Text className={PROVIDER_HEADER_CLASSNAME}>
              {SECTION_LABELS[section]}
            </Text>
            <View className="flex-row flex-wrap gap-x-3 gap-y-2">
              {items.map((item) => (
                <View
                  key={item.provider_id}
                  className="flex-row items-center gap-1.5"
                >
                  {buildTmdbImageUrl(item.logo_path, "w92") ? (
                    <Image
                      testID={`movie-detail-provider-logo-${item.provider_id}`}
                      source={{
                        uri: buildTmdbImageUrl(item.logo_path, "w92") as string,
                      }}
                      contentFit="cover"
                      className={`${PROVIDER_LOGO_CLASSNAME} rounded-md`}
                    />
                  ) : null}
                  <Text
                    testID={`movie-detail-provider-${globalIndexByProviderId.get(item.provider_id)}`}
                    className={PROVIDER_NAME_CLASSNAME}
                  >
                    {item.provider_name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}

      {showToggle ? (
        <Pressable
          testID="movie-detail-providers-toggle"
          onPress={() => setExpanded((prev) => !prev)}
          accessibilityRole="button"
          className="mt-2 min-h-touch-comfortable justify-center self-start"
        >
          <Text className="text-accent">Alle Anbieter anzeigen</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
