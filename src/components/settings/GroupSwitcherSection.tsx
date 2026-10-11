import { View } from "react-native";

import { IconButton } from "@/components/ui/IconButton";
import { Select } from "@/components/ui/Select";
import { Text } from "@/components/ui/Text";
import { groupDisplayLabel } from "@/lib/diaryDisplay";

interface GroupSwitcherSectionProps {
  activeGroupId: string;
  groups: { group_id: string }[];
  groupNameById: Map<string, string>;
  onChange: (groupId: string) => void;
  onOpenChange: (open: boolean) => void;
  onCreatePress: () => void;
}

/** "Deine Gruppen": dropdown of all the user's groups plus the "new group" button. */
export function GroupSwitcherSection({
  activeGroupId,
  groups,
  groupNameById,
  onChange,
  onOpenChange,
  onCreatePress,
}: GroupSwitcherSectionProps) {
  return (
    <View className="z-50 gap-2" testID="group-settings-switcher">
      <Text className="font-title text-lg text-accent-light">Deine Gruppen</Text>
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Select
            testID="group-settings-switch"
            accessibilityLabel="Gruppe wählen"
            value={activeGroupId}
            options={groups.map((membership) => ({
              value: membership.group_id,
              label: groupDisplayLabel(
                membership.group_id,
                groupNameById.get(membership.group_id),
              ),
            }))}
            onChange={onChange}
            onOpenChange={onOpenChange}
          />
        </View>
        <IconButton
          testID="group-settings-create-button"
          icon="add"
          variant="accent"
          accessibilityLabel="Neue Gruppe anlegen"
          onPress={onCreatePress}
        />
      </View>
    </View>
  );
}
