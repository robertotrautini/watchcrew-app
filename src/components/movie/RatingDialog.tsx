import { IconButton } from "@/components/ui/IconButton";
import { MOVIE_TITLE_FONT } from "@/components/ui/movieTitle";
import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";

import {
  buildOtherRatingRows,
  RatingGroupRatingsSection,
} from "@/components/movie/RatingGroupRatingsSection";
import { RatingPaymentSection } from "@/components/movie/RatingPaymentSection";
import { RatingSeenAtSection } from "@/components/movie/RatingSeenAtSection";
import { DraftSheet, DraftSheetForm } from "@/components/ui/DraftSheet";
import { StarRating } from "@/components/ui/StarRating";
import { useDirectRate } from "@/hooks/useDirectRate";
import { useResetRating, useSaveRating } from "@/hooks/useSaveRating";
import type { GroupMemberRow } from "@/lib/groups";
import {
  formatDateForInput,
  parseGermanDateInput,
  resolveSeenAtDate,
  type SeenAtMode,
} from "@/lib/ratingLogic";
import type { Rating } from "@/lib/watchlistTypes";
import { showToast } from "@/lib/toast";
import { toLocalIsoDate } from "@/lib/localDate";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * M7 part 2b: the shared Rating-Dialog, used for all three contexts named
 * in the task brief:
 *   - "watchlist": rating a movie from the Watchlist for the first time.
 *   - "diary": editing an existing rating from the Diary.
 *   - "direct": "Direkt Bewerten" (rate immediately after adding a new
 *     movie, for the acting user only).
 *
 * All three share IDENTICAL UI/behavior per the spec ("this dialog, when
 * opened in direct-rate mode, should behave identically to the normal
 * rating dialog"). `mode` is used only to pick the Sheet's title copy --
 * the underlying save/reset mutations and business rules are the same in
 * every mode.
 *
 * Prop-shape decision (documented, no ADR governs this): rather than a
 * grab-bag of individual scalar fields, this component takes the same
 * shapes the rest of the M6 movie-detail screen already produces --
 * `ratings: Rating[]` (all rating rows for this watchlist entry, own +
 * others -- the OWN row is found internally by `member_id === currentUserId`
 * rather than being a separate prop, so all three contexts, including a
 * brand-new "direct rate" entry with no own row yet, are handled uniformly)
 * and `groupMembers`/`displayNameById` (the exact shapes `useGroupMembers`/
 * the movie-detail screen already compute) for the payer picker and name
 * resolution. This avoids re-deriving data the caller already has.
 */
export type RatingDialogMode = "watchlist" | "diary" | "direct";

const SHEET_TITLES: Record<RatingDialogMode, string> = {
  watchlist: "Bewerten",
  diary: "Bewertung bearbeiten",
  direct: "Direkt bewerten",
};

export interface RatingDialogProps {
  visible: boolean;
  onClose: () => void;
  /** Only affects the Sheet's title copy -- see the module doc above. */
  mode: RatingDialogMode;
  groupId: string;
  currentUserId: string;
  movieTitle: string;
  /** The movie's theatrical release date (YYYY-MM-DD), or null if unknown -- gates the "Release Date" checkbox. */
  movieReleaseDate: string | null;
  watchlistEntryId: string;
  /** `movies.id` -- ratings are stored per user and movie (ADR 0014). */
  movieId: string;
  /** `watchlist_entries.paid_by_member_id` -- pre-selects that payer chip on open. */
  paidByMemberId: string | null;
  /** `watchlist_entries.paid_at` -- NEVER silently overwritten, see `resolvePaymentDate`. */
  paidAt: string | null;
  /** ALL rating rows for this watchlist entry (own + every other member's). */
  ratings: Rating[];
  /** The group's current membership, for the "Wer hat bezahlt?" picker. */
  groupMembers: GroupMemberRow[];
  displayNameById: Map<string, string>;
  starColor: string;
  /** Called (in addition to `onClose`, which always follows) after a successful save. */
  onSaved?: () => void;
  /**
   * "Direkt bewerten": the movie is not in the group yet. Nothing is written when the dialog opens;
   * on Speichern the rating AND the group entry are created together (`useDirectRate`).
   * `watchlistEntryId`/`movieId` are unused then.
   */
  directCreate?: { tmdbId: number; manualReleaseDate?: string };
}

/**
 * Feedback uses the app toast (`showToast`, variant `success` green / `error` red --
 * see docs/style-guide.md "Toasts"; replaced the native alerts).
 */
const SAVE_SUCCESS_TOAST = "Bewertung gespeichert";
const SAVE_ERROR_MESSAGE =
  "Die Bewertung konnte nicht gespeichert werden. Bitte versuche es erneut.";
const DIRECT_ENTRY_ERROR_MESSAGE =
  "Bewertung gespeichert, aber der Film konnte der Gruppe nicht hinzugefügt werden.";
const RESET_ERROR_MESSAGE =
  "Die Bewertung konnte nicht gelöscht werden. Bitte versuche es erneut.";
const DELETE_SUCCESS_TOAST = "Bewertung gelöscht";

/** `rating == null || rating <= 0` -- the project-wide "0/null both mean no real rating" convention. */
function hasRealRating(rating: number | null): rating is number {
  return rating != null && rating > 0;
}

function initialSeenAtMode(ownRating: Rating | null): SeenAtMode {
  if (ownRating && ownRating.seen_at == null && ownRating.rated_at != null) {
    // A previously-saved row with a null seen_at can only mean "Weiß nicht"
    // was explicitly chosen last time -- seen_at otherwise always defaults
    // to a concrete date (today, or the release date) per the dialog's own
    // rules, it's never silently left null.
    return "unknown";
  }
  return "manual";
}

/** Existing payment date (paid_at may be a timestamp) as TT.MM.JJJJ, or "" when no payment exists. */
function initialPaymentDateInput(paidAt: string | null): string {
  return paidAt ? formatDateForInput(paidAt.slice(0, 10)) : "";
}

function initialManualDateInput(ownRating: Rating | null): string {
  if (ownRating?.seen_at) {
    return formatDateForInput(ownRating.seen_at);
  }
  return formatDateForInput(toLocalIsoDate(new Date()));
}

/**
 * The draft is mounted only while the dialog is open (and per entry), so every open starts from
 * the current props -- interim decision (docs/interim-decisions.md "M7 Teil 2b"): the local
 * draft is NOT preserved across open/close cycles (opening it for another movie right after
 * closing it for one must not leak the previous draft).
 */
export function RatingDialog(props: RatingDialogProps) {
  if (!props.visible) {
    return null;
  }
  return <RatingDialogBody key={props.watchlistEntryId} {...props} />;
}

function RatingDialogBody({
  onClose,
  mode,
  groupId,
  currentUserId,
  movieTitle,
  movieReleaseDate,
  watchlistEntryId,
  movieId,
  paidByMemberId,
  paidAt,
  ratings,
  groupMembers,
  displayNameById,
  starColor,
  onSaved,
  directCreate,
}: RatingDialogProps) {
  const ownRating = ratings.find((r) => r.member_id === currentUserId) ?? null;
  const otherRatings = ratings.filter((r) => r.member_id !== currentUserId);
  // Per-device Tracker flag: off hides the whole payment section AND skips the payment write,
  // so an existing paid_by/paid_at is never touched (or newly stamped) from a hidden UI.
  const trackerEnabled = usePreferencesStore((s) => s.trackerEnabled);

  const [rating, setRating] = useState<number | null>(
    ownRating?.rating ?? null,
  );
  const [liked, setLiked] = useState<boolean>(ownRating?.liked ?? false);
  const [seenAtMode, setSeenAtMode] = useState<SeenAtMode>(
    initialSeenAtMode(ownRating),
  );
  const [manualDateInput, setManualDateInput] = useState<string>(
    initialManualDateInput(ownRating),
  );
  const [selectedPayerId, setSelectedPayerId] = useState<string | null>(
    paidByMemberId,
  );
  const [paymentDateInput, setPaymentDateInput] = useState<string>(
    initialPaymentDateInput(paidAt),
  );

  // Draft flag: the trash button only marks the rating as "to delete"; the delete runs on Speichern
  // (after confirmation). Cancel/close discards it. Any new star/heart input clears it again.
  const [markedForDelete, setMarkedForDelete] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const saveMutation = useSaveRating();
  const resetMutation = useResetRating();
  const directMutation = useDirectRate();

  const groupRatingRows = buildOtherRatingRows(
    groupMembers,
    otherRatings,
    currentUserId,
    displayNameById,
  );

  const canReset = hasRealRating(ownRating?.rating ?? null) && !markedForDelete;
  const releaseDateAvailable = movieReleaseDate != null;

  function toggleUnknown() {
    setSeenAtMode((prev) => (prev === "unknown" ? "manual" : "unknown"));
  }

  function toggleReleaseDate() {
    if (!releaseDateAvailable) {
      return;
    }
    setSeenAtMode((prev) =>
      prev === "release_date" ? "manual" : "release_date",
    );
  }

  function buildPayment() {
    const explicitPaidAt = parseGermanDateInput(paymentDateInput);
    return trackerEnabled && selectedPayerId
      ? {
          paidByMemberId: selectedPayerId,
          explicitPaidAt,
          existingPaidAt: paidAt,
        }
      : undefined;
  }

  function currentSeenAt() {
    return resolveSeenAtDate(
      seenAtMode,
      parseGermanDateInput(manualDateInput),
      movieReleaseDate,
    );
  }

  function finishSaved(message: string) {
    onSaved?.();
    showToast(message, { variant: "success" });
    onClose();
  }

  function handleSave() {
    if (markedForDelete && ownRating) {
      setDeleteConfirmVisible(true);
      return;
    }
    if (mode === "direct" && directCreate) {
      const payment = buildPayment();
      directMutation.mutate(
        {
          tmdbId: directCreate.tmdbId,
          manualReleaseDate: directCreate.manualReleaseDate,
          groupId,
          memberId: currentUserId,
          rating,
          liked,
          seenAt: currentSeenAt(),
          payment: payment && {
            paidByMemberId: payment.paidByMemberId,
            explicitPaidAt: payment.explicitPaidAt,
          },
        },
        {
          onSuccess: () => finishSaved(SAVE_SUCCESS_TOAST),
          onError: (error) => {
            if ((error as { ratingSaved?: boolean }).ratingSaved) {
              // Rating stays saved; only the group entry failed.
              onSaved?.();
              showToast(DIRECT_ENTRY_ERROR_MESSAGE, { variant: "error" });
              onClose();
              return;
            }
            showToast(SAVE_ERROR_MESSAGE, { variant: "error" });
          },
        },
      );
      return;
    }
    saveMutation.mutate(
      {
        groupId,
        watchlistEntryId,
        movieId,
        memberId: currentUserId,
        rating,
        liked,
        seenAt: currentSeenAt(),
        payment: buildPayment(),
      },
      {
        onSuccess: () => finishSaved(SAVE_SUCCESS_TOAST),
        onError: () => {
          showToast(SAVE_ERROR_MESSAGE, { variant: "error" });
        },
      },
    );
  }

  /** Confirmed delete: reset the rating once; a payment draft is persisted afterwards. */
  function handleConfirmDelete() {
    if (!ownRating) {
      return;
    }
    const payment = buildPayment();
    resetMutation.mutate(
      { groupId, userId: currentUserId, movieId },
      {
        onSuccess: () => {
          setDeleteConfirmVisible(false);
          if (!payment) {
            finishSaved(DELETE_SUCCESS_TOAST);
            return;
          }
          saveMutation.mutate(
            {
              groupId,
              watchlistEntryId,
              movieId,
              memberId: currentUserId,
              rating: null,
              liked: false,
              seenAt: currentSeenAt(),
              payment,
              skipRating: true,
            },
            {
              onSuccess: () => finishSaved(DELETE_SUCCESS_TOAST),
              onError: () => {
                showToast(SAVE_ERROR_MESSAGE, { variant: "error" });
              },
            },
          );
        },
        onError: () => {
          setDeleteConfirmVisible(false);
          showToast(RESET_ERROR_MESSAGE, { variant: "error" });
        },
      },
    );
  }

  function handleReset() {
    setRating(null);
    setLiked(false);
    setMarkedForDelete(true);
  }

  function handleRatingChange(next: number | null) {
    setMarkedForDelete(false);
    setRating(next);
  }

  function handleToggleLike() {
    setMarkedForDelete(false);
    setLiked((prev) => !prev);
  }

  return (
    <>
      <DraftSheet visible onCancel={onClose} title={SHEET_TITLES[mode]}>
        <DraftSheetForm
          testID="rating-dialog"
          className="gap-4"
          cancelTestID="rating-dialog-cancel-button"
          confirmTestID="rating-dialog-save-button"
          saveClassName="flex-[1.6]"
          loading={
            (saveMutation.isPending || directMutation.isPending) &&
            !deleteConfirmVisible
          }
          onSave={handleSave}
        >
          <Text className={`text-lg ${MOVIE_TITLE_FONT} text-accent-light`}>
            {movieTitle}
          </Text>

          <RatingSeenAtSection
            mode={seenAtMode}
            manualDateInput={manualDateInput}
            onChangeManualDate={setManualDateInput}
            onToggleUnknown={toggleUnknown}
            onToggleReleaseDate={toggleReleaseDate}
            movieReleaseDate={movieReleaseDate}
            starColor={starColor}
          />

          <View className="flex-row items-center justify-between">
            <StarRating
              iconSize="L"
              rating={rating}
              starColor={starColor}
              onChange={handleRatingChange}
              liked={liked}
              onToggleLike={handleToggleLike}
            />
            <IconButton
              testID="rating-dialog-reset-button"
              icon="delete"
              variant="danger"
              accessibilityLabel="Bewertung zurücksetzen"
              disabled={!canReset}
              onPress={handleReset}
            />
          </View>

          <RatingGroupRatingsSection rows={groupRatingRows} starColor={starColor} />

          {trackerEnabled ? (
            <RatingPaymentSection
              groupMembers={groupMembers}
              selectedPayerId={selectedPayerId}
              onSelectPayer={setSelectedPayerId}
              paymentDateInput={paymentDateInput}
              onChangePaymentDate={setPaymentDateInput}
            />
          ) : null}
        </DraftSheetForm>
      </DraftSheet>
      <ConfirmDialog
        visible={deleteConfirmVisible}
        testID="rating-dialog-delete"
        title="Bewertung wirklich löschen?"
        description={`Deine Bewertung für „${movieTitle}“ wird gelöscht, inklusive Herz. Das kann nicht rückgängig gemacht werden.`}
        loading={resetMutation.isPending || saveMutation.isPending}
        onCancel={() => setDeleteConfirmVisible(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
