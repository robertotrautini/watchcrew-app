import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/ui/AppHeader";
import { EmptyState, type EmptyStateProps } from "@/components/ui/EmptyState";
import { LoadingArea } from "@/components/ui/LoadingArea";
import { Spinner } from "@/components/ui/Spinner";
import { PANEL_LIST_OVERLAP_CLASSNAME } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { getNoResultsMessage } from "@/lib/listFilters";

export interface EntryScreenFrameProps {
  /** testID prefix of the tab: `${prefix}-screen`, `-loading`, `-error`, `-empty`, ... */
  testIDPrefix: string;
  title: string;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  /** Scope switch + filter panel, rendered below the header. */
  panel: ReactNode;
  providersLoading: boolean;
  /** What the body shows once loaded: the list, the empty tab or "no filter hits". */
  body: "list" | "empty" | "no-results";
  emptyIcon: EmptyStateProps["icon"];
  emptyTitle: string;
  searchQuery: string;
  /** Filter flyout, rendered at the screen root. */
  flyout: ReactNode;
  /** The entry list (rendered in the panel-overlap container). */
  children: ReactNode;
}

/**
 * Screen frame shared by the Tagebuch and Watchlist tabs: top-inset
 * SafeAreaView, header, and the loading / error / providers-loading / empty /
 * no-results / list states. `headerShown: false` tab screens take the top inset
 * only (bottom is the Tabs navigator's job, docs/interim-decisions.md "M11 —
 * Safe-Area").
 */
export function EntryScreenFrame({
  testIDPrefix,
  title,
  isLoading,
  isError,
  errorMessage,
  panel,
  providersLoading,
  body,
  emptyIcon,
  emptyTitle,
  searchQuery,
  flyout,
  children,
}: EntryScreenFrameProps) {
  const screenTestID = `${testIDPrefix}-screen`;
  const header = (
    <AppHeader title={title} settingsTestID={`${testIDPrefix}-settings-button`} />
  );

  if (isLoading) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1" testID={screenTestID}>
        {header}
        <LoadingArea testID={`${testIDPrefix}-loading`} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1 items-center justify-center px-4"
        testID={screenTestID}
      >
        <Text
          testID={`${testIDPrefix}-error`}
          className="text-center text-danger"
        >
          {errorMessage}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1" testID={screenTestID}>
      {header}
      {panel}

      {providersLoading ? (
        <View
          className="flex-1 items-center justify-center px-8"
          testID={`${testIDPrefix}-providers-loading`}
        >
          <Spinner />
          <Text className="mt-2 text-text-secondary">
            Streaming-Daten werden geladen…
          </Text>
        </View>
      ) : body === "no-results" ? (
        <EmptyState
          testID={`${testIDPrefix}-no-results`}
          icon="filter"
          title={getNoResultsMessage(searchQuery)}
        />
      ) : body === "empty" ? (
        <EmptyState
          testID={`${testIDPrefix}-empty`}
          icon={emptyIcon}
          title={emptyTitle}
        />
      ) : (
        <View className={PANEL_LIST_OVERLAP_CLASSNAME + " flex-1"}>
          {children}
        </View>
      )}

      {flyout}
    </SafeAreaView>
  );
}
