import { Share, View } from "react-native";

import { SettingsToggleRow } from "@/components/settings/SettingsToggleRow";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

interface GroupInviteSectionProps {
  inviteLink: string;
  inviteEnabled: boolean;
  regenerating: boolean;
  onRegeneratePress: () => void;
  onToggleEnabled: () => void;
}

/** Owner-only invite link: share, regenerate (confirmed by the screen) and enable/disable. */
export function GroupInviteSection({
  inviteLink,
  inviteEnabled,
  regenerating,
  onRegeneratePress,
  onToggleEnabled,
}: GroupInviteSectionProps) {
  function handleShare() {
    if (!inviteLink) {
      return;
    }
    void Share.share({ message: inviteLink });
  }

  return (
    <View className="gap-2" testID="group-settings-invite-section">
      <Text className="font-title text-lg text-accent-light">Einladungslink</Text>
      <Text testID="group-settings-invite-link" className="text-text-primary" selectable>
        {inviteLink}
      </Text>
      <View className="flex-row gap-2">
        <Button
          testID="group-settings-invite-share-button"
          label="Teilen"
          icon="share"
          variant="secondary"
          className="flex-1"
          onPress={handleShare}
        />
        <Button
          testID="group-settings-invite-regenerate-button"
          label="Neu generieren"
          icon="regenerate"
          variant="secondary"
          className="flex-1"
          loading={regenerating}
          onPress={onRegeneratePress}
        />
      </View>
      <SettingsToggleRow
        testID="group-settings-invite-toggle"
        checked={inviteEnabled}
        onPress={onToggleEnabled}
        label={inviteEnabled ? "Einladungen aktiv" : "Einladungen deaktiviert"}
      />
    </View>
  );
}
