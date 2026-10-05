import * as Linking from "expo-linking";
import { Pressable, Text, View } from "react-native";

import { Image } from "@/components/ui/Image";

/**
 * Inventory 2.7 -- data-source attributions in the Settings footer: TMDB and
 * Trakt with their logos (assets/images/*-logo.png, rendered from the legacy
 * app's SVGs) plus a one-line disclaimer. TMDB's API terms require a
 * JustWatch credit for streaming-provider data, so that credit is part of
 * the TMDB text instead of a separate row. KinoCheck is absent on purpose
 * (no news tab).
 */
interface AttributionEntry {
  key: string;
  logo: number;
  text: string;
  url: string;
}

export const ATTRIBUTIONS: AttributionEntry[] = [
  {
    key: "tmdb",
    logo: require("../../../assets/images/tmdb-logo.png"),
    text: "Dieses Produkt verwendet die TMDB API, wird aber nicht von TMDB unterstützt oder zertifiziert. Streaming-Daten: JustWatch.",
    url: "https://www.themoviedb.org",
  },
  {
    key: "trakt",
    logo: require("../../../assets/images/trakt-logo.png"),
    text: "Ähnliche Filme via Trakt API.",
    url: "https://trakt.tv",
  },
];

export function DataSourceAttributions() {
  return (
    <View testID="settings-attributions" className="gap-2">
      <Text className="px-1 font-display text-base text-accent-light">Datenquellen</Text>
      {ATTRIBUTIONS.map((entry) => (
        <Pressable
          key={entry.key}
          testID={`settings-attribution-${entry.key}`}
          accessibilityRole="link"
          className="flex-row items-center gap-3 px-1 py-1"
          onPress={() => void Linking.openURL(entry.url)}
        >
          <Image
            testID={`settings-attribution-${entry.key}-logo`}
            source={entry.logo}
            contentFit="contain"
            className="h-10 w-10"
            accessibilityLabel={entry.key === "tmdb" ? "TMDB" : "Trakt"}
          />
          <Text testID={`settings-attribution-${entry.key}-text`} className="flex-1 text-xs text-text-secondary">
            {entry.text}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
