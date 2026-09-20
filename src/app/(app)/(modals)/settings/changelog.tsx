import { useEffect } from "react";
import { ScrollView, Text, View } from "react-native";

import { CHANGELOG_ENTRIES, CURRENT_CHANGELOG_VERSION } from "@/lib/changelog";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

function formatPlainDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

/**
 * M10 Settings hub — Changelog timeline viewer (vertical list, newest
 * first — `CHANGELOG_ENTRIES` in src/lib/changelog.ts is kept in that order
 * directly, not re-sorted here). Opening this screen marks
 * `CURRENT_CHANGELOG_VERSION` as seen immediately, matching the legacy
 * app's own behavior (per this task's brief).
 */
export default function SettingsChangelogScreen() {
  const setLastSeenChangelogVersion = usePreferencesStore((s) => s.setLastSeenChangelogVersion);

  useEffect(() => {
    setLastSeenChangelogVersion(CURRENT_CHANGELOG_VERSION);
  }, [setLastSeenChangelogVersion]);

  return (
    <View className="flex-1 bg-bg-primary" testID="settings-changelog-screen">
      <ScrollView contentContainerClassName="gap-4 px-4 py-4">
        <Text className="mb-2 font-display text-xl text-text-primary">Changelog</Text>

        {CHANGELOG_ENTRIES.map((entry) => (
          <View
            key={entry.version}
            testID={`changelog-entry-${entry.version}`}
            className="gap-1 rounded-lg border border-border-subtle bg-card px-4 py-3"
          >
            <View className="flex-row items-center justify-between">
              <Text
                testID={`changelog-entry-${entry.version}-title`}
                className="font-semibold text-text-primary"
              >
                {entry.title}
              </Text>
              <Text className="text-xs text-text-secondary">v{entry.version}</Text>
            </View>
            <Text testID={`changelog-entry-${entry.version}-date`} className="text-xs text-text-secondary">
              {formatPlainDate(entry.date)}
            </Text>
            <Text
              testID={`changelog-entry-${entry.version}-description`}
              className="text-sm text-text-secondary"
            >
              {entry.description}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
