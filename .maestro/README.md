# Maestro regression suite

Target: Pixel 6 Pro (`19221FDEE001ZS`), dev-client build, real remote dev Supabase project.

## Prerequisites
- Metro running: `npx expo start --dev-client` (backgrounded, port 8081).
- `export JAVA_HOME=/home/robin/android-setup/jdk-17.0.20.1+1` and `~/.maestro/bin` on PATH.
- Test account (Maestro-only, authorized) already logged in, group "Maestro Test Gruppe", watchlist with Inception / The Dark Knight / Interstellar. Credentials live in `flows/login.yaml`.
- NEVER `clearState: true` (wipes the dev-client Metro pointer). Target by `testID`.
- After a force-stop the dev-client "Development servers" picker shows; `subflows/launch.yaml` taps the first server entry. It also drags the floating dev "Tools" gear bubble away from the Watchlist "+" button.

## Run order
```
maestro --device 19221FDEE001ZS test .maestro/flows/<flow>.yaml
```
1. `login` (skips when already logged in)
2. `create-test-group` (skips when group exists)
3. `onboarding-explore` (only does anything for a group-less account; otherwise asserts Tracker)
4. `tabs-tour` (tabs, settings hub + sub-screen headers, group settings; read-only)
5. `watchlist-open-detail` (read-only)
6. `movie-detail` (searches Inception; adds to watchlist only if not yet on it)

`subflows/` holds shared helpers and is not run standalone.
