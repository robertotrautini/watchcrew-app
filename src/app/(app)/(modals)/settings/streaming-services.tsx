import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";

import { useProvidersList } from "@/hooks/useProvidersList";
import type { TmdbProviderRef } from "@/lib/tmdbProxy";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

/**
 * M10 Settings hub — "Meine Streaming-Dienste" picker. Searchable grid of
 * the full DE-region TMDB provider catalog (`useProvidersList`, wrapping the
 * `providers_list` tmdb-proxy action). Multi-select, persisted directly into
 * `usePreferencesStore`'s `selectedStreamingProviderIds` (a per-DEVICE
 * preference, per docs/interim-decisions.md — not a Supabase-backed
 * per-user setting).
 */

function filterProviders(providers: TmdbProviderRef[], query: string): TmdbProviderRef[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) {
    return providers;
  }
  return providers.filter((provider) => provider.provider_name.toLowerCase().includes(trimmed));
}

export default function SettingsStreamingServicesScreen() {
  const providersQuery = useProvidersList();
  const selectedStreamingProviderIds = usePreferencesStore((s) => s.selectedStreamingProviderIds);
  const setSelectedStreamingProviderIds = usePreferencesStore(
    (s) => s.setSelectedStreamingProviderIds,
  );
  const [searchQuery, setSearchQuery] = useState("");

  const providers = providersQuery.data ?? [];
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
      setSelectedStreamingProviderIds([...selectedStreamingProviderIds, providerId]);
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
        <Text testID="settings-streaming-error" className="text-center text-danger">
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
          className="rounded-lg border border-border-subtle bg-card px-3 py-2 text-text-primary"
          placeholder="Suchen…"
          placeholderTextColor="#8b8b8b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        testID="settings-streaming-provider-grid"
        data={filteredProviders}
        keyExtractor={(provider) => String(provider.provider_id)}
        numColumns={3}
        contentContainerClassName="gap-3 px-4 pt-3 pb-8"
        columnWrapperClassName="gap-3"
        renderItem={({ item }) => {
          const selected = selectedStreamingProviderIds.includes(item.provider_id);
          return (
            <Pressable
              testID={`settings-streaming-provider-${item.provider_id}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => toggleProvider(item.provider_id)}
              className={`flex-1 items-center justify-center rounded-lg border px-2 py-4 ${
                selected ? "border-accent bg-accent/20" : "border-border-subtle bg-card"
              }`}
            >
              <Text
                className="text-center text-xs text-text-primary"
                numberOfLines={2}
              >
                {item.provider_name}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
