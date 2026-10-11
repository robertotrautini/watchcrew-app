import { View } from "react-native";

import { IconButton } from "@/components/ui/IconButton";
import { SURFACE_TILE_CLASSNAME } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { memberDisplayLabel } from "@/lib/diaryDisplay";

export interface GroupMemberRowData {
  user_id: string;
  role: string;
  profiles?: { display_name?: string | null } | null;
}

interface GroupMembersSectionProps {
  members: GroupMemberRowData[];
  currentUserId: string | null | undefined;
  isOwner: boolean;
  onRemovePress: (userId: string) => void;
}

function MemberRow({
  member,
  isSelf,
  isOwner,
  onRemovePress,
}: {
  member: GroupMemberRowData;
  isSelf: boolean;
  isOwner: boolean;
  onRemovePress: (userId: string) => void;
}) {
  return (
    <View testID={`group-settings-member-${member.user_id}`} className="gap-2">
      <View className="flex-row items-center gap-3">
        <View
          testID={`group-settings-member-capsule-${member.user_id}`}
          className={`flex-1 flex-row items-center gap-3 ${SURFACE_TILE_CLASSNAME} px-3 py-3`}
        >
          <Text className="flex-1 text-text-primary" numberOfLines={1}>
            {memberDisplayLabel(member.user_id, member.profiles?.display_name)}
          </Text>
          <Text
            testID={`group-settings-member-role-${member.user_id}`}
            className="text-text-secondary"
          >
            {member.role === "owner" ? "Owner" : "Mitglied"}
          </Text>
        </View>
        {isOwner && !isSelf ? (
          <IconButton
            testID={`group-settings-member-${member.user_id}-remove-button`}
            icon="removeMember"
            variant="danger"
            accessibilityLabel="Mitglied entfernen"
            onPress={() => onRemovePress(member.user_id)}
          />
        ) : isOwner ? (
          <View
            testID={`group-settings-member-${member.user_id}-remove-placeholder`}
            className="h-12 w-12 shrink-0"
          />
        ) : null}
      </View>
    </View>
  );
}

/** Member list; owners get a remove button per other member (placeholder keeps alignment for their own row). */
export function GroupMembersSection({
  members,
  currentUserId,
  isOwner,
  onRemovePress,
}: GroupMembersSectionProps) {
  return (
    <View className="gap-2" testID="group-settings-member-list">
      <Text className="font-title text-lg text-accent-light">Mitglieder</Text>
      {members.map((member) => (
        <MemberRow
          key={member.user_id}
          member={member}
          isSelf={member.user_id === currentUserId}
          isOwner={isOwner}
          onRemovePress={onRemovePress}
        />
      ))}
    </View>
  );
}
