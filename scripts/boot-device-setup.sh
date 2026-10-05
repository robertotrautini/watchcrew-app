#!/bin/bash
# Background helper launched by boot-watchcrew.sh. Never blocks the Claude session.
#  1. crash capture of the PREVIOUS boot  2. phone (adb) wake + reverse  3. Metro on :8081
# Usage: boot-device-setup.sh [--dry-run]
# Env:   WATCHCREW_BOOT_METRO=0 disables Metro autostart (default 1)
#        WATCHCREW_PHONE_WAIT=180 seconds to wait for the phone (default 180)

PROJECT_DIR="/home/robin/programming/watchcrew-app"
SERIAL="19221FDEE001ZS"
LOG_DIR="$HOME/logs"
LOG="$LOG_DIR/watchcrew-boot.log"
CRASH_DIR="$LOG_DIR/crash-reports"
LAST_CRASH="$LOG_DIR/LAST_CRASH.txt"
METRO_LOG="$LOG_DIR/metro.log"
BOOT_METRO="${WATCHCREW_BOOT_METRO:-1}"
PHONE_WAIT="${WATCHCREW_PHONE_WAIT:-180}"
DRY_RUN=0
[ "$1" = "--dry-run" ] && DRY_RUN=1

log() { echo "$(date '+%F %T') [boot-device-setup] $*" | { [ "$DRY_RUN" = 1 ] && cat || tee -a "$LOG"; }; }

if [ "$DRY_RUN" = 1 ]; then
    echo "[dry-run] would create $LOG_DIR and $CRASH_DIR, log to $LOG"
    echo "[dry-run] would write crash report of previous boot to $CRASH_DIR/<timestamp>.txt and pointer $LAST_CRASH"
    echo "[dry-run] would: adb start-server; wait up to ${PHONE_WAIT}s for $SERIAL; KEYCODE_WAKEUP; adb reverse tcp:8081 tcp:8081"
    echo "[dry-run] if absent: adb kill-server/start-server + reconnect once (no uhubctl/xhci rebind: no safe auto method), log 'replug needed'"
    echo "[dry-run] Metro autostart (WATCHCREW_BOOT_METRO=$BOOT_METRO): $([ "$BOOT_METRO" = 1 ] && echo "npx expo start --dev-client --port 8081 in $PROJECT_DIR -> $METRO_LOG (only if :8081 not served)" || echo disabled)"
    echo "[dry-run] current crash analysis preview:"
fi

mkdir -p "$CRASH_DIR" 2>/dev/null

