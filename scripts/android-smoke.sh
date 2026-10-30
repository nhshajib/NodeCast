#!/usr/bin/env bash
set -euo pipefail
TARGET="$1"
PACKAGE=com.nhshajib.nodecast
if [ "$TARGET" = tv ]; then PACKAGE="$PACKAGE.tv"; fi
mkdir -p verification/android
trap 'adb logcat -d > "verification/android/emulator-$TARGET-logcat.txt" || true' EXIT
adb install "$(find apk -name '*.apk' -print -quit)"
adb logcat -c
# Exercise repeated cold starts to catch activity/module initialization races.
for ATTEMPT in 1 2 3; do
  adb shell am start -W -n "$PACKAGE/.MainActivity"
  sleep 5
  adb shell pidof "$PACKAGE"
  adb shell am force-stop "$PACKAGE"
done
# No Metro is running: these must be self-contained Release APKs.
adb shell am start -W -n "$PACKAGE/.MainActivity"
sleep 12
adb shell pidof "$PACKAGE"
adb shell uiautomator dump /sdcard/nodecast-initial.xml
adb pull /sdcard/nodecast-initial.xml "verification/android/emulator-$TARGET-initial.xml"
adb exec-out screencap -p > "verification/android/emulator-$TARGET-initial.png"
if [ "$TARGET" = tv ]; then
  # Home-IP setup is initially offered. Back returns to TV navigation.
  adb shell input keyevent 4
  adb shell input keyevent 20
  adb shell input keyevent 23
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
if grep -Eq 'FATAL EXCEPTION|ReactNativeJS:.*(Error:|Invariant Violation|TypeError)' "verification/android/emulator-$TARGET-logcat.txt"; then
  echo 'Native or JavaScript crash detected'; exit 1
fi
if ! grep -Eq 'Disconnect|home.IP|playlist|My TV' "verification/android/emulator-$TARGET-initial.xml"; then
  echo 'Expected application UI not found'; exit 1
fi
echo "Standalone $TARGET startup passed on Android emulator. This is not a physical TV playback test."
