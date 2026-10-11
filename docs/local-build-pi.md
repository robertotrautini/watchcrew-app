# Local Android build on Pi 5 (memory-safe attempt)

Date: 2026-10-07. Hardware: Pi 5, 8 GB RAM, 2 GB swap, SD card. Command: `~/logs/run-local-build.sh` (eas build --local, preview, APK). Build log: `~/logs/local-build-20261007-120109.log`. Health log: `~/logs/local-build-health.log`.

## Outcome

FAILED at 12:50:28 (not memory, not thermal, no abort): `:react-native-reanimated:buildCMakeRelWithDebInfo[arm64-v8a]` after 19 of 108 C++ files:

```
clang++: symbol lookup error: .../ndk/27.1.12297006/toolchains/llvm/prebuilt/linux-x86_64/bin/clang++: undefined symbol: strchr, version GLIBC_2.2.5
ninja: build stopped: subcommand failed.
```

The x86-64 NDK clang runs under qemu-user with the x86 glibc in `/home/robin/android-setup/x86root`. 19 files compiled fine before, so this looks like an intermittent qemu/x86root glibc lookup failure, not fixed by any approved setting. No retry done (needs user decision). No APK produced.

Memory fix worked: previously worklets CMake thrashed RAM+swap and froze the Pi; now worklets and nitro-modules built through with MemAvailable never below ~2 GB.

## Timing (wall clock)

| Phase | Time |
|---|---|
| Start (eas-cli) | 12:01:09 |
| Project archive, fingerprint, npm install, prebuild | ~12:01 - 12:05 |
| Eager JS bundle (Metro, 2593 modules) | 79.8 s |
| Gradle start | ~12:05:11 |
| nitro-modules CMake | approx. 12:11 - 12:2x (done before 12:30) |
| worklets CMake | approx. 12:2x - 12:45 (slowest, ~15-20 min, single job under qemu) |
| reanimated CMake | ~12:46 - 12:50:28 (FAILED) |
| Gradle total until failure | 46m 6s |
| Total wall clock | ~49.5 min (end ~12:51) |

Per-task times are approximate (polling at 10 min intervals; the build log has no timestamps, workdir with Gradle profile report was cleaned). dex/package never reached.

## Peaks (health log, 15 s samples)

- Peak RAM used: 6167 MB (of 8062). Min MemAvailable seen about 2.0 GB.
- Peak swap used: 472 MB (of 2047).
- Peak load1: 4. Peak temp: 62 C. Min EXT5V: 5.14 V. get_throttled stayed 0x0. Fan up to ~6000 RPM.

## Settings (before -> after)

`/home/robin/android-setup/gradle.properties.local-build` (backup `.bak-20261007`):

| Key | Before | After |
|---|---|---|
| org.gradle.jvmargs | -Xmx2560m -XX:MaxMetaspaceSize=512m | -Xmx2048m -XX:MaxMetaspaceSize=512m |
| kotlin.daemon.jvmargs | (unset) | -Xmx1024m -XX:MaxMetaspaceSize=384m |
| org.gradle.workers.max | 2 | 1 |
| org.gradle.parallel / daemon | false / false | unchanged |
| reactNativeArchitectures, aapt2 override | arm64-v8a, set | unchanged |

Finding: this file was NOT actually wired into the procedure (the previous run showed Xmx2048m, the template default, and generated `android/gradle.properties` has parallel=true and 4 ABIs because prebuild regenerates it). `~/logs/run-local-build.sh` (backup `.bak-20261007`) now copies it to `~/.gradle/gradle.properties` for the run and removes it on exit (trap). It also sets `CMAKE_BUILD_PARALLEL_LEVEL=1` and temporarily replaces the SDK symlink `cmake/3.22.1/bin/ninja -> /usr/bin/ninja` with a wrapper `exec /usr/bin/ninja -j1 "$@"` (AGP calls ninja without -j); symlink restored on exit (verified). Existing `taskset -c 2,3 nice -n 15 ionice -c3` kept. qemu/aapt2 setup untouched.

