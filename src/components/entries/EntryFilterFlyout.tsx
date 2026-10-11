import { useState } from "react";
import { View } from "react-native";

import {
  GenrePills,
  ProviderCategoryPills,
  YearPills,
} from "@/components/entries/EntryFilterPills";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import {
  DEFAULT_ENTRY_FILTERS,
  toggleProviderCategory,
  type EntryFilters,
  type ListFiltersTab,
} from "@/lib/listFilters";
import { toggleGenreId } from "@/lib/entryFilters";
import type { YearFilterValue } from "@/lib/watchlistTypes";

function Section({
  title,
  testID,
  children,
}: {
  title: string;
  testID: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-2" testID={testID}>
      <Text className="text-xs font-sans-semibold uppercase text-text-secondary">
        {title}
      </Text>
      {children}
    </View>
  );
}

interface FlyoutProps {
  tab: ListFiltersTab;
  testIDPrefix: string;
  visible: boolean;
  /** The currently applied filters (the draft starts as a copy on open). */
  filters: EntryFilters;
  genreIds: string[];
  genreNamesById: Map<string, string>;
  years: number[];
  showNoDateYear?: boolean;
  /** Hides the "Bewertungsstand" section (Tagebuch "Mein Tagebuch": its flags are group-only). */
  hideRatingState?: boolean;
  onClose: () => void;
  onApply: (filters: EntryFilters) => void;
}

/**
 * "+ Filter" flyout (Sheet): sections Genre (multi), Jahr, Streaming (Meine
 * Dienste + Flatrate/Leihen/Kaufen), Mag ich and the tab's rating-state
 * filters. Works on a DRAFT: nothing changes until "Anwenden"; "Zurücksetzen"
 * clears the draft. Derived testIDs: `<prefix>-filter-flyout`,
 * `<prefix>-filter-reset`, `<prefix>-filter-apply`, `<prefix>-streaming-mine`,
 * `<prefix>-filter-liked`, `<prefix>-filter-<flag>` (upcoming, unrated,
 * has_ratings, all_rated, missing) plus the pill ids of EntryFilterPills.
 */
export function EntryFilterFlyout({ visible, onClose, ...rest }: FlyoutProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Filter">
      {/* Mounted only while open -> every open starts from the applied filters. */}
      <FlyoutContent {...rest} onClose={onClose} />
    </Sheet>
  );
}

function FlyoutContent({
  tab,
  testIDPrefix,
  filters,
  genreIds,
  genreNamesById,
  years,
  showNoDateYear = false,
  hideRatingState = false,
  onClose,
  onApply,
}: Omit<FlyoutProps, "visible">) {
  const [draft, setDraft] = useState<EntryFilters>(filters);

  const p = testIDPrefix;
  const patch = (next: Partial<EntryFilters>) =>
    setDraft((d) => ({ ...d, ...next }));

  function flagChip(
    id: string,
    label: string,
    field: keyof EntryFilters,
    exclusiveWith?: keyof EntryFilters,
  ) {
    const active = draft[field] === true;
    return (
      <Chip
        key={id}
        testID={`${p}-filter-${id}`}
        label={label}
        active={active}
        onPress={() =>
          patch({
            [field]: !active,
            ...(exclusiveWith && !active ? { [exclusiveWith]: false } : {}),
          })
        }
      />
    );
  }

  return (
    <View className="gap-5" testID={`${p}-filter-flyout`}>
      <Section title="Genre (Mehrfachauswahl)" testID={`${p}-section-genre`}>
        <GenrePills
          testIDPrefix={p}
          genreIds={genreIds}
          selectedGenreIds={draft.genreIds}
          genreNamesById={genreNamesById}
          onToggle={(id) =>
            patch({ genreIds: toggleGenreId(draft.genreIds, id) })
          }
        />
      </Section>
      <Section title="Jahr" testID={`${p}-section-year`}>
        <YearPills
          testIDPrefix={p}
          years={years}
          selectedYear={draft.year ?? undefined}
          showNoDate={showNoDateYear}
          onSelect={(year: YearFilterValue) =>
            patch({ year: draft.year === year ? null : year })
          }
        />
      </Section>
      <Section title="Streaming" testID={`${p}-section-streaming`}>
        <View className="flex-row flex-wrap gap-2">
          <Chip
            testID={`${p}-streaming-mine`}
            label="Meine Dienste"
            active={draft.myStreaming}
            onPress={() => patch({ myStreaming: !draft.myStreaming })}
          />
        </View>
        {draft.myStreaming ? (
          <ProviderCategoryPills
            testIDPrefix={p}
            active={draft.providerCategories}
            onToggle={(category) =>
              patch({
                providerCategories: toggleProviderCategory(
                  draft.providerCategories,
                  category,
                ),
              })
            }
          />
        ) : null}
      </Section>
      <Section title="Mag ich" testID={`${p}-section-liked`}>
        <View className="flex-row flex-wrap gap-2">
          {flagChip("liked", "Nur Filme, die ich mag", "liked")}
        </View>
      </Section>
      {hideRatingState ? null : (
        <Section title="Bewertungsstand" testID={`${p}-section-rating-state`}>
          <View className="flex-row flex-wrap gap-2">
            {tab === "diary" ? (
              <>
                {flagChip("all_rated", "Alle bewertet", "allRated", "missing")}
                {flagChip("missing", "Fehlt noch", "missing", "allRated")}
              </>
            ) : (
              <>
                {flagChip("upcoming", "Kommt noch", "upcoming")}
                {flagChip("unrated", "Keine Bewertung", "unrated", "hasRatings")}
                {flagChip(
                  "has_ratings",
                  "Mit Bewertungen",
                  "hasRatings",
                  "unrated",
                )}
              </>
            )}
          </View>
        </Section>
      )}
      <View className="flex-row gap-3">
        <Button
          testID={`${p}-filter-reset`}
          variant="secondary"
          icon="reset"
          label="Zurücksetzen"
          className="flex-1"
          onPress={() => setDraft(DEFAULT_ENTRY_FILTERS)}
        />
        <Button
          testID={`${p}-filter-apply`}
          icon="check"
          label="Anwenden"
          className="flex-1"
          onPress={() => {
            onApply(draft);
            onClose();
          }}
        />
      </View>
    </View>
  );
}
