import { Fragment, useState } from "react";
import { showToast } from "@/lib/toast";
import { Spinner } from "@/components/ui/Spinner";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Icon, type IconRole } from "@/components/ui/Icon";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import {
  DANGER_ICON_COLOR,
  DANGER_PRESSED_CLASSNAME,
  DANGER_SURFACE_CLASSNAME,
  DANGER_TEXT_CLASSNAME,
} from "@/components/ui/Button";
import { GLASS_TILE_CLASSNAME } from "@/components/ui/Glass";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useAddToWatchlist,
  useDeleteWatchlistEntry,
} from "@/hooks/useMovieDetailMutations";
import type { ActionButtonId } from "@/lib/movieDetailLogic";
import {
  navigateToCollection,
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
  onOpenRatingDialog?: (
    watchlistEntryId: string,
    mode: "watchlist" | "diary",
  ) => void;
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

// 5 actions -> clean 3+2 grid (centered second row); otherwise one equal-width row.
const GRID_THRESHOLD = 4;
const GRID_FIRST_ROW_SIZE = 3;
const GRID_BUTTON_WIDTH = "w-[31%]";

/**
 * Add-to-watchlist failure alert copy. Interim, undocumented-elsewhere
 * choice made directly during implementation. Previously had a
 * `MovieNotCatalogedError`-specific branch with its own copy — removed in
 * M7 part 2, since that error case no longer exists (the `upsert_movie`
 * Edge Function action resolves it before `addToWatchlist`'s DB insert is
 * ever attempted — see src/lib/movieDetailMutations.ts).
 */
const GENERIC_ADD_TO_WATCHLIST_ERROR_MESSAGE =
  "Der Film konnte nicht zur Watchlist hinzugefügt werden. Bitte versuche es erneut.";

function handleAddToWatchlistError(): void {
  showToast(GENERIC_ADD_TO_WATCHLIST_ERROR_MESSAGE, { variant: "error" });
}

/** Legacy-style glass icon buttons of the bottom bar (icon above label). */
const ACTION_ICONS: Record<ActionButtonId, IconRole> = {
  bewerten: "starEmpty",
  bearbeiten: "edit",
  aehnliche: "similar",
  loeschen: "delete",
  filmreihe: "filmSeries",
  zur_watchlist: "bookmarkEmpty",
  direkt_bewerten: "star",
};

const ACTION_ICON_COLOR = "#a8a8a8";

// Fully opaque black (same as the bar surface behind them) so the tiles stand off from the content.
const ACTION_TILE_CLASSNAME = `${GLASS_TILE_CLASSNAME.replace("bg-card", "")} bg-black`;

interface ActionIconButtonProps {
  id: ActionButtonId;
  testID: string;
  label: string;
  widthClass: string;
  danger?: boolean;
  loading?: boolean;
  onPress: () => void;
}

function ActionIconButton({
  id,
  testID,
  label,
  widthClass,
  danger = false,
  loading = false,
  onPress,
}: ActionIconButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading}
      onPress={onPress}
      className={`min-h-touch-comfortable ${widthClass} ${
        danger ? `rounded-xl bg-black` : ACTION_TILE_CLASSNAME
      }${loading ? " opacity-50" : ""}`}
    >
      <View
        testID={danger ? `${testID}-tint` : undefined}
        className={`min-h-touch-comfortable flex-1 items-center justify-center gap-1 px-2 py-3 ${
          danger
            ? `rounded-xl ${DANGER_SURFACE_CLASSNAME} ${DANGER_PRESSED_CLASSNAME}`
            : ""
        }`}
      >
        {loading ? (
          <Spinner testID={`${testID}-loading-indicator`} />
        ) : (
          <Icon
            name={ACTION_ICONS[id]}
            size="M"
            color={danger ? DANGER_ICON_COLOR : ACTION_ICON_COLOR}
          />
        )}
        <Text
          numberOfLines={1}
          className={`text-center text-xs ${danger ? DANGER_TEXT_CLASSNAME : "text-text-secondary"}`}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
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

  function renderAction(id: ActionButtonId, widthClass: string) {
    const testID = `movie-detail-action-${id}`;
    const common = { testID, id, label: ACTION_LABELS[id], widthClass };

    switch (id) {
      case "aehnliche":
        return (
          <ActionIconButton
            {...common}
            onPress={() => navigateToSimilarMovies(router, tmdbId)}
          />
        );
      case "filmreihe":
        // Defensive no-op guard: `collectionId` is only expected to be
        // present when `hasCollection` was true upstream, but if it's
        // somehow missing here, tapping the button silently does nothing
        // rather than navigating with an invalid id.
        return (
          <ActionIconButton
            {...common}
            onPress={() => {
              if (collectionId != null) {
                navigateToCollection(router, collectionId, tmdbId);
              }
            }}
          />
        );
      case "bewerten":
        // Defensive no-op guard: same rationale as "filmreihe" above, for
        // a missing `watchlistEntryId`.
        return (
          <ActionIconButton
            {...common}
            onPress={() => {
              if (watchlistEntryId) {
                onOpenRatingDialog?.(watchlistEntryId, "watchlist");
              }
            }}
          />
        );
      case "bearbeiten":
        return (
          <ActionIconButton
            {...common}
            onPress={() => {
              if (!watchlistEntryId) {
                return;
              }
              // Diary only: watchlist entries edit their release date via the
              // meta row's date line instead (no "bearbeiten" button there).
              onOpenRatingDialog?.(watchlistEntryId, "diary");
            }}
          />
        );
      case "loeschen":
        return (
          <ActionIconButton
            {...common}
            danger
            onPress={() => setDeleteSheetVisible(true)}
          />
        );
      case "zur_watchlist":
        return (
          <ActionIconButton
            {...common}
            loading={addToWatchlistMutation.isPending}
            onPress={handleAddToWatchlist}
          />
        );
      case "direkt_bewerten":
        return (
          <ActionIconButton
            {...common}
            loading={addToWatchlistMutation.isPending}
            onPress={handleDirektBewerten}
          />
        );
      default:
        return null;
    }
  }

  const isGrid = actions.length > GRID_THRESHOLD;

  return (
    <>
      {isGrid ? (
        <View
          testID="movie-detail-actions-row"
          className="gap-2 px-4 pb-2 pt-3"
        >
          <View
            testID="movie-detail-actions-row-1"
            className="flex-row justify-center gap-2"
          >
            {actions.slice(0, GRID_FIRST_ROW_SIZE).map((id) => (
              <Fragment key={id}>
                {renderAction(id, GRID_BUTTON_WIDTH)}
              </Fragment>
            ))}
          </View>
          <View
            testID="movie-detail-actions-row-2"
            className="flex-row justify-center gap-2"
          >
            {actions.slice(GRID_FIRST_ROW_SIZE).map((id) => (
              <Fragment key={id}>
                {renderAction(id, GRID_BUTTON_WIDTH)}
              </Fragment>
            ))}
          </View>
        </View>
      ) : (
        <View
          testID="movie-detail-actions-row"
          className="flex-row gap-2 px-4 pb-2 pt-3"
        >
          {actions.map((id) => (
            <Fragment key={id}>{renderAction(id, "min-w-0 flex-1")}</Fragment>
          ))}
        </View>
      )}
      <ConfirmDialog
        visible={deleteSheetVisible}
        testID="movie-detail-delete"
        title="Film aus der Watchlist entfernen?"
        description="Der Film wird samt aller Bewertungen und Zahlungen der Gruppe gelöscht. Das kann nicht rückgängig gemacht werden."
        confirmLabel="Entfernen"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteSheetVisible(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
