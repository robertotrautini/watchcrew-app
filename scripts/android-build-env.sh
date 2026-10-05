#!/usr/bin/env bash
# android-build-env.sh — shell environment for local Android builds
# (`npx expo run:android --device`, `./gradlew ...`) on this machine.
#
# Why this exists: per docs/adr/0009-config-and-secrets.md there are no
# .env files in this repo, and app-level config goes through
# app.config.ts + `extra`. ANDROID_HOME/JAVA_HOME are NOT app config or
# secrets though — they're machine-local build-tooling paths (where the
# Android SDK/JDK happen to live on THIS host), so a plain shell script is
# the right place for them, not app.config.ts and not a checked-in .env.
#
# This is deliberately a script to `source`, not a `~/.bashrc` addition:
# every fresh subagent/CI shell starts without any rc-file customization,
# so anything that needs this environment must source this file itself
# rather than relying on it having been set up ambiently beforehand.
#
# Usage:
#   source scripts/android-build-env.sh
#   npx expo run:android --device
#
# or in one line:
#   source scripts/android-build-env.sh && npx expo run:android --device
#
# Paths below match the partial SDK/JDK setup done for this project under
# /home/robin/android-setup/ — update them if that location ever changes.

export JAVA_HOME="/home/robin/android-setup/jdk-17.0.20.1+1"
export ANDROID_HOME="/home/robin/android-setup/android-sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
# Note: $ANDROID_HOME/platform-tools is appended AFTER $PATH (not prepended)
# on purpose. Its bundled `adb` is x86-64 and does not run on this arm64
# host — the user is installing a native arm64 `adb` via apt instead. Apt
# puts that on /usr/bin, which is already earlier in $PATH, so it correctly
# takes precedence over the broken bundled one without needing platform-
# tools removed from PATH entirely (other platform-tools binaries still
# resolve fine).
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/build-tools/35.0.0:$PATH:$ANDROID_HOME/platform-tools"

echo "android-build-env: JAVA_HOME=$JAVA_HOME"
echo "android-build-env: ANDROID_HOME=$ANDROID_HOME"

if adb_path="$(command -v adb 2>/dev/null)"; then
  if adb version >/dev/null 2>&1; then
    echo "android-build-env: adb OK -> $adb_path"
  else
    echo "android-build-env: adb found at $adb_path but fails to run (likely the bundled x86-64 platform-tools binary on this arm64 host)."
    echo "android-build-env: install a native arm64 adb (e.g. 'sudo apt install adb') and make sure it comes first on PATH before building/deploying to a device."
  fi
else
  echo "android-build-env: no adb on PATH yet — install a native arm64 adb (e.g. 'sudo apt install adb') before running/deploying to a device."
fi
