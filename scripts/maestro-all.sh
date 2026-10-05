#!/usr/bin/env bash
# Run the COMPLETE Maestro suite on the Pixel 6 Pro and collect every
# screenshot into one ordered output directory.
#
#   scripts/maestro-all.sh                 # all flows (default, no flag)
#   scripts/maestro-all.sh --area tracker[,rating]   # only the flows of those use-case areas
#   scripts/maestro-all.sh --changed [--base REF]    # areas derived from git (read-only) vs .maestro/areas.json
#   scripts/maestro-all.sh --smoke         # login, tabs-tour, one add-movie path, one write cycle
#   scripts/maestro-all.sh --list-areas    # areas -> flows
#   scripts/maestro-all.sh tracker-payment settings-edit   # explicit flow subset (still ordered)
# Area map: .maestro/areas.json (docs/maestro-areas.md). System animations are
# switched off for the run and restored on exit (trap).
#
# Env overrides: MAESTRO_DEVICE, MAESTRO_OUT_ROOT, JAVA_HOME.
# Output: $MAESTRO_OUT_ROOT/maestro-run-<timestamp>/
#   NN-<flow>--<shot>.png  every takeScreenshot, ordered by flow then step
#   FAILED-<flow>--*.png   Maestro's failure screenshot(s), if a flow failed
#   logs/<flow>.log        full Maestro output per flow
#   summary.txt            pass/fail per flow + screenshot count
# Exit code: 0 = all flows passed, 1 = at least one failed, 2 = setup problem.
set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FLOW_DIR="$REPO_ROOT/.maestro/flows"
DEVICE="${MAESTRO_DEVICE:-19221FDEE001ZS}"
OUT_ROOT="${MAESTRO_OUT_ROOT:-/tmp/claude-1000/-home-robin-programming-watchcrew-app/a87a2f8a-6bf8-4c42-874c-8e68738fd72c/scratchpad}"
export JAVA_HOME="${JAVA_HOME:-/home/robin/android-setup/jdk-17.0.20.1+1}"
export PATH="$PATH:$HOME/.maestro/bin"

# Defined order. login/create-test-group first (state), auth-screens LAST
# (it signs out and back in). Every flow restores the state it changes.
FLOWS=(
  login
  create-test-group
  onboarding-explore
  tabs-tour
  watchlist-open-detail
  movie-detail
  tracker-payment
  watchlist-filter-sort
  tagebuch-filter-sort
  movie-detail-full
  back-navigation
  movie-collection
  add-movie-modes
  watchlist-add-remove
  rating-cycle
  settings-edit
  toasts
  group-settings-edit
  theme-tour
  deeplinks
  offline-banner
  auth-screens
)

AREAS_PY="$REPO_ROOT/scripts/maestro-areas.py"
MODE="full"; WANT=()
BASE_REF="HEAD"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --list-areas) python3 "$AREAS_PY" list; exit 0 ;;
    --area) shift; [ "$#" -gt 0 ] || { echo "--area needs a name"; exit 2; }
            MODE="area:$1"
            while IFS= read -r f; do WANT+=("$f"); done < <(python3 "$AREAS_PY" flows "$1") || exit 2
            [ "${#WANT[@]}" -gt 0 ] || exit 2 ;;
    --smoke) MODE="smoke"
             while IFS= read -r f; do WANT+=("$f"); done < <(python3 "$AREAS_PY" smoke) ;;
    --base) shift; BASE_REF="$1" ;;
    --changed) MODE="changed" ;;
    -h|--help) sed -n 2,22p "${BASH_SOURCE[0]}"; exit 0 ;;
    -*) echo "Unknown flag $1 (see --help)"; exit 2 ;;
    *) [ "$MODE" = "full" ] && MODE="flows"; WANT+=("$1") ;;
  esac
  shift
done

if [ "$MODE" = "changed" ]; then
  AREAS_FOUND=(); FULL=0; UNMAPPED=()
  while read -r kind val; do
    case "$kind" in
      FULL) FULL=1 ;;
      AREA) AREAS_FOUND+=("$val"); while IFS= read -r f; do WANT+=("$f"); done < <(python3 "$AREAS_PY" flows "$val") ;;
      FLOW) WANT+=("$val") ;;
      UNMAPPED) UNMAPPED+=("$val") ;;
    esac
  done < <(python3 "$AREAS_PY" changed --base "$BASE_REF")
  if [ "$FULL" -eq 1 ]; then
    echo "--changed: cross-cutting file changed -> FULL suite"; WANT=(); MODE="full"
  else
    if [ "${#UNMAPPED[@]}" -gt 0 ]; then
      echo "--changed: unmapped files (add to .maestro/areas.json) -> adding smoke: ${UNMAPPED[*]}"
      while IFS= read -r f; do WANT+=("$f"); done < <(python3 "$AREAS_PY" smoke)
    fi
    if [ "${#WANT[@]}" -eq 0 ]; then echo "--changed: no app-relevant changes -> no flows to run (tsc+jest only)"; exit 0; fi
    echo "--changed: areas: ${AREAS_FOUND[*]:-none}"
  fi
fi

