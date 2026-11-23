#!/usr/bin/env bash
set -euo pipefail
TARGET="$1"
PROFILE_ARGS=()
PACKAGE=com.nhshajib.nodecast
if [ "$TARGET" = tv ]; then PACKAGE="$PACKAGE.tv"; PROFILE_ARGS=(--ez nodecastTvProfile true); fi
mkdir -p verification/android
trap 'adb logcat -d > "verification/android/emulator-$TARGET-logcat.txt" || true' EXIT
APK_NAME=GlowTV.apk
if [ "$TARGET" = tv ]; then APK_NAME=GlowTV-TV.apk; fi
APK_FILE="$(find apk -name "$APK_NAME" -print -quit)"
adb install "$APK_FILE"
sha256sum "$APK_FILE" > "verification/android/emulator-$TARGET-apk.sha256"
cp "$(find apk -name 'apk-manifest.txt' -print -quit)" "verification/android/emulator-$TARGET-apk-manifest.txt"
adb shell dumpsys package "$PACKAGE" | grep -E 'versionCode=|versionName=' > "verification/android/emulator-$TARGET-installed-package.txt"
adb logcat -c
if [ "$TARGET" = tv ]; then adb shell settings put secure show_ime_with_hard_keyboard 1; fi
# Exercise repeated cold starts to catch activity/module initialization races.
for ATTEMPT in 1 2 3; do
  adb shell am start -W -n "$PACKAGE/.MainActivity" "${PROFILE_ARGS[@]}"
  sleep 5
  adb shell pidof "$PACKAGE"
  adb shell am force-stop "$PACKAGE"
done
# No Metro is running: these must be self-contained Release APKs.
adb shell am start -W -n "$PACKAGE/.MainActivity" "${PROFILE_ARGS[@]}"
sleep 12
adb shell pidof "$PACKAGE"
adb shell uiautomator dump /sdcard/nodecast-initial.xml
adb pull /sdcard/nodecast-initial.xml "verification/android/emulator-$TARGET-initial.xml"
# API 35's Pixel Launcher can leave its own ANR over a healthy app. Recover
# only that exact system-launcher dialog on a disposable emulator. Never
# dismiss an app ANR or relax any subsequent GlowTV startup/feature assertion.
if python3 - "$TARGET" <<'PY'
import sys,xml.etree.ElementTree as ET
root=ET.parse(f'verification/android/emulator-{sys.argv[1]}-initial.xml')
sys.exit(0 if any(n.get('package')=='android' and n.get('text')=="Pixel Launcher isn't responding" for n in root.iter('node')) else 1)
PY
then
  test "$(adb shell getprop ro.kernel.qemu | tr -d '\r')" = 1 || test "$(adb shell getprop ro.boot.qemu | tr -d '\r')" = 1
  cp "verification/android/emulator-$TARGET-initial.xml" "verification/android/emulator-$TARGET-launcher-anr.xml"
  adb exec-out screencap -p > "verification/android/emulator-$TARGET-launcher-anr.png"
  adb shell am force-stop com.google.android.apps.nexuslauncher
  adb shell am start -W -n "$PACKAGE/.MainActivity" "${PROFILE_ARGS[@]}"
  sleep 1
  adb shell uiautomator dump /sdcard/nodecast-initial.xml
  adb pull /sdcard/nodecast-initial.xml "verification/android/emulator-$TARGET-initial.xml"
fi
adb exec-out screencap -p > "verification/android/emulator-$TARGET-initial.png"
if [ "$TARGET" = tv ]; then
  # Home-IP setup is initially offered. Back returns to TV navigation.
  adb shell input keyevent 4
  sleep 2
  adb shell uiautomator dump /sdcard/nodecast-remote.xml
  adb pull /sdcard/nodecast-remote.xml "verification/android/emulator-$TARGET-remote.xml"
  adb exec-out screencap -p > "verification/android/emulator-$TARGET-remote.png"
fi
if [ "$TARGET" = tv ]; then
  NODECAST_REMOTE_ONLY=1 python3 scripts/android-tv-playback-smoke.py
else
  python3 scripts/android-mobile-features-smoke.py
fi
adb logcat -d > "verification/android/emulator-$TARGET-logcat.txt"
adb shell pidof "$PACKAGE"
adb shell dumpsys meminfo "$PACKAGE" > "verification/android/emulator-$TARGET-memory.txt"
if grep -Eq 'FATAL EXCEPTION|ReactNativeJS:.*(Error:|Invariant Violation|TypeError)' "verification/android/emulator-$TARGET-logcat.txt"; then
  echo 'Native or JavaScript crash detected'; exit 1
fi
if ! grep -Eq 'Disconnect|home.IP|playlist|My TV' "verification/android/emulator-$TARGET-initial.xml"; then
  echo 'Expected application UI not found'; exit 1
fi
echo "Standalone $TARGET startup passed on Android emulator. This is not a physical TV playback test."
