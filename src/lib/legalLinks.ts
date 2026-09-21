/**
 * M11 part 2, Job 3 — legal document placeholder plumbing (ADR 0011).
 * iubenda hasn't been set up yet, so `app.config.ts`'s
 * `extra.privacyPolicyUrl`/`extra.termsOfServiceUrl` still hold these exact
 * placeholder strings, not a real iubenda embed URL. This module is the
 * single source of truth for what "still a placeholder" means, so the
 * Settings hub (src/app/(app)/(modals)/settings.tsx) and the Register
 * screen (src/app/(auth)/register.tsx) both treat it identically.
 *
 * These two literals MUST match `app.config.ts`'s `extra.privacyPolicyUrl`/
 * `extra.termsOfServiceUrl` defaults exactly — duplicated rather than
 * imported because `app.config.ts` runs in a plain Node/TS context at build
 * time, outside Metro's `@/`-alias resolution, so importing this module
 * from there isn't a reliable option. A cheap, reversible detail (see
 * docs/interim-decisions.md) — if the two ever drift, `isPlaceholderLegalUrl`
 * below just stops recognizing the (by-then-already-wrong) app.config.ts
 * default as a placeholder, which is easy to notice and fix.
 */
export const PLACEHOLDER_PRIVACY_POLICY_URL = "https://watch-crew.app/privacy";
export const PLACEHOLDER_TERMS_OF_SERVICE_URL = "https://watch-crew.app/terms";

const PLACEHOLDER_URLS = new Set([PLACEHOLDER_PRIVACY_POLICY_URL, PLACEHOLDER_TERMS_OF_SERVICE_URL]);

/**
 * True for an empty/missing URL, or for one of the two known placeholder
 * defaults above — i.e. "no real iubenda URL has been configured yet".
 */
export function isPlaceholderLegalUrl(url: string | null | undefined): boolean {
  if (!url) {
    return true;
  }
  return PLACEHOLDER_URLS.has(url);
}

// --- shared "open a legal link" side effect --------------------------------
// Used by both the Settings hub (src/app/(app)/(modals)/settings.tsx) and
// the Register screen (src/app/(auth)/register.tsx) so the two don't
// duplicate the same placeholder-gate logic.

import * as Linking from "expo-linking";

import { showToast } from "@/lib/toast";

/**
 * Opens `url` in the system browser (per this task's brief: simplest
 * reliable approach, no in-app WebView), or shows a "Wird bald ergänzt"
 * toast instead of a broken link when `url` is still the placeholder
 * default (see `isPlaceholderLegalUrl` above).
 */
export async function openLegalUrl(url: string | null | undefined): Promise<void> {
  if (isPlaceholderLegalUrl(url)) {
    showToast("Wird bald ergänzt");
    return;
  }
  await Linking.openURL(url as string);
}
