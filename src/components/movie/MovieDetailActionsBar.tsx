import { useState } from "react";
import { Alert, View } from "react-native";
import { useRouter } from "expo-router";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import {
  MovieNotCatalogedError,
  useAddToWatchlist,
  useDeleteWatchlistEntry,
} from "@/hooks/useMovieDetailMutations";
import type { ActionButtonId } from "@/lib/movieDetailLogic";
import {
  navigateToCollection,
  navigateToEditFlow,
  navigateToRatingDialog,
  navigateToSimilarMovies,
} from "@/lib/movieDetailNavigation";

// M6 part 2a: the Movie-Detail-Overlay's bottom fixed action-buttons bar.
// Owns the delete-confirmation Sheet and the mutation wiring for
// delete/add-to-watchlist; everything else (which actions are visible at
// all) is decided upstream by `getVisibleActions` in movieDetailLogic.ts —
// this component just renders+wires whatever `actions` it's given, in
// order.
//
// Bottom-pinning (position/absolute placement) is the PARENT route file's
// job — this component's own root is a plain flex row/wrap layout.

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
 * Generic add-to-watchlist failure alert copy (anything other than the
 * known `MovieNotCatalogedError` case). Interim, undocumented-elsewhere
 * choice made directly during implementation — the `MovieNotCatalogedError`
 * copy right below it is the one mandatory, verbatim string from the task
 * spec and must not be changed.
 */
const GENERIC_ADD_TO_WATCHLIST_ERROR_TITLE = "Fehler";
const GENERIC_ADD_TO_WATCHLIST_ERROR_MESSAGE =
  "Der Film konnte nicht zur Watchlist hinzugefügt werden. Bitte versuche es erneut.";

function handleAddToWatchlistError(error: unknown): void {
  if (error instanceof MovieNotCatalogedError) {
    Alert.alert(
      "Film kann nicht hinzugefügt werden",
      "Dieser Film ist noch nicht im Katalog erfasst — bitte an die Entwicklung melden.",
    );
    return;
  }
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
        onSuccess: (data) => navigateToRatingDialog(router, data.id),
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
                navigateToRatingDialog(router, watchlistEntryId);
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
                navigateToEditFlow(router, watchlistEntryId);
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
