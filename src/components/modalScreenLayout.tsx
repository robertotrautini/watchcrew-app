import type { ReactElement, ReactNode } from "react";

import { BackSwipeView } from "@/components/BackSwipeView";
import { screenBackdropLayout } from "@/components/ui/ScreenBackdrop";

/**
 * (modals) navigator `screenLayout`: glass backdrop per route plus the
 * Android back swipe (iOS gets the native full-screen swipe via screenOptions).
 */
export function modalScreenLayout({
  route,
  children,
}: {
  route: { name: string };
  children: ReactNode;
}): ReactElement {
  return <BackSwipeView>{screenBackdropLayout({ route, children })}</BackSwipeView>;
}
