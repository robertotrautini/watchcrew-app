import { useParallaxScroll } from "@/components/parallaxContext";
import { Pressable, ScrollView, Text, View } from "react-native";

import { DiaryEntryCard } from "@/components/movie/DiaryEntryCard";
import { DiaryPosterTile } from "@/components/movie/DiaryPosterTile";
import { FadeInItem } from "@/components/ui/FadeInItem";
import { Glass } from "@/components/ui/Glass";
import type { useTagebuchScreen } from "@/hooks/useTagebuchScreen";
import { formatPlainDate, getYearFromDate } from "@/lib/dateFormat";
import { computeAverageRating, memberDisplayLabel } from "@/lib/diaryDisplay";
import { buildTmdbImageUrl } from "@/lib/tmdbImage";
import type { WatchlistEntry } from "@/lib/watchlistTypes";

type Screen = ReturnType<typeof useTagebuchScreen>;

function GridView({ screen }: { screen: Screen }) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {screen.visibleEntries.map((entry, index) => (
        <FadeInItem
          replayTab="tagebuch"
          key={entry.id}
          index={index}
          testID={`tagebuch-entry-${entry.id}`}
          className="w-[30%]"
        >
          <Pressable
            testID={`tagebuch-entry-press-${entry.id}`}
            accessibilityRole="button"
            onPress={() => screen.openEntry(entry)}
          >
            <DiaryPosterTile
              posterUrl={buildTmdbImageUrl(entry.movie.poster)}
              title={entry.movie.name}
              starColor={screen.starColor}
              averageRating={computeAverageRating(entry)}
              liked={screen.ownRating(entry)?.liked === true}
              tmdbScore={entry.movie.vote_average}
            >
              {screen.showTitlesInGrid ? (
                <Text
                  testID={`tagebuch-grid-title-${entry.id}`}
                  className="text-xs text-text-primary"
                  numberOfLines={1}
                >
                  {entry.movie.name}
                </Text>
              ) : null}
            </DiaryPosterTile>
          </Pressable>
        </FadeInItem>
      ))}
    </View>
  );
}

function ListView({ screen }: { screen: Screen }) {
  const entries = screen.visibleEntries;
  return (
    <Glass className="overflow-hidden">
      <View className="flex-row gap-2 border-b border-glass-border px-3 py-2">
        <Text className="flex-1 text-xs text-text-secondary">Film</Text>
        <Text className="w-14 text-xs text-text-secondary">Gesehen</Text>
        <Text className="w-10 text-right text-xs text-text-secondary">Ø</Text>
        <Text className="w-10 text-right text-xs text-text-secondary">TMDB</Text>
      </View>
      {entries.map((entry, entryIndex) => {
        const ownSeenAt = screen.ownRating(entry)?.seen_at ?? null;
        const average = computeAverageRating(entry);
        return (
          <Pressable
            key={entry.id}
            testID={`tagebuch-entry-${entry.id}`}
            accessibilityRole="button"
            onPress={() => screen.openEntry(entry)}
            className={`flex-row items-center gap-2 px-3 py-3 ${
              entryIndex < entries.length - 1
                ? "border-b border-glass-border"
                : ""
            }`}
          >
            <Text
              testID={`tagebuch-list-title-${entry.id}`}
              className="flex-1 font-display-bold text-accent-light"
              numberOfLines={1}
            >
              {entry.movie.name}
            </Text>
            <Text
              testID={`tagebuch-list-year-${entry.id}`}
              className="w-14 text-sm text-text-secondary"
            >
              {ownSeenAt ? getYearFromDate(ownSeenAt) : "–"}
            </Text>
            <Text
              testID={`tagebuch-list-average-${entry.id}`}
              className="w-10 text-right text-sm font-semibold text-text-primary"
            >
              {average != null ? average.toFixed(1) : "–"}
            </Text>
            <Text
              testID={`tagebuch-list-tmdb-${entry.id}`}
              className="w-10 text-right text-sm text-text-secondary"
            >
              {entry.movie.vote_average != null
                ? entry.movie.vote_average.toFixed(1)
                : "–"}
            </Text>
          </Pressable>
        );
      })}
    </Glass>
  );
}

function seenDateLabel(screen: Screen, entry: WatchlistEntry): string {
  const ownSeenAt = screen.ownRating(entry)?.seen_at ?? null;
  return ownSeenAt
    ? `Gesehen am ${formatPlainDate(ownSeenAt, "Kein Datum")}`
    : "Kein Datum";
}

function CardsView({ screen }: { screen: Screen }) {
  return (
    <>
      {screen.visibleEntries.map((entry, index) => (
        <FadeInItem
          replayTab="tagebuch"
          key={entry.id}
          index={index}
          testID={`tagebuch-entry-${entry.id}`}
        >
          <Pressable
            testID={`tagebuch-entry-press-${entry.id}`}
            accessibilityRole="button"
            onPress={() => screen.openEntry(entry)}
          >
            <DiaryEntryCard
              posterUrl={buildTmdbImageUrl(entry.movie.poster)}
              title={entry.movie.name}
              seenLabel={seenDateLabel(screen, entry)}
              seenLabelTestID={`tagebuch-entry-seen-date-${entry.id}`}
              starColor={screen.starColor}
              averageRating={computeAverageRating(entry)}
              liked={screen.ownRating(entry)?.liked === true}
              tmdbScore={entry.movie.vote_average}
              members={screen.groupMemberIds.map((memberId) => ({
                id: memberId,
                label: memberDisplayLabel(
                  memberId,
                  screen.displayNameById.get(memberId),
                ),
                rating:
                  entry.ratings.find((r) => r.member_id === memberId)?.rating ??
                  null,
              }))}
            />
          </Pressable>
        </FadeInItem>
      ))}
    </>
  );
}

export function TagebuchEntryList({ screen }: { screen: Screen }) {
  const parallaxScroll = useParallaxScroll();
  const mode = screen.diaryViewMode;
  return (
    <ScrollView
      {...parallaxScroll}
      testID="tagebuch-entry-list"
      contentContainerClassName="gap-3 px-4 pb-8 pt-3"
    >
      {mode === "grid" ? (
        <GridView screen={screen} />
      ) : mode === "list" ? (
        <ListView screen={screen} />
      ) : (
        <CardsView screen={screen} />
      )}
    </ScrollView>
  );
}
