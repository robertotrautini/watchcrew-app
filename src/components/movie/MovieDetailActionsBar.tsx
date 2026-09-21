import { useState } from "react";
import { Alert, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import {
  useAddToWatchlist,
  useDeleteWatchlistEntry,
} from "@/hooks/useMovieDetailMutations";
import type { ActionButtonId } from "@/lib/movieDetailLogic";
import { navigateToCollection, navigateToSimilarMovies } from "@/lib/movieDetailNavigation";

// M6 part 2a: the Movie-Detail-Overlay's bottom fixed action-buttons bar.
// Owns the delete-confirmation Sheet and the mutation wiring for
// delete/add-to-watchlist; everything else (which actions are visible at
// all) is decided upstream by `getVisibleActions` in movieDetailLogic.ts —
// this component just renders+wires whatever `actions` it's given, in
// order.
//
// Bottom-pinning (position/absolute placement) is the PARENT route file's
// job — this component's own root is a plain flex row/wrap layout.
//
// M7 consolidation (Item 2, see docs/interim-decisions.md): "Bewerten"/
// "Bearbeiten"/"Direkt Bewerten" no longer navigate to a placeholder route
// (the former `navigateToRatingDialog`/`navigateToEditFlow`, which pointed
// at a route that never existed) -- the real `RatingDialog` is now rendered
// directly by the PARENT screen (movie/[tmdbId].tsx) as a controlled
// overlay, matching this component's own delete-confirmation `Sheet`
// convention. This component only reports WHICH watchlist entry/mode to
// open it for, via the two callback props below; it owns no dialog-open
// state of its own for rating.

type Router = ReturnType<typeof useRouter>;

export interface MovieDetailActionsBarProps {
  actions: ActionButtonId[];
  router: Router;
  tmdbId: number;
  groupId?: string;
  watchlistEntryId?: string;
  activeGroupId?: string;
  currentUserId?: string;
  collectionId?: number;
  /** "bewerten" (watchlist context) / "bearbeiten" (diary context) -- see the module comment above. */
  onOpenRatingDialog?: (watchlistEntryId: string, mode: "watchlist" | "diary") => void;
  /** "direkt_bewerten": called once the add-to-watchlist mutation succeeds, with the newly-created entry's id. */
  onDirectRateEntryCreated?: (watchlistEntryId: string) => void;
}

/**
 * German UI copy for the action buttons. Interim translation-adjacent
 * choice made directly during implementation, per the project's narrow
 * ADR-0007 allowance for producing German UI copy — not otherwise reviewed.
 */
const ACTION_LABELS: Record<ActionButtonId, string> = {
  bewerten: "Bewerten",
  bearbeiten: "Bearbeiten",
  aehnliche: "Ähnliche Filme",
  loeschen: "Löschen",
  filmreihe: "Filmreihe",
  zur_watchlist: "Zur Watchlist",
  direkt_bewerten: "Direkt bewerten",
};

/**
 * Add-to-watchlist failure alert copy. Interim, undocumented-elsewhere
 * choice made directly during implementation. Previously had a
 * `MovieNotCatalogedError`-specific branch with its own copy — removed in
 * M7 part 2, since that error case no longer exists (the `upsert_movie`
 * Edge Function action resolves it before `addToWatchlist`'s DB insert is
 * ever attempted — see src/lib/movieDetailMutations.ts).
 */
const GENERIC_ADD_TO_WATCHLIST_ERROR_TITLE = "Fehler";
const GENERIC_ADD_TO_WATCHLIST_ERROR_MESSAGE =
  "Der Film konnte nicht zur Watchlist hinzugefügt werden. Bitte versuche es erneut.";

function handleAddToWatchlistError(): void {
  Alert.alert(GENERIC_ADD_TO_WATCHLIST_ERROR_TITLE, GENERIC_ADD_TO_WATCHLIST_ERROR_MESSAGE);
}

export function MovieDetailActionsBar({
  actions,
  router,
  tmdbId,
  groupId,
  watchlistEntryId,
  activeGroupId,
  currentUserId,
  collectionId,
  onOpenRatingDialog,
  onDirectRateEntryCreated,
}: MovieDetailActionsBarProps) {
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);

  const deleteMutation = useDeleteWatchlistEntry();
  // Shared between "zur_watchlist" and "direkt_bewerten": both buttons call
  // `.mutate` fresh from their own onPress handler, but read `.isPending`
  // from this single hook instance. Simplification, documented as an
  // interim choice: since only one of the two can realistically be tapped
  // at a time in practice, showing `loading` on BOTH buttons whenever
  // either mutation is in flight (rather than tracking which specific
  // button triggered it via extra local state) was accepted rather than
  // building a `pendingActionId`-style tracker.
  const addToWatchlistMutation = useAddToWatchlist();

  function handleDeleteConfirm() {
    if (!watchlistEntryId || !groupId) {
      return;
    }
    // M11 (haptic polish, see docs/interim-decisions.md "M11 — Haptik"): a
    // medium impact right on the confirm tap (not gated on mutation
    // success) -- destructive-confirm feedback should register the instant
    // the user commits, not after a network round-trip.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deleteMutation.mutate(
      { watchlistEntryId, groupId },
      {
        onSuccess: () => {
          setDeleteSheetVisible(false);
          router.back();
        },
      },
    );
  }

  function handleAddToWatchlist() {
    if (!activeGroupId || !currentUserId) {
      return;
    }
    addToWatchlistMutation.mutate(
      { tmdbId, groupId: activeGroupId, addedBy: currentUserId },
      { onError: handleAddToWatchlistError },
    );
  }

  function handleDirektBewerten() {
    if (!activeGroupId || !currentUserId) {
      return;
    }
    addToWatchlistMutation.mutate(
      { tmdbId, groupId: activeGroupId, addedBy: currentUserId },
      {
        onSuccess: (data) => onDirectRateEntryCreated?.(data.id),
        onError: handleAddToWatchlistError,
      },
    );
  }

  function renderAction(id: ActionButtonId) {
    const testID = `movie-detail-action-${id}`;
    const label = ACTION_LABELS[id];

    switch (id) {
      case "aehnliche":
        return (
          <Button
            key={id}
            testID={testID}
            label={label}
            onPress={() => navigateToSimilarMovies(router, tmdbId)}
          />
        );
      case "filmreihe":
        // Defensive no-op guard: `collectionId` is only expected to be
        // present when `hasCollection` was true upstream, but if it's
        // somehow missing here, tapping the button silently does nothing
        // rather than navigating with an invalid id.
        return (
          <Button
            key={id}
            testID={testID}
            label={label}
            onPress={() => {
              if (collectionId != null) {
                navigateToCollection(router, collectionId);
              }
            }}
          />
        );
      case "bewerten":
        // Defensive no-op guard: same rationale as "filmreihe" above, for
        // a missing `watchlistEntryId`.
        return (
          <Button
            key={id}
            testID={testID}
            label={label}
            onPress={() => {
              if (watchlistEntryId) {
                onOpenRatingDialog?.(watchlistEntryId, "watchlist");
              }
            }}
          />
        );
      case "bearbeiten":
        // Defensive no-op guard: same rationale as "filmreihe" above, for
        // a missing `watchlistEntryId`.
        return (
          <Button
            key={id}
            testID={testID}
            label={label}
            onPress={() => {
              if (watchlistEntryId) {
                onOpenRatingDialog?.(watchlistEntryId, "diary");
              }
            }}
          />
        );
      case "loeschen":
        return (
          <Button
            key={id}
            testID={testID}
            label={label}
            variant="danger"
            onPress={() => setDeleteSheetVisible(true)}
          />
        );
      case "zur_watchlist":
        return (
          <Button
            key={id}
            testID={testID}
            label={label}
            loading={addToWatchlistMutation.isPending}
            onPress={handleAddToWatchlist}
          />
        );
      case "direkt_bewerten":
        return (
          <Button
            key={id}
            testID={testID}
            label={label}
            loading={addToWatchlistMutation.isPending}
            onPress={handleDirektBewerten}
          />
        );
      default:
        return null;
    }
  }

  return (
    <>
      <View className="flex-row flex-wrap gap-2 p-4">{actions.map(renderAction)}</View>
      <Sheet
        visible={deleteSheetVisible}
        onClose={() => setDeleteSheetVisible(false)}
        title="Film löschen?">
        <View className="flex-row gap-2">
          <Button
            testID="movie-detail-delete-cancel-button"
            label="Abbrechen"
            variant="secondary"
            className="flex-1"
            onPress={() => setDeleteSheetVisible(false)}
          />
          <Button
            testID="movie-detail-delete-confirm-button"
            label="Löschen"
            variant="danger"
            className="flex-1"
            loading={deleteMutation.isPending}
            onPress={handleDeleteConfirm}
          />
        </View>
      </Sheet>
    </>
  );
}
