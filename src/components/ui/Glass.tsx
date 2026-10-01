import { View, type ViewProps } from "react-native";

import { cn } from "@/lib/utils";

/**
 * Legacy "glassmorphism" surface, JS-only approximation: translucent dark
 * fill + 1px faint white border + rounded corners, NO blur (no native
 * blur module in the installed dev client; see docs/interim-decisions.md
 * "Design-Angleichung Welle 1"). Shared by Card, Toast and similar surfaces.
 */
export type GlassVariant = "default" | "strong";

export const GLASS_CLASSNAMES: Record<GlassVariant, string> = {
  default: "bg-card rounded-xl border border-glass-border shadow-card",
  strong: "bg-bg-glass-strong rounded-xl border border-glass-border shadow-card",
};

export interface GlassProps extends ViewProps {
  variant?: GlassVariant;
}

export function Glass({ variant = "default", className, ...rest }: GlassProps) {
  return <View className={cn(GLASS_CLASSNAMES[variant], className)} {...rest} />;
}
