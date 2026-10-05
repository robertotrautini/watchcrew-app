import { useRouter, type Href } from "expo-router";
import { useCallback } from "react";

/**
 * Back action for custom "Zurück"/arrow buttons: pops one level, or, when
 * there is no history (deep link, push-notification cold start), replaces
 * with `fallback` (root route; the auth gate redirects to the home tab).
 */
export function useSafeBack(fallback: Href = "/"): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  }, [router, fallback]);
}
