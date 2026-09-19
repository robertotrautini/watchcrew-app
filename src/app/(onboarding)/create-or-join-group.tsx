import { Text, View } from 'react-native';

/**
 * Placeholder only — the real "create or join a Watch-Group" flow is a
 * later M3 content task. This screen exists purely so the (onboarding)
 * route group is wired up and navigable end to end for the
 * navigation-shell check.
 */
export default function CreateOrJoinGroupScreen() {
  return (
    <View
      className="flex-1 items-center justify-center bg-bg-primary"
      testID="create-or-join-group-screen">
      <Text className="text-lg text-text-primary">Create or Join Group (TODO)</Text>
    </View>
  );
}
