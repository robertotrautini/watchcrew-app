# Maestro regression suite

Target: Pixel 6 Pro (`19221FDEE001ZS`), dev-client build, real remote dev Supabase project.

## Prerequisites
- Metro running: `npx expo start --dev-client` (backgrounded, port 8081).
- `export JAVA_HOME=/home/robin/android-setup/jdk-17.0.20.1+1` and `~/.maestro/bin` on PATH.
- Test account (Maestro-only, authorized) already logged in, group "Maestro Test Gruppe". Seed state: Tagebuch has Inception + The Dark Knight (rated), Watchlist holds at least the user-added upcoming "Hokum" (keep it) and possibly the UNRATED Interstellar; flows never assume a specific entry - the app default sort is "Hinzugefügt" (added, no streaming filter) and flows set it explicitly via `subflows/watchlist-normalize.yaml` instead of trusting persisted state (sort "Meine Streaming-Dienste" + Flatrate chip hides films without a flatrate offer and can leave the list empty), Tracker may hold user-made entries (e.g. Interstellar) - flows ignore them. If a rating-cycle run aborts midway, The Matrix stays on Watchlist/Tagebuch (and maybe Tracker): remove it by hand via the app UI before re-running (the guard fails otherwise). Credentials live in `flows/login.yaml`.
- NEVER `clearState: true` (wipes the dev-client Metro pointer). Target by `testID`.
- After a force-stop the dev-client "Development servers" picker shows; `subflows/launch.yaml` taps the first server entry. It also drags the floating dev "Tools" gear bubble away from the Watchlist "+" button.

## Verification workflow (standing rule)
After EVERY app change: `npx tsc --noEmit` + `npx jest`, then `scripts/maestro-all.sh --changed` on the Pixel 6 Pro (runs only the flows of the affected use-case areas, see `docs/maestro-areas.md`) -> inspect the screenshots -> send exactly those screenshots to the user (SendUserFile) + short summary. Run the FULL suite (`scripts/maestro-all.sh`, no flag) for cross-cutting/shared-component changes (`--changed` does that automatically for files listed under `full`; shared UI changes also warrant it manually), when the user asks, and before milestones. Keep `docs/maestro-coverage.md` and `.maestro/areas.json` updated when adding/changing screens or functions; flows (with named screenshots) for new features are part of the feature (definition of done).

```
scripts/maestro-all.sh                      # ALL flows (default, no flag)
scripts/maestro-all.sh --changed            # areas derived from git (read-only) -> only their flows
scripts/maestro-all.sh --area tracker,rating  # explicit areas
scripts/maestro-all.sh --smoke              # login, tabs-tour, add-movie path, one write cycle
scripts/maestro-all.sh --list-areas         # areas -> flows
scripts/maestro-all.sh tracker-payment ...  # explicit flows (while developing a flow only)
```
Output: `maestro-run-<timestamp>/` (default under the session scratchpad, override with `MAESTRO_OUT_ROOT`) with `NN-<flow>--<shot>.png`, `logs/<flow>.log`, `summary.txt`. Preflight checks device, Metro (`:8081`) and `adb reverse`. The runner sets the 3 system animation scales to 0 for the run and restores the original values on exit (trap).

## Speed rules (Maestro/UiAutomator on this device: hierarchy fetch ~2 s, screenshot ~1.4 s, id-tap ~4 s)
- Never `waitForAnimationToEnd` (= 2 screenshots, ~3 s even on a static screen). Wait for the concrete target state: `assertVisible` / `assertNotVisible` / `extendedWaitUntil` on a testID.
- Start flows with `runFlow: ../subflows/ensure-app.yaml` (no relaunch when the tab bar is showing). Cold start (`subflows/launch.yaml`) only where the launch itself matters (login, deeplinks, auth).
- Switch tabs with `runFlow: ../subflows/go-<tab>.yaml` (point tap + screen-testID assert), not `tapOn: "Tab"`.
- `waitToSettleTimeoutMs` / `retryTapIfNoChange` were measured: no effect on id taps in Maestro 2.10.0 here.

## Flow rules
- Restore state at the end of every flow: name Robin, group "Maestro Test Gruppe", theme Gold, Netflix off, Watchlist sort "Hinzugefügt" (app default) + grid + panel closed (use `subflows/watchlist-normalize.yaml`), Tagebuch "Mein Tagebuch" + cards + panel closed, Tracker: no flow-owned rows left (user-made rows stay).
- Never delete pre-existing data. Real write cycles only with data the flow creates itself (Inception payment, Matrix watchlist entry/rating) and are undone in the same flow. Destructive dialogs (delete account, leave group, delete entry/payment) are screenshotted and cancelled.
- **Destructive steps must be self-owned.** A flow may delete/reset/overwrite only data it created itself in the same run. Checklist: (1) no "first row"/`index: 0` taps before a delete/reset - target by visible film title (or an id containing the id the flow created); (2) precondition guard first: `assertNotVisible` the flow's film/title before creating it, so a hit means "not ours" -> fail loudly, delete nothing (no "resume at removal" idempotence); (3) before the confirm tap assert the sheet/detail shows the intended title (`assertVisible` text + `index: 1` when row and sheet title both match); (4) if the target is not found the step fails - never fall back to another row; (5) never assume "Tracker empty": the user's phone adds real entries to the shared Dev group; (6) settings overwrites (display name, group name) assert the baseline value first. Flow-owned film: The Matrix (tmdb 603) - used by `watchlist-add-remove` and `rating-cycle`. Pre-existing user films (Interstellar, Inception, Hokum, hand-made tracker entries) are never rated/reset/deleted.
- Name every screen state with `takeScreenshot: NN-<description>`; the runner prefixes the flow name.
- Photo-heavy screens (poster grids, filmographies): Maestro's `takeScreenshot` fails there (PNG > 4 MB gRPC limit). Use `runFlow: file: ../subflows/shot.yaml, env: NAME: <name>` (adb screencap via `scripts/maestro-shot-server.py`, started by the runner; for ad-hoc `maestro test` runs start it yourself: `python3 scripts/maestro-shot-server.py 19221FDEE001ZS <dir-file>`).
- Area map: `.maestro/areas.json` (new flow = add it there + to `FLOWS` in `scripts/maestro-all.sh`).
- Credentials exist only in `flows/login.yaml`; other flows `runFlow: login.yaml`.

## Run order (as executed by scripts/maestro-all.sh)
1. `login`
2. `create-test-group`
3. `onboarding-explore`
4. `tabs-tour`
5. `watchlist-open-detail`
6. `movie-detail`
7. `tracker-payment`
8. `watchlist-filter-sort`
9. `tagebuch-filter-sort`
10. `movie-detail-full`
10a. `back-navigation` (Rueck-Wisch-Geste/Hardware-Back: Detail -> Aehnliche -> Detail, Einstellungen -> Darstellung, Sheet schliesst zuerst; Wisch per `swipe` ab 1% Breite)
11. `movie-collection`
12. `add-movie-modes`
13. `watchlist-add-remove`
14. `rating-cycle`
15. `settings-edit`
16. `toasts`
17. `group-settings-edit`
18. `theme-tour` (Rot-Tour, Blau-Stichprobe, Gold per `onFlowComplete` -> `subflows/restore-theme-gold.yaml`; manuell: Tracker -> Zahnrad -> Gruppen-Einstellungen -> Gold)
19. `deeplinks`
20. `offline-banner`
21. `auth-screens`

`subflows/` holds shared helpers (`launch`, `ensure-app`, `go-tracker|watchlist|tagebuch`, `shot`) and is not run standalone. Per-flow coverage: `docs/maestro-coverage.md`.
