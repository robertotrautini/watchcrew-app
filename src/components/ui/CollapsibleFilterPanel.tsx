import { IconButton } from "@/components/ui/IconButton";
import type { ReactNode } from "react";
import { LayoutAnimation, View } from "react-native";

import { Surface } from "@/components/ui/Surface";
import { PanelShadow } from "@/components/ui/PanelShadow";

export interface CollapsibleFilterPanelProps {
  /** Base testID: `<id>-toggle`, `<id>-panel`, `<id>-active-dot`. */
  testID: string;
  open: boolean;
  onToggle: () => void;
  /** Any non-default sort / chip filter / view mode -> accent dot on the toggle. */
  hasActiveFilters: boolean;
  /** The search field (rendered `flex-1` in the always-visible row). */
  search: ReactNode;
  /** Optional extra buttons between search and toggle (Watchlist: add `+`). */
  actions?: ReactNode;
  /** Panel content, only mounted while open. */
  children: ReactNode;
}

/**
 * Surface card with an always-visible row (search, optional actions, filter toggle)
 * and a collapsible panel below it (sort, view mode, chips). Shared by the
 * Watchlist and Tagebuch tabs. Open state is owned by the caller (persisted per
 * tab in usePreferencesStore); the expand/collapse animates via LayoutAnimation.
 */
export function CollapsibleFilterPanel({
  testID,
  open,
  onToggle,
  hasActiveFilters,
  search,
  actions,
  children,
}: CollapsibleFilterPanelProps) {
  function handleToggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  }

  return (
    <View testID={`${testID}-wrapper`} className="z-10 mx-4 mt-3">
      <PanelShadow testID={`${testID}-shadow`} />
      <Surface variant="solid" className="gap-3 p-3">
        <View className="flex-row items-center gap-3">
          {search}
          {actions}
          <View className="relative">
            <IconButton
              testID={`${testID}-toggle`}
              icon="options"
              variant={open ? "accent" : "neutral"}
              accessibilityLabel="Filter"
              accessibilityState={{ expanded: open }}
              onPress={handleToggle}
            />
            {hasActiveFilters ? (
              <View
                testID={`${testID}-active-dot`}
                pointerEvents="none"
                className="absolute right-0 top-0 h-3 w-3 rounded-full border border-bg-primary bg-accent"
              />
            ) : null}
          </View>
        </View>
        {open ? (
          <View testID={`${testID}-panel`} className="gap-3">
            {children}
          </View>
        ) : null}
      </Surface>
    </View>
  );
}