Monitor `~/logs/local-build-monitor.sh` (old: `.bak-20261007`) rewritten: 15 s samples (builtins and /proc, `ps` only for top-3), logs temp, throttled, EXT5V, fan, avail, swap, load, top-3 RSS; aborts build on MemAvailable < 400 MB or swap > 90% on 2 consecutive samples, temp >= 85 C, or undervolt/throttle bits; writes ABORT line with process tree. `nice -n -10` not permitted for user robin (ran at nice 0, build at 15). Peaks written to `~/logs/local-build-peaks.txt`. It never triggered.

## What was stopped / restored

- Local Supabase docker stack (11 containers, `docker stop`, no volumes touched; list in `~/logs/stopped-containers-20261007.txt`): restarted after build with `docker start` (db first order reversed list); all healthy (rest has no healthcheck).
- Metro `npx expo start --dev-client --port 8081` (pid 11559): stopped, NOT restarted. Restart manually when needed for Maestro.
- Free RAM before build: 6.8 GB available (was 5.0 GB).

## Next steps (need user decision)

1. Retry as is (failure looks intermittent), or
2. investigate x86root glibc / qemu-user (missing `strchr` symbol from libc under `/home/robin/android-setup/x86root`), e.g. QEMU_LD_PREFIX/libc version mismatch.
Remaining native modules after reanimated are unbuilt, so more time (est. another 30-60 min) is expected beyond this run.

## Investigation of the `strchr` symbol lookup error (2026-10-07, later)

Evidence:
- Sysroot `/home/robin/android-setup/x86root` is consistent: glibc 2.41-12+deb13u4 (Debian 13), libc/libm/ld-linux identical in `lib/` and `usr/lib/` (same md5), libstdc++ 6.0.33 / libgcc_s from the same Debian 13 era. `strchr@@GLIBC_2.2.5` is exported (IFUNC). No other libc.so.6 in the SDK/NDK dirs, `LD_LIBRARY_PATH` empty, no `QEMU_*`/`GLIBC_TUNABLES` set.
- qemu-user 10.0.13 (Debian), binfmt `qemu-x86_64` flags POF.
- Reproduction attempts: 800 `clang++ --version` runs (2 parallel, taskset 2,3): 0 failures. Full compile of CSSDropShadow.cpp with the exact flags from the log (minus PCH/depfile), -O2 -flto=thin: succeeded, 108 s, no error. Web search found no matching report.
- Conclusion: not a deterministic sysroot/glibc mismatch (that would fail every time). Rare transient failure (roughly 1 in several hundred x86 process starts under qemu-user; root cause inside qemu/ld.so lazy IFUNC lookup not identified). Not reproducible cheaply.

Mitigation (Pi-side only, no repo changes): `/home/robin/android-setup/ninja-retry.sh` wraps ninja (called from the existing `cmake/3.22.1/bin/ninja` wrapper that `~/logs/run-local-build.sh` creates, backup `~/logs/run-local-build.sh.bak-ninjaretry`). If ninja fails and output matches `symbol lookup error` or `uncaught target signal`, ninja is re-run (up to 6 times, resumes where it stopped, compile steps idempotent); other failures pass through unchanged. Validated with a fake ninja (2 transient failures then success -> rc 0; real error -> rc 1). stderr is merged into stdout (tee). Not covered: transient failure during CMake configure (try_compile) or in non-ninja steps.

## Local build SUCCEEDED (2026-10-07, attempts 3-4)

