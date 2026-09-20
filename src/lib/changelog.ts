// M10 Settings hub — Changelog viewer
// (src/app/(app)/(modals)/settings/changelog.tsx).
//
// Per docs/interim-decisions.md ("M10 — Settings hub"): the new app's
// changelog starts fresh at v1.0.0 — the legacy app's ~130 changelog entries
// are NOT ported/migrated. This starter array only covers WatchCrew's own
// early milestones, kept brief and true to what has actually been built so
// far (M0-M9).

export interface ChangelogEntry {
  /** Plain semver-ish string, compared for equality (not parsed/ordered) against `CURRENT_CHANGELOG_VERSION`. */
  version: string;
  /** ISO date (YYYY-MM-DD) this version was released. */
  date: string;
  title: string;
  description: string;
}

/**
 * Compared against `usePreferencesStore`'s `lastSeenChangelogVersion` to
 * decide whether to surface a "Neue Funktionen verfügbar" hint. Bump this
 * (and add a new entry to `CHANGELOG_ENTRIES`) on every future release that
 * should re-surface that hint.
 */
export const CURRENT_CHANGELOG_VERSION = "1.0.0";

/** Newest first — the Changelog screen renders this array in order, unsorted. */
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "2026-09-20",
    title: "Erste Version von WatchCrew",
    description:
      "Watchlist, Tagebuch und Bezahl-Tracker für deine Watch-Gruppe, gemeinsame Gruppenverwaltung mit Einladungslink und die neuen Konto-Einstellungen.",
  },
];
