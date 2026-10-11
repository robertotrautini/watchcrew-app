import { useGroupTheme } from "@/components/GroupThemeProvider";
import { Image } from "@/components/ui/Image";
import type { GroupThemeName } from "@/lib/groupTheme";

/**
 * Pre-rendered logo PNGs per group theme (transparent, 6x resolution), generated from the
 * SVG masters in docs/logo-concepts/final/ by `scripts/generate-logo-assets.js`.
 * PNG instead of SVG because `react-native-svg` is not part of the current dev-client binary.
 */
 
export const LOGO_HORIZONTAL: Record<GroupThemeName, number> = {
  gold: require("../../../assets/images/logo/watchcrew-logo-gold.png"),
  red: require("../../../assets/images/logo/watchcrew-logo-red.png"),
  blue: require("../../../assets/images/logo/watchcrew-logo-blue.png"),
  green: require("../../../assets/images/logo/watchcrew-logo-green.png"),
  purple: require("../../../assets/images/logo/watchcrew-logo-purple.png"),
  orange: require("../../../assets/images/logo/watchcrew-logo-orange.png"),
};
export const LOGO_ICON: Record<GroupThemeName, number> = {
  gold: require("../../../assets/images/logo/watchcrew-logo-icon-gold.png"),
  red: require("../../../assets/images/logo/watchcrew-logo-icon-red.png"),
  blue: require("../../../assets/images/logo/watchcrew-logo-icon-blue.png"),
  green: require("../../../assets/images/logo/watchcrew-logo-icon-green.png"),
  purple: require("../../../assets/images/logo/watchcrew-logo-icon-purple.png"),
  orange: require("../../../assets/images/logo/watchcrew-logo-icon-orange.png"),
};
 

/** Horizontal logo aspect ratio (260 x 64 design space). */
const HORIZONTAL_ASPECT = 260 / 64;

export interface BrandLogoProps {
  /** Logo height in dp (badge height); width follows the aspect ratio. Default 44. */
  height?: number;
  /** Badge only (square) instead of badge + wordmark. */
  badgeOnly?: boolean;
  testID?: string;
}

/** WatchCrew logo (P3 badge + wordmark) in the current group-theme accent. */
export function BrandLogo({ height = 44, badgeOnly = false, testID = "brand-logo" }: BrandLogoProps) {
  const { name } = useGroupTheme();
  const source = (badgeOnly ? LOGO_ICON : LOGO_HORIZONTAL)[name];
  const width = badgeOnly ? height : Math.round(height * HORIZONTAL_ASPECT);
  return (
    <Image
      testID={testID}
      source={source}
      contentFit="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel="WatchCrew"
      style={{ width, height }}
    />
  );
}
