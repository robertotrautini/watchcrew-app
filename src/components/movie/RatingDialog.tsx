import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/ui/Icon";

import { MemberRatingRow } from "@/components/movie/MemberRatingRow";
import { DateField } from "@/components/ui/DateField";
import { Sheet } from "@/components/ui/Sheet";
import { StarRating } from "@/components/ui/StarRating";
import { useResetRating, useSaveRating } from "@/hooks/useSaveRating";
import { memberDisplayLabel } from "@/lib/diaryDisplay";
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
import { Chip } from "@/components/ui/Chip";
import {
  Button,
  BUTTON_ICON_COLORS,
  BUTTON_ICON_COLOR_DISABLED,
} from "@/components/ui/Button";

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
}

/**
 * Feedback uses the app toast (`showToast`, variant `success` green / `error` red --
 * see docs/style-guide.md "Toasts"; replaced the native alerts).
 */
const SAVE_SUCCESS_TOAST = "Bewertung gespeichert";
const SAVE_ERROR_MESSAGE =
  "Die Bewertung konnte nicht gespeichert werden. Bitte versuche es erneut.";
const RESET_ERROR_MESSAGE =
  "Die Bewertung konnte nicht zurückgesetzt werden. Bitte versuche es erneut.";

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

function initialManualDateInput(ownRating: Rating | null): string {
  if (ownRating?.seen_at) {
    return formatDateForInput(ownRating.seen_at);
  }
  return formatDateForInput(toLocalIsoDate(new Date()));
}

