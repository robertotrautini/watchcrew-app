import { Text, View } from 'react-native';

/**
 * Placeholder only — real Tagebuch screen content is a later M3 content
 * task. Exists purely so the tab is wired up and navigable end to end.
 */
export default function TagebuchScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-bg-primary" testID="tagebuch-screen">
      <Text className="text-lg text-text-primary">Tagebuch (TODO)</Text>
    </View>
  );
}
