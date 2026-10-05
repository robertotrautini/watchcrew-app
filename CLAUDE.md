## Project: WatchCrew

WatchCrew is a cross-platform mobile app (Android + iOS) for tracking movies with your watch group — successor to "Filmkritiker Trautmanns" (the old repo `filmkritiker`). The old repo stays fully intact and running in parallel, untouched, as the live legacy app until the migration to WatchCrew is fully verified. **Never touch the old production database.**

---

## THE HARD RULE (read this before doing anything)

**Zero autonomous/implicit decisions.** Every tooling choice, design choice, or implementation detail that is not already documented in `docs/adr/` must be explicitly surfaced to the user and confirmed by them first — before it is implemented. This applies even to choices that would normally be an "obvious senior-dev default" (a library pick, a naming convention, a config value). Do not silently pick a sensible default and proceed. If a decision point comes up mid-implementation that isn't pre-defined in `docs/adr/`, stop and ask — don't decide and continue.

The one narrow, explicitly granted exception: producing English translations of German UI copy directly during implementation (see `docs/adr/0007-client-tech-stack.md`) — everything else follows the rule above without exception.

---

## Tech stack (quick reference — see `docs/adr/` for full reasoning)

- **App framework:** React Native + Expo (Managed Workflow) + TypeScript, EAS Build for cloud builds — see `docs/adr/0001-react-native-expo.md`
- **Backend:** Supabase (Postgres + Auth + Realtime + Edge Functions + pg_cron) — no traditional always-on server — see `docs/adr/0002-supabase-backend.md`
- **Data model:** Watch-Group is the only shareable unit (no separate "Project" layer) — see `docs/adr/0003-watch-group-data-model.md`
- **Auth:** Individual Supabase Auth accounts, email + password for v1 — see `docs/adr/0004-auth-and-account-lifecycle.md`
- **Testing:** TDD (red-green-refactor); Jest + `jest-expo` + React Native Testing Library for unit/component tests; Maestro for E2E — see `docs/adr/0008-testing-strategy.md`
- **Styling/UI:** NativeWind + React Native Reusables (shadcn/ui-style, copied-in source components) — see `docs/adr/0007-client-tech-stack.md`
- **State:** TanStack Query (server state) + Zustand (client/UI state) — see `docs/adr/0007-client-tech-stack.md`
- **Local persistence:** MMKV (preferences) + Expo SecureStore (auth/session token) — see `docs/adr/0007-client-tech-stack.md`
- **Navigation:** Expo Router (file-based, automatic deep-linking for push targets) — see `docs/adr/0007-client-tech-stack.md`
- **Config/secrets:** No `.env` files — `app.config.ts` + Expo `extra` + `expo-constants` for non-secret dev config; real secrets live only in Supabase Edge Function Secrets / GitHub Actions Secrets / EAS Secrets — see `docs/adr/0009-config-and-secrets.md`

For anything not covered above, check `docs/adr/` before assuming a default — and if it's genuinely not documented there, that's exactly the case the hard rule above exists for.

---

## Renamed project — reminder

This project was renamed from working names `filmkritiker-dev`/`filmkritiker-app` to **WatchCrew** / repo `watchcrew-app`. The Supabase projects (`watchcrew-dev`/`watchcrew-prod`) and the Sentry project should likewise have been renamed by the user to match — if you notice references still using the old `filmkritiker-*` naming for Supabase or Sentry projects, that's worth flagging, not silently assuming is current.

---

## Database migration from the legacy app

Migration from the old IONOS/MySQL database happens **exclusively read-only** — never a write or delete against the production database. Same hard rule as in the old `filmkritiker` project. See `docs/adr/0013-migration-from-legacy-app.md` for the (currently high-level) migration ground rules; full migration details are planned later, closer to that phase.

---

## Where to look

- `docs/planning-report.html` — visual architecture overview, design tokens, milestone roadmap (M0–M12)
- `docs/adr/` — architecture decision records, the authoritative source for "has this already been decided"
- `docs/feature-inventory.md` — functional spec of the legacy app's screens/API/business rules (architecture parts of that document are outdated — see its header note; `docs/adr/` is authoritative for architecture)

---

## Working process (read at session start)

Read `docs/working-process.md` at the start of every session: it is the single source of truth for HOW we work (delegation, TDD, verification, Maestro speed rules, git and Supabase rules). Any change to the working process must be written to `docs/working-process.md` (and to memory) immediately and kept up to date.

## Verification workflow (standing rule)

User-set standing rule: after every app change, verify on the real device and show the result.

1. `npx tsc --noEmit` and `npx jest` (green).
2. `scripts/maestro-all.sh --changed` on the Pixel 6 Pro (`19221FDEE001ZS`, Metro on :8081, dev-client). It derives the affected use-case areas from the git changes (`.maestro/areas.json`, `docs/maestro-areas.md`) and runs only their flows; exits non-zero on failure. Explicit: `--area <name>[,<name>]`, `--smoke`, `--list-areas`. Full setup/gotchas: `.maestro/README.md`.
3. Run the **full suite** (`scripts/maestro-all.sh`, no flag) for cross-cutting/shared-component changes (`src/components/ui/**`, theme, layout, providers; `--changed` escalates automatically for files listed under `full`), when the user asks, and before milestones.
4. Inspect the screenshots yourself; fix anything broken or visually wrong before reporting.
5. Send the screenshots of the flows that ran to the user in chat (SendUserFile; ALL of them for a full run) plus a short summary (flows pass/fail, what changed, anything not automatable).
6. Keep `docs/maestro-coverage.md` and `.maestro/areas.json` current whenever a screen or function is added/changed. Flows (with named screenshots) for new features are part of the feature: **definition of done**.

Flow rules: flows must restore test state (name Robin, group "Maestro Test Gruppe", theme Gold, Netflix off, Watchlist sort "Meine Streaming-Dienste" + grid + panel closed, Tagebuch "Mein Tagebuch" + cards + panel closed, Tracker empty); never delete pre-existing data; destructive dialogs are screenshotted and cancelled; target by `testID` (add missing testIDs with tests, no visual change); never `clearState`.

## Push notification on finish (standing rule)

User-set standing rule 2026-10-05: at the end of EVERY finished task/turn (not only when a decision is needed) call the PushNotification tool (status "proactive") so the phone gets a push via Remote Control. Message < 200 chars, German, lead with result (e.g. "R4+R3 fertig, tsc/jest grün" or "Lauf fehlgeschlagen: ..."). `agentPushNotifEnabled`/`inputNeededNotifEnabled` in settings.json are already true, but the harness only pushes when Claude decides, so Claude must trigger it itself. A "not sent, terminal active" result is fine, don't retry. Details: `docs/working-process.md` item 6; memory `push_on_every_finish`.