export function RatingDialog({
  visible,
  onClose,
  mode,
  groupId,
  currentUserId,
  movieTitle,
  movieReleaseDate,
  watchlistEntryId,
  paidByMemberId,
  paidAt,
  ratings,
  groupMembers,
  displayNameById,
  starColor,
  onSaved,
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
  const [paymentDateInput, setPaymentDateInput] = useState<string>("");

  const saveMutation = useSaveRating();
  const resetMutation = useResetRating();

  // Re-sync the draft to the current props every time the dialog transitions
  // to visible -- interim decision (docs/interim-decisions.md "M7 Teil
  // 2b"): the dialog's local draft state is NOT preserved across
  // open/close cycles (e.g. opening it for a different movie right after
  // closing it for another must not leak the previous draft).
  useEffect(() => {
    if (!visible) {
      return;
    }
    setRating(ownRating?.rating ?? null);
    setLiked(ownRating?.liked ?? false);
    setSeenAtMode(initialSeenAtMode(ownRating));
    setManualDateInput(initialManualDateInput(ownRating));
    setSelectedPayerId(paidByMemberId);
    setPaymentDateInput("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, watchlistEntryId]);

  // Group section: every OTHER member (also those who have not rated yet, shown with empty
  // stars like the legacy dialog); falls back to the raw rating rows when no member list is given.
  const groupRatingRows =
    groupMembers.filter((m) => m.user_id !== currentUserId).length > 0
      ? groupMembers
          .filter((m) => m.user_id !== currentUserId)
          .map((m) => ({
            key: m.user_id,
            label: memberDisplayLabel(
              m.user_id,
              m.profiles?.display_name ?? displayNameById.get(m.user_id),
            ),
            rating:
              otherRatings.find((r) => r.member_id === m.user_id)?.rating ??
              null,
          }))
      : otherRatings.map((r) => ({
          key: r.id,
          label: memberDisplayLabel(
            r.member_id,
            displayNameById.get(r.member_id),
          ),
          rating: r.rating,
        }));

  const canReset = hasRealRating(ownRating?.rating ?? null);
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

  function handleSave() {
    const manualDateIso = parseGermanDateInput(manualDateInput);
    const seenAt = resolveSeenAtDate(
      seenAtMode,
      manualDateIso,
      movieReleaseDate,
    );

    const explicitPaidAt = parseGermanDateInput(paymentDateInput);
    const payment =
      trackerEnabled && selectedPayerId
        ? {
            paidByMemberId: selectedPayerId,
            explicitPaidAt,
            existingPaidAt: paidAt,
          }
        : undefined;

    saveMutation.mutate(
      {
        groupId,
        watchlistEntryId,
        memberId: currentUserId,
        rating,
        liked,
        seenAt,
        payment,
      },
      {
        onSuccess: () => {
          onSaved?.();
          showToast(SAVE_SUCCESS_TOAST, { variant: "success" });
          onClose();
        },
        onError: () => {
          showToast(SAVE_ERROR_MESSAGE, { variant: "error" });
        },
      },
    );
  }

  function handleReset() {
    if (!ownRating) {
      return;
    }
    resetMutation.mutate(
      { groupId, ratingId: ownRating.id },
      {
        onSuccess: () => {
          setRating(null);
          setLiked(false);
        },
        onError: () => {
          showToast(RESET_ERROR_MESSAGE, { variant: "error" });
        },
      },
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={SHEET_TITLES[mode]}>
      <View testID="rating-dialog" className="gap-4">
        <Text className="font-display-bold text-lg text-accent-light">
          {movieTitle}
        </Text>

        <View className="gap-2">
          <Text className="text-text-secondary">Gesehen am</Text>
          <DateField
            testID="rating-dialog-seen-at-input"
            valueIso={parseGermanDateInput(manualDateInput)}
            displayText={manualDateInput}
            placeholder="TT.MM.JJJJ"
            editable={seenAtMode === "manual"}
            onChangeIso={(iso) => setManualDateInput(formatDateForInput(iso))}
          />

          <View className="flex-row flex-wrap gap-x-6">
            <Pressable
              testID="rating-dialog-checkbox-unknown"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: seenAtMode === "unknown" }}
              onPress={toggleUnknown}
              className="min-h-touch-comfortable flex-row items-center gap-2"
            >
              <Icon
                name={seenAtMode === "unknown" ? "checkboxOn" : "checkboxOff"}
                size="M"
                color={starColor}
              />
              <Text className="text-text-primary">Weiß nicht</Text>
            </Pressable>

            {releaseDateAvailable ? (
              <Pressable
                testID="rating-dialog-checkbox-release-date"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: seenAtMode === "release_date" }}
                onPress={toggleReleaseDate}
                className="min-h-touch-comfortable flex-row items-center gap-2"
              >
                <Icon
                  name={
                    seenAtMode === "release_date" ? "checkboxOn" : "checkboxOff"
                  }
                  size="M"
                  color={starColor}
                />
                <Text className="text-text-primary">
                  Release Date ({formatDateForInput(movieReleaseDate)})
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <StarRating
            iconSize="L"
            rating={rating}
            starColor={starColor}
            onChange={setRating}
            liked={liked}
            onToggleLike={() => setLiked((prev) => !prev)}
          />
          <Button
            testID="rating-dialog-reset-button"
            variant="danger"
            size="xs"
            iconOnly
            accessibilityLabel="Bewertung zurücksetzen"
            disabled={!canReset || resetMutation.isPending}
            onPress={handleReset}
          >
            <Icon
              name="delete"
              size="M"
              color={
                canReset
                  ? BUTTON_ICON_COLORS.danger
                  : BUTTON_ICON_COLOR_DISABLED
              }
            />
          </Button>
        </View>

        {groupRatingRows.length > 0 ? (
          <View
            testID="rating-dialog-other-ratings"
            className="gap-1 border-t border-glass-border pt-3"
          >
            <Text className="text-text-secondary">Bewertungen der Gruppe</Text>
            {groupRatingRows.map((row) => (
              <MemberRatingRow
                key={row.key}
                memberLabel={row.label}
                rating={row.rating}
                starColor={starColor}
                hideValue
              />
            ))}
          </View>
        ) : null}

        {trackerEnabled ? (
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <Icon name="price" size="S" color="#888888" />
              <Text className="text-text-secondary">Wer hat bezahlt?</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {groupMembers.map((member) => {
                const isSelected = selectedPayerId === member.user_id;
                return (
                  <Chip
                    key={member.user_id}
                    testID={`rating-dialog-payer-chip-${member.user_id}`}
                    active={isSelected}
                    className="shrink-0"
                    onPress={() =>
                      setSelectedPayerId(isSelected ? null : member.user_id)
                    }
                    label={memberDisplayLabel(
                      member.user_id,
                      member.profiles?.display_name,
                    )}
                  />
                );
              })}
            </View>

            {selectedPayerId ? (
              <DateField
                testID="rating-dialog-payment-date-input"
                valueIso={parseGermanDateInput(paymentDateInput)}
                displayText={paymentDateInput}
                placeholder="Bezahlt am (TT.MM.JJJJ, optional)"
                onChangeIso={(iso) =>
                  setPaymentDateInput(formatDateForInput(iso))
                }
              />
            ) : null}
          </View>
        ) : null}

        <View className="flex-row gap-3">
          <Button
            testID="rating-dialog-cancel-button"
            variant="secondary"
            className="flex-1"
            label="Abbrechen"
            icon="close"
            onPress={onClose}
          />
          <Button
            testID="rating-dialog-save-button"
            variant="primary"
            className="flex-[1.6]"
            loading={saveMutation.isPending}
            label="Speichern"
            icon="save"
            onPress={handleSave}
          />
        </View>
      </View>
    </Sheet>
  );
}
