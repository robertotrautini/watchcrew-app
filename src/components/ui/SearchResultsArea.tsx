import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import type { IconRole } from "@/components/ui/Icon";
import { LoadingArea } from "@/components/ui/LoadingArea";
import { Text } from "@/components/ui/Text";

export interface SearchResultsAreaProps {
  testID: string;
  isLoading?: boolean;
  loadingTestID: string;
  isError?: boolean;
  errorTestID?: string;
  errorMessage?: string;
  /** No results (or nothing searched yet): shows the EmptyState instead of `children`. */
  isEmpty?: boolean;
  emptyTestID: string;
  emptyIcon: IconRole;
  emptyTitle: string;
  /** Wrap `children` in a ScrollView (plain result lists); false when `children` scrolls itself (grid). */
  scroll?: boolean;
  children: ReactNode;
}

/**
 * ONE result area for every search tab (Film / Regisseur / Besetzung / Studio):
 * a `flex-1` wrapper that fills the space below the search field down to the
 * screen/keyboard edge and holds exactly one of loading / error / EmptyState /
 * results. EmptyState sits DIRECTLY in this wrapper (never inside a ScrollView
 * content container, where `flex-1` has no definite parent height and collapses
 * to its min height at the top), so it is centered both ways in the free space.
 */
export function SearchResultsArea({
  testID,
  isLoading = false,
  loadingTestID,
  isError = false,
  errorTestID,
  errorMessage,
  isEmpty = false,
  emptyTestID,
  emptyIcon,
  emptyTitle,
  scroll = false,
  children,
}: SearchResultsAreaProps) {
  let content: ReactNode;
  if (isLoading) {
    content = <LoadingArea className="min-h-32 w-full flex-1" testID={loadingTestID} />;
  } else if (isError) {
    content = (
      <Text testID={errorTestID} className="text-danger">
        {errorMessage}
      </Text>
    );
  } else if (isEmpty) {
    content = <EmptyState testID={emptyTestID} icon={emptyIcon} title={emptyTitle} />;
  } else if (scroll) {
    content = (
      <ScrollView
        testID={`${testID}-scroll`}
        className="flex-1"
        contentContainerClassName="flex-grow"
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  } else {
    content = children;
  }
  return (
    <View testID={testID} className="mt-3 flex-1">
      {content}
    </View>
  );
}
