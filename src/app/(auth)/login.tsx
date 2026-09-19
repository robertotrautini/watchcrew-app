import { Text, View } from 'react-native';

/**
 * Placeholder only — real login form fields are a later M3 content task.
 * This screen exists purely so the (auth) route group is wired up and
 * navigable end to end for the navigation-shell check.
 */
export default function LoginScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-bg-primary" testID="login-screen">
      <Text className="text-lg text-text-primary">Login (TODO)</Text>
    </View>
  );
}
