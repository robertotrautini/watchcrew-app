import { useMemo, useState } from "react";
import { useParallaxScroll } from "@/components/parallaxContext";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { SettingsBackBar } from "@/components/settings/SettingsBackBar";
import { Image } from "@/components/ui/Image";
import { buildTmdbImageUrl } from "@/lib/tmdbImage";
import { useProvidersList } from "@/hooks/useProvidersList";
import type { TmdbProviderRef } from "@/lib/tmdbProxy";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { GLASS_EDGE, GLASS_INSET_EDGE } from "@/components/ui/Glass";
import {
  CHIP_ACTIVE_CLASSNAME,
  CHIP_INACTIVE_CLASSNAME,
  chipTextClassName,
} from "@/components/ui/Chip";

/**
 * M10 Settings hub — "Meine Streaming-Dienste" picker. Searchable wrapped chip list (logo + name) of
 * the full DE-region TMDB provider catalog (`useProvidersList`, wrapping the
 * `providers_list` tmdb-proxy action). Multi-select, persisted directly into
 * `usePreferencesStore`'s `selectedStreamingProviderIds` (a per-DEVICE
 * preference, per docs/interim-decisions.md — not a Supabase-backed
 * per-user setting).
 */

function filterProviders(
  providers: TmdbProviderRef[],
  query: string,
): TmdbProviderRef[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) {
    return providers;
  }
  return providers.filter((provider) =>
    provider.provider_name.toLowerCase().includes(trimmed),
  );
}

export default function SettingsStreamingServicesScreen() {
  const parallaxScroll = useParallaxScroll();
  const providersQuery = useProvidersList();
  const selectedStreamingProviderIds = usePreferencesStore(
    (s) => s.selectedStreamingProviderIds,
  );
  const setSelectedStreamingProviderIds = usePreferencesStore(
    (s) => s.setSelectedStreamingProviderIds,
  );
  const [searchQuery, setSearchQuery] = useState("");

  const providers = useMemo(() => providersQuery.data ?? [], [providersQuery.data]);
  const filteredProviders = useMemo(
    () => filterProviders(providers, searchQuery),
    [providers, searchQuery],
  );

  function toggleProvider(providerId: number) {
    if (selectedStreamingProviderIds.includes(providerId)) {
      setSelectedStreamingProviderIds(
        selectedStreamingProviderIds.filter((id) => id !== providerId),
      );
    } else {
      setSelectedStreamingProviderIds([
        ...selectedStreamingProviderIds,
        providerId,
      ]);
    }
  }

  if (providersQuery.isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        testID="settings-streaming-screen"
      >
        <ActivityIndicator testID="settings-streaming-loading" />
      </View>
    );
  }

  if (providersQuery.isError) {
    return (
      <View
        className="flex-1 items-center justify-center px-4"
        testID="settings-streaming-screen"
      >
        <Text
          testID="settings-streaming-error"
          className="text-center text-danger"
        >
          Die Streaming-Dienste konnten nicht geladen werden.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1" testID="settings-streaming-screen">
      <View className="px-4 pt-4">
        <TextInput
          testID="settings-streaming-search-input"
          className={`rounded-lg ${GLASS_INSET_EDGE} bg-black/35 px-3 py-2 text-text-primary`}
          placeholder="Suchen…"
          placeholderTextColor="#8b8b8b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        {...parallaxScroll}
        testID="settings-streaming-provider-grid"
        className="flex-1"
        contentContainerClassName="flex-row flex-wrap gap-2 px-4 pb-4 pt-3"
        keyboardShouldPersistTaps="handled"
      >
        {filteredProviders.map((item) => {
          const selected = selectedStreamingProviderIds.includes(
            item.provider_id,
          );
          const logoUrl = buildTmdbImageUrl(item.logo_path, "w92");
          return (
            <Pressable
              key={item.provider_id}
              testID={`settings-streaming-provider-${item.provider_id}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => toggleProvider(item.provider_id)}
              className={`flex-row items-center gap-3 rounded-xl border p-2 pr-3 ${
                selected ? CHIP_ACTIVE_CLASSNAME : CHIP_INACTIVE_CLASSNAME
              }`}
            >
              {logoUrl ? (
                <Image
                  testID={`settings-streaming-provider-logo-${item.provider_id}`}
                  source={{ uri: logoUrl }}
                  contentFit="cover"
                  className="h-10 w-10 rounded-lg"
                />
              ) : (
                <View className="h-10 w-10 rounded-lg bg-bg-glass-strong" />
              )}
              <Text
                className={chipTextClassName(selected, "shrink")}
                numberOfLines={2}
              >
                {item.provider_name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <SettingsBackBar />
    </View>
  );
}
