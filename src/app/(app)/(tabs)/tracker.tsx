import { Text, View } from 'react-native';

/**
 * Placeholder only — real Tracker screen content is a later M3 content
 * task. Exists purely so the tab is wired up and navigable end to end.
 */
export default function TrackerScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-bg-primary" testID="tracker-screen">
      <Text className="text-lg text-text-primary">Tracker (TODO)</Text>
    </View>
  );
}