# ---------- 1. crash capture ----------
crash_capture() {
    local ts out status summary prev_ok=0
    ts=$(date '+%Y%m%d-%H%M%S')
    out="$CRASH_DIR/$ts.txt"
    [ "$DRY_RUN" = 1 ] && out=$(mktemp)
    [ "$(journalctl --list-boots --no-pager 2>/dev/null | grep -cE '^ *-?[0-9]+ ')" -ge 2 ] && prev_ok=1
    {
        echo "== Crash report of PREVIOUS boot, generated $(date '+%F %T'); current boot since $(uptime -s) =="
        if [ "$prev_ok" = 1 ]; then
            echo "-- previous boot range:"; journalctl --list-boots --no-pager 2>&1 | tail -3
            echo; echo "-- last 300 journal lines (b-1)"; journalctl -b -1 -n 300 --no-pager 2>&1
            echo; echo "-- warnings..alerts (b-1, last 100)"; journalctl -b -1 -p warning..alert --no-pager 2>&1 | tail -100
            echo; echo "-- kernel (b-1, last 150)"; journalctl -k -b -1 --no-pager 2>&1 | tail -150
        else
            echo "!! No previous boot in journal (journal not persistent yet, or first boot after enabling)."
        fi
        echo; echo "-- last reboot/shutdown records"
        if command -v last >/dev/null; then last -x -n 10; elif command -v wtmpdb >/dev/null; then wtmpdb last -n 10; else echo "(no last/wtmpdb installed)"; fi
        echo; echo "-- power / reset evidence (current boot)"
        echo "get_throttled: $(vcgencmd get_throttled 2>&1)"
        echo "bootloader rsts (hex): $(od -An -tx1 /proc/device-tree/chosen/bootloader/rsts 2>&1)"
        echo "power_reset (hex): $(od -An -tx1 /proc/device-tree/chosen/power/power_reset 2>&1)"
        echo "EXT5V_V: $(vcgencmd pmic_read_adc EXT5V_V 2>&1)"
    } > "$out" 2>&1

    if [ "$prev_ok" = 1 ]; then
        if journalctl -b -1 -n 80 --no-pager 2>/dev/null | grep -qiE 'Reached target.*(Shutdown|Power-Off|Reboot)|Journal stopped|systemd-shutdown|Shutting down|Stopped target'; then
            status="CLEAN shutdown markers found (software/user-initiated reboot likely)"
        else
            status="NO shutdown markers at end of previous boot -> HARD reset / power loss / kernel hang likely"
        fi
    else
        status="UNKNOWN (no previous-boot journal)"
    fi
    summary="$(date '+%F %T') boot since $(uptime -s): previous boot $status; report: $out"
    if [ "$DRY_RUN" = 1 ]; then
        echo "[dry-run] summary: $summary"; rm -f "$out"
    else
        echo "$summary" > "$LAST_CRASH"
        log "$summary"
    fi
}

crash_capture

if [ "$DRY_RUN" = 1 ]; then
    echo "[dry-run] adb present: $(command -v adb || echo NO); port 8081 served: $(ss -ltn 2>/dev/null | grep -q ':8081 ' && echo yes || echo no)"
    exit 0
fi

# ---------- 2. phone ----------
phone_present() { adb devices 2>/dev/null | grep -q "^$SERIAL[[:space:]]*device"; }

# brief wait for time sync / network (max 30s)
for _ in $(seq 1 15); do
    [ "$(timedatectl show -p NTPSynchronized --value 2>/dev/null)" = yes ] && break
    sleep 2
done

adb start-server >>"$LOG" 2>&1
log "adb server started; waiting up to ${PHONE_WAIT}s for $SERIAL"
timeout "$PHONE_WAIT" adb -s "$SERIAL" wait-for-device >/dev/null 2>&1

if ! phone_present; then
    log "phone not found; USB devices: $(lsusb | grep -vc 'root hub') non-hub device(s). Trying adb server restart + reconnect once"
    adb kill-server >/dev/null 2>&1; adb start-server >>"$LOG" 2>&1
    adb reconnect >/dev/null 2>&1; adb reconnect offline >/dev/null 2>&1
    timeout 30 adb -s "$SERIAL" wait-for-device >/dev/null 2>&1
fi

if phone_present; then
    adb -s "$SERIAL" shell input keyevent KEYCODE_WAKEUP >>"$LOG" 2>&1
    adb -s "$SERIAL" reverse tcp:8081 tcp:8081 >>"$LOG" 2>&1 && log "phone OK: woken, adb reverse 8081 set"
else
    log "PHONE NOT AVAILABLE: not enumerated on USB (physical: replug cable / other port / check phone charge-only mode). Software cannot fix this."
    adb devices -l >>"$LOG" 2>&1
fi

# ---------- 3. Metro ----------
if [ "$BOOT_METRO" = 1 ]; then
    if ss -ltn 2>/dev/null | grep -q ':8081 '; then
        log "Metro: :8081 already served, skipping"
    else
        cd "$PROJECT_DIR" && nohup npx expo start --dev-client --port 8081 >>"$METRO_LOG" 2>&1 < /dev/null &
        log "Metro started in background (log: $METRO_LOG)"
    fi
else
    log "Metro autostart disabled (WATCHCREW_BOOT_METRO=0)"
fi
