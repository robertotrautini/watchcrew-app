import { View } from "react-native";
import { Button } from "@/components/ui/Button";
import { useSafeBack } from "@/hooks/useSafeBack";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Legacy-style glass "Zurück" button pinned to the bottom of the settings
 * sub-screens, in addition to the native header back arrow.
 */
export function SettingsBackBar() {
  const goBack = useSafeBack();
  return (
    <SafeAreaView edges={["bottom"]} testID="settings-back-bar">
      <View className="px-4 pb-3 pt-2">
        <Button
          testID="settings-back-button"
          variant="secondary"
          label="Zurück" icon="back"
          onPress={goBack}
        />
      </View>
    </SafeAreaView>
  );
}
