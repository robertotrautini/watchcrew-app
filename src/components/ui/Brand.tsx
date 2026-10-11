import { BrandLogo } from "@/components/ui/BrandLogo";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";

export interface BrandProps {
  /** Optional small caps subtitle under the wordmark. */
  subtitle?: string;
}

/**
 * Centred logo header for auth/onboarding screens: horizontal WatchCrew logo (`BrandLogo`).
 */
export function Brand({ subtitle }: BrandProps) {
  return (
    <View testID="brand" className="mb-6 items-center">
      <BrandLogo testID="brand-logo" height={56} />
      {subtitle ? (
        <Text className="mt-1 text-xs uppercase tracking-widest text-text-secondary">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
