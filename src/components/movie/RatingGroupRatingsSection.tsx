import { View } from "react-native";

import { MemberRatingRow } from "@/components/movie/MemberRatingRow";
import { Text } from "@/components/ui/Text";
import { memberDisplayLabel } from "@/lib/diaryDisplay";
import type { GroupMemberRow } from "@/lib/groups";
import type { Rating } from "@/lib/watchlistTypes";

export interface OtherRatingRow {
  key: string;
  label: string;
  rating: number | null;
}

/**
 * Every OTHER member (also those who have not rated yet, shown with empty
 * stars like the legacy dialog); falls back to the raw rating rows when no
 * member list is given.
 */
export function buildOtherRatingRows(
  groupMembers: GroupMemberRow[],
  otherRatings: Rating[],
  currentUserId: string,
  displayNameById: Map<string, string>,
): OtherRatingRow[] {
  const otherMembers = groupMembers.filter((m) => m.user_id !== currentUserId);
  if (otherMembers.length > 0) {
    return otherMembers.map((m) => ({
      key: m.user_id,
      label: memberDisplayLabel(
        m.user_id,
        m.profiles?.display_name ?? displayNameById.get(m.user_id),
      ),
      rating: otherRatings.find((r) => r.member_id === m.user_id)?.rating ?? null,
    }));
  }
  return otherRatings.map((r) => ({
    key: r.member_id,
    label: memberDisplayLabel(r.member_id, displayNameById.get(r.member_id)),
    rating: r.rating,
  }));
}

/** "Bewertungen der Gruppe": read-only star rows of the other members. */
export function RatingGroupRatingsSection({
  rows,
  starColor,
}: {
  rows: OtherRatingRow[];
  starColor: string;
}) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <View testID="rating-dialog-other-ratings" className="gap-1 border-t border-surface-border pt-3">
      <Text className="text-text-secondary">Bewertungen der Gruppe</Text>
      {rows.map((row) => (
        <MemberRatingRow
          key={row.key}
          memberLabel={row.label}
          rating={row.rating}
          starColor={starColor}
          hideValue
        />
      ))}
    </View>
  );
}
