#!/bin/bash
# Autostart after reboot: open kitty with the WatchCrew Claude session (continue last conversation).
# Usage: boot-watchcrew.sh [--dry-run]   (dry-run prints what would run, launches nothing)

PROJECT_DIR="/home/robin/programming/watchcrew-app"
CLAUDE_BIN="/home/robin/.local/bin/claude"
FLAGS="--dangerously-skip-permissions --remote-control"
DRY_RUN=0
[ "$1" = "--dry-run" ] && DRY_RUN=1

# Duplicate guard: any claude process whose cwd is the project dir?
already_running() {
    local pid
    for pid in $(pgrep -x claude 2>/dev/null); do
        [ "$(readlink "/proc/$pid/cwd" 2>/dev/null)" = "$PROJECT_DIR" ] && return 0
    done
    return 1
}

CMD="cd \"$PROJECT_DIR\" && { ${CLAUDE_BIN} -c ${FLAGS} || ${CLAUDE_BIN} ${FLAGS}; }; exec bash"

HELPER="$(dirname "$(readlink -f "$0")")/boot-device-setup.sh"
mkdir -p "$HOME/logs"

# Background helper: crash capture of previous boot, phone wake/adb reverse, Metro. Non-blocking.
if [ "$DRY_RUN" = 1 ]; then
    echo "[dry-run] would launch in background: $HELPER (log ~/logs/watchcrew-boot.log)"
    bash "$HELPER" --dry-run
else
    nohup bash "$HELPER" >/dev/null 2>&1 < /dev/null &
fi

if already_running; then
    echo "claude already running in $PROJECT_DIR"
    if [ "$DRY_RUN" = 1 ]; then
        echo "[dry-run] would exit without launching"
        echo "[dry-run] would run: kitty bash -i -c '$CMD'"
    fi
    exit 0
fi

if [ "$DRY_RUN" = 1 ]; then
    echo "[dry-run] would run: kitty bash -i -c '$CMD'"
    exit 0
fi

kitty bash -i -c "$CMD"
