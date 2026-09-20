// M7 part 2b: pure business-logic functions for the Rating-Dialog
// (src/components/movie/RatingDialog.tsx). Kept side-effect-free and
// independent of Supabase/React so the single most bug-prone rule in this
// feature area (per the project's own bugfix history) --
// `resolvePaymentDate`'s priority chain -- can be exhaustively unit tested
// without any mocking (see __tests__/ratingLogic.test.ts).

/**
 * `paid_at` priority chain (EXACT rule, non-negotiable -- see
 * docs/interim-decisions.md "M7 Teil 2b" for the two source-doc statements
 * this reconciles):
 *
 *   1. an explicitly-passed NEW payment date (the dialog's own optional
 *      "Bezahlt am" field, only relevant once a payer is selected)
 *   2. an already-set `paid_at` on the watchlist_entries row (NEVER
 *      silently overwritten)
 *   3. the "Gesehen am" date entered in this same dialog save
 *   4. "now" (`now.toISOString()`) as the final fallback
 *
 * All three date-ish inputs may be `null`, `undefined`, or an empty string
 * (a not-yet-filled text field) -- all three are treated identically as
 * "not available", falling through to the next branch. A plain truthy
 * check (not `??`) is used deliberately so `""` doesn't win a branch.
 */
export function resolvePaymentDate(
  explicitDate: string | null | undefined,
  existingPaidAt: string | null | undefined,
  seenAtDate: string | null | undefined,
  now: Date,
): string {
  if (explicitDate) {
    return explicitDate;
  }
  if (existingPaidAt) {
    return existingPaidAt;
  }
  if (seenAtDate) {
    return seenAtDate;
  }
  return now.toISOString();
}

/**
 * The dialog's "Gesehen am" field has three mutually-exclusive states (see
 * the Rating-Dialog spec): a manually-picked date, "Weiß nicht" (explicit
 * NULL), or "Release Date" (adopts the movie's theatrical release date, only
 * offered when one exists). This function is the single source of truth for
 * turning that tri-state UI selection into the actual `seen_at` value to
 * persist, kept separate from the component so the mode-resolution logic is
 * unit-testable without rendering anything.
 */
export type SeenAtMode = "manual" | "unknown" | "release_date";

export function resolveSeenAtDate(
  mode: SeenAtMode,
  manualDate: string | null,
  releaseDate: string | null,
): string | null {
  if (mode === "unknown") {
    return null;
  }
  if (mode === "release_date") {
    // Defensive: the UI is expected to only offer/enable this option when
    // `releaseDate` is non-null, but this function doesn't assume that --
    // a missing release date here just resolves to null rather than
    // throwing or fabricating a date.
    return releaseDate;
  }
  return manualDate;
}

export interface BuildRatingUpsertPayloadArgs {
  watchlistEntryId: string;
  memberId: string;
  /** `null` = no rating yet (e.g. a fresh "direct rate" row before the first tap). */
  rating: number | null;
  liked: boolean;
  /** Already resolved via `resolveSeenAtDate` -- `null` means "Weiß nicht". */
  seenAt: string | null;
  now: Date;
}

export interface RatingUpsertPayload {
  watchlist_entry_id: string;
  member_id: string;
  rating: number | null;
  liked: boolean;
  seen_at: string | null;
  rated_at: string;
}

/**
 * Shapes the `ratings` table upsert payload. `seen_at` (when watched,
 * user-editable) and `rated_at` (when the rating was entered, system-set to
 * "now" on every save) are kept as two independent fields per the M1 schema
 * -- never conflated, per the project's explicit non-negotiable rule.
 */
export function buildRatingUpsertPayload(args: BuildRatingUpsertPayloadArgs): RatingUpsertPayload {
  return {
    watchlist_entry_id: args.watchlistEntryId,
    member_id: args.memberId,
    rating: args.rating,
    liked: args.liked,
    seen_at: args.seenAt,
    rated_at: args.now.toISOString(),
  };
}

const GERMAN_DATE_REGEX = /^(\d{2})\.(\d{2})\.(\d{4})$/;

/**
 * RESOLVED (M7 consolidation, Item 3 -- see docs/interim-decisions.md): the
 * Rating-Dialog's "Gesehen am"/"Bezahlt am" fields now use a real native
 * date-picker (`@react-native-community/datetimepicker`, wrapped by
 * `src/components/ui/DateField.tsx`) instead of a plain `TextInput`. These
 * two pure parse/format helpers are UNCHANGED and still do all the actual
 * DD.MM.YYYY <-> YYYY-MM-DD (Postgres `date`) conversion -- `DateField`
 * only replaced the input widget around them, converting the picker's
 * native `Date` to/from these functions' plain-string contract at its own
 * boundary (see that component's doc comment). The original decision to
 * NOT wire in a picker library was itself later resolved (also logged in
 * docs/interim-decisions.md) once the user confirmed the concrete library.
 *
 * `parseGermanDateInput` validates the shape (two-digit day/month, four-
 * digit year) AND rejects calendar-invalid dates (e.g. "32.13.2026") by
 * round-tripping through `Date` and checking the parts survived unchanged
 * -- `new Date(...)` alone silently rolls invalid dates forward/backward
 * instead of rejecting them.
 */
export function parseGermanDateInput(input: string): string | null {
  const match = GERMAN_DATE_REGEX.exec(input.trim());
  if (!match) {
    return null;
  }
  const [, day, month, year] = match;
  const isoCandidate = `${year}-${month}-${day}`;
  const parsed = new Date(`${isoCandidate}T00:00:00Z`);
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return isoCandidate;
}

export function formatDateForInput(dateIso: string | null): string {
  if (!dateIso) {
    return "";
  }
  const [year, month, day] = dateIso.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
}
