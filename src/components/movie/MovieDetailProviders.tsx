import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Image } from "@/components/ui/Image";
import { buildTmdbImageUrl } from "@/lib/tmdbImage";
import { shouldShowAllProvidersToggle } from "@/lib/movieDetailLogic";
import type {
  TmdbMovieProviders,
  TmdbProviderRef,
} from "@/lib/movieDetailTypes";

const PREVIEW_COUNT = 3;

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

export function MovieDetailProviders({ providers }: MovieDetailProvidersProps) {
  const [expanded, setExpanded] = useState(false);

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
            <Text className="text-sm font-semibold text-text-primary">
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
                      className="h-6 w-6 rounded-md"
                    />
                  ) : null}
                  <Text
                    testID={`movie-detail-provider-${globalIndexByProviderId.get(item.provider_id)}`}
                    className="text-text-secondary"
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