Result: `/home/robin/builds/watchcrew-preview-local-20261007.apk`, 55,768,184 bytes (53 MB), arm64-v8a only, release variant, preview profile. Contains classes.dex..classes5.dex, 32 lib/arm64-v8a/*.so (incl. libreanimated, libworklets, libhermesvm, libappmodules), assets/index.android.bundle, AndroidManifest.xml. apksigner: "Verifies", v2 signature only, 1 signer (cert DN empty fields, SHA-256 25d217cf...8162). Whether this is the same keystore as EAS remote build 2a26df96 (update-in-place) is NOT verified. NOT installed on the phone.

### Attempt table

| # | Start - end | Duration | Outcome | Failing task / cause | Change made | Peak RAM used / swap / temp / min 5V |
|---|---|---|---|---|---|---|
| 1 | earlier | - | Pi froze | worklets CMake, RAM+swap full | memory-safe settings | - |
| 2 | 12:01-12:50 | 49 min | failed | reanimated CMake, transient `symbol lookup error strchr` (qemu) | ninja-retry.sh | 6167 MB / 472 MB / 62 C / 5.14 V |
| 3 | 14:24-18:20 | 3 h 56 min | aborted by own monitor (swap 1938/2047 MB twice) | not a build error; during expo-modules-core CMake. ninja-retry fired 5x and recovered every transient qemu error (reanimated passed) | `org.gradle.caching=true` added (backup `gradle.properties.local-build.bak-att3`) | 5886 MB / 1938 MB / 61 C / 5.13 V |
| 4 | 18:35-22:35 | 4 h 0 min | failed at end | `:app:createBundleReleaseJsAndAssets`: "OS not recognized. Please set project.react.hermesCommand" (RN gradle plugin only maps linux+amd64 JVM to `linux64-bin/hermesc`; aarch64 JVM rejected). All CMake/native modules finished. | workdir moved from /tmp (tmpfs = RAM) to SD (`EAS_LOCAL_BUILD_WORKINGDIR=/home/robin/builds/work-<ts>`, `SKIP_CLEANUP=1`) | 4796 MB / 780 MB / 64 C / 5.14 V |
| 4b | 22:48-23:01 | 12 min 54 s | SUCCESS | resumed `./gradlew :app:assembleRelease` in kept workdir via `~/logs/resume-local-build.sh`; generated `app/build.gradle` hermesCommand `%OS-BIN%` -> `linux64-bin` (x86 hermesc runs under qemu) | `EAS_BUILD_WORKINGDIR` needed by eas credentials gradle script | - |

### Root causes found

1. Attempt 3 swap blowup: build workdir lived in /tmp which is a 4 GB tmpfs, so object files/.cxx output consumed RAM and pushed into swap (swap hit 94%). Moving workdir to SD cut used RAM from ~5.4 GB to ~2.8-3 GB, swap stayed at 400 MB.
2. Transient qemu `symbol lookup error`: occurred about 1x per large module (reanimated, worklets, app, expo-modules-core); ninja-retry.sh recovered each time (ok with `-j1`, compile steps idempotent). No sysroot change needed.
3. Hermes OS detection: see attempt 4.

### Changes (all Pi-side, backups next to file)

- `~/logs/run-local-build.sh` (backups `.bak-att3`, `.bak-att4`): workdir on SD + skip cleanup (kept for resume, delete manually: `rm -rf ~/builds/work-*`), background auto-patch of hermesCommand in generated build.gradle.
- `~/logs/resume-local-build.sh` (new): resume gradle in kept workdir.
- `/home/robin/android-setup/gradle.properties.local-build`: + `org.gradle.caching=true`.
- Not changed: package.json, deno.lock, scripts/android-build-env.sh, app source, keystore/signing, release variant.

### Timing of full pipeline

About 4 h wall (attempt 4: Gradle 4h 0m 3s incl. ~5 min setup/prebuild; CMake modules dominate: nitro ~15 min, worklets ~25 min, reanimated ~40 min with retries, app ~100 min, expo-modules-core ~30 min, others ~30 min) + 13 min for dex/package/sign. With Gradle cache (60 tasks from cache in resume) a rerun from scratch should still be ~3-4 h because CMake outputs are not cacheable.

### Re-run

`~/logs/local-build-monitor.sh &` then `~/logs/run-local-build.sh > ~/logs/local-build-$(date +%Y%m%d-%H%M%S).log 2>&1` (stop Supabase containers first for >= 6 GB MemAvailable). The hermes patch in run-local-build.sh (attempt 4 fix) is untested end to end as a fresh run, only the manual resume was verified. Monitor swap abort (>90% twice) can false-positive; with workdir on SD swap stayed < 40%.
