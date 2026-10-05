import { Icon } from "@/components/ui/Icon";
import { Text, View } from "react-native";

export interface BrandProps {
  /** Optional small caps subtitle under the wordmark. */
  subtitle?: string;
}

/**
 * Legacy-style centred logo header for auth/onboarding screens: reel icon +
 * "WATCHCREW" wordmark (Playfair, always white) between two hairlines.
 */
export function Brand({ subtitle }: BrandProps) {
  return (
    <View testID="brand" className="mb-6 items-center">
      <Icon testID="brand-icon" name="film" size="L" color="#ffffff" />
      <View className="flex-row items-center gap-3">
        <View className="h-px w-8 bg-glass-border" />
        <Text className="font-display-bold text-2xl tracking-widest text-white">
          WATCHCREW
        </Text>
        <View className="h-px w-8 bg-glass-border" />
      </View>
      {subtitle ? (
        <Text className="mt-1 text-xs uppercase tracking-widest text-text-secondary">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