if [ "${#WANT[@]}" -gt 0 ]; then
  SELECTED=()
  for f in "${FLOWS[@]}"; do
    for want in "${WANT[@]}"; do [ "$f" = "$want" ] && { SELECTED+=("$f"); break; }; done
  done
  [ "${#SELECTED[@]}" -eq 0 ] && { echo "No matching flows. Known: ${FLOWS[*]}"; exit 2; }
  FLOWS=("${SELECTED[@]}")
fi

# --- preflight ---
command -v adb >/dev/null || { echo "adb not found"; exit 2; }
command -v maestro >/dev/null || { echo "maestro not found in PATH (~/.maestro/bin)"; exit 2; }
if ! adb devices | grep -q "^$DEVICE[[:space:]]*device"; then
  echo "Device $DEVICE not connected/authorized (adb devices):"; adb devices; exit 2
fi
if ! curl -s --max-time 5 http://localhost:8081/status | grep -q "packager-status:running"; then
  echo "Metro not running on :8081. Start it: (cd $REPO_ROOT && npx expo start --dev-client &)"; exit 2
fi
adb -s "$DEVICE" reverse tcp:8081 tcp:8081 >/dev/null || { echo "adb reverse failed"; exit 2; }

# --- system animations off for the run, restored on exit (also on Ctrl-C/failure) ---
ANIM_KEYS=(window_animation_scale transition_animation_scale animator_duration_scale)
declare -A ANIM_ORIG
for k in "${ANIM_KEYS[@]}"; do
  ANIM_ORIG[$k]="$(adb -s "$DEVICE" shell settings get global "$k" | tr -d '\r')"
done
restore_animations() {
  for k in "${ANIM_KEYS[@]}"; do
    v="${ANIM_ORIG[$k]:-}"
    if [ -z "$v" ] || [ "$v" = "null" ]; then adb -s "$DEVICE" shell settings delete global "$k" >/dev/null 2>&1
    else adb -s "$DEVICE" shell settings put global "$k" "$v" >/dev/null 2>&1; fi
  done
}
trap 'restore_animations; kill "${SHOT_PID:-0}" 2>/dev/null' EXIT
trap 'exit 130' INT TERM
for k in "${ANIM_KEYS[@]}"; do adb -s "$DEVICE" shell settings put global "$k" 0; done

TS="$(date +%Y%m%d-%H%M%S)"
OUT="$OUT_ROOT/maestro-run-$TS"
mkdir -p "$OUT/logs" "$OUT/raw"
SUMMARY="$OUT/summary.txt"
echo "Maestro run $TS on $DEVICE (mode: $MODE, ${#FLOWS[@]} flows)" | tee "$SUMMARY"

# Screenshot helper for poster-heavy screens (Maestro's takeScreenshot hits
# the 4 MB gRPC limit there). Flows reach it through .maestro/subflows/shot.yaml.
DIR_FILE="$OUT/.current-shot-dir"
echo "$OUT" > "$DIR_FILE"
python3 "$REPO_ROOT/scripts/maestro-shot-server.py" "$DEVICE" "$DIR_FILE" 8765 &
SHOT_PID=$!
sleep 1

IDX=0; FAILED=0; TOTAL_SHOTS=0
for flow in "${FLOWS[@]}"; do
  IDX=$((IDX + 1)); NN=$(printf '%02d' "$IDX")
  RAW="$OUT/raw/$flow"; mkdir -p "$RAW/takeScreenshot"
  echo "$RAW/takeScreenshot" > "$DIR_FILE"
  START=$(date +%s)
  ( cd "$RAW" && maestro --device "$DEVICE" test \
      --debug-output="$RAW" --flatten-debug-output \
      "$FLOW_DIR/$flow.yaml" ) >"$OUT/logs/$flow.log" 2>&1
  RC=$?
  DUR=$(( $(date +%s) - START ))

  N=0
  while IFS= read -r png; do
    base="$(basename "$png" .png)"
    dest="$OUT/$NN-$flow--$base.png"
    [ -e "$dest" ] && dest="$OUT/$NN-$flow--$base-$N.png"
    cp "$png" "$dest"; N=$((N + 1))
  done < <(find "$RAW" -path '*takeScreenshot*' -name '*.png' -printf '%f\t%p\n' | sort | cut -f2-)
  if [ "$RC" -ne 0 ]; then
    while IFS= read -r png; do
      cp "$png" "$OUT/FAILED-$NN-$flow--$(basename "$png")"
    done < <(find "$RAW" -path '*screenshots*' -name '*.png' | sort)
  fi
  TOTAL_SHOTS=$((TOTAL_SHOTS + N))

  if [ "$RC" -eq 0 ]; then
    echo "PASS  $NN $flow  (${DUR}s, $N screenshots)" | tee -a "$SUMMARY"
  else
    FAILED=$((FAILED + 1))
    echo "FAIL  $NN $flow  (${DUR}s, $N screenshots) -> $OUT/logs/$flow.log" | tee -a "$SUMMARY"
  fi
done

echo "----" | tee -a "$SUMMARY"
echo "${#FLOWS[@]} flows, $FAILED failed, $TOTAL_SHOTS screenshots" | tee -a "$SUMMARY"
echo "Output dir: $OUT" | tee -a "$SUMMARY"
[ "$FAILED" -eq 0 ]
