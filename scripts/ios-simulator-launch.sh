#!/bin/bash
# Release simulator launch gate. Fails unless NodeCast is still running
# after the scene delegate has had time to connect and start React Native.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="${1:-$ROOT/build/DerivedDataSim/Build/Products/Release-iphonesimulator/NodeCast.app}"
BUNDLE="${BUNDLE_ID:-com.nhshajib.nodecast}"
HOLD_SECONDS="${HOLD_SECONDS:-20}"
LOG="$ROOT/build/simulator-console.txt"
mkdir -p "$ROOT/build"

if [[ ! -d "$APP" ]]; then
  echo "Simulator app was not produced: $APP" >&2
  exit 1
fi

python3 - "$APP" <<'PY'
import plistlib, sys
app = sys.argv[1]
info = plistlib.load(open(f"{app}/Info.plist", "rb"))
scenes = info["UIApplicationSceneManifest"]["UISceneConfigurations"]["UIWindowSceneSessionRoleApplication"]
name = scenes[0]["UISceneDelegateClassName"]
binary = open(f"{app}/NodeCast", "rb").read()
if name != "SceneDelegate":
    raise SystemExit(f"Info.plist scene delegate is {name!r}, expected SceneDelegate")
if b"SceneDelegate" not in binary:
    raise SystemExit("The executable does not contain the SceneDelegate class.")
print(f"scene delegate class registered: {name}")
PY

UDID="$(python3 - <<'PY'
import json, subprocess, sys
data = json.loads(subprocess.check_output(["xcrun", "simctl", "list", "devices", "available", "-j"]))
candidates = []
for runtime, devices in data.get("devices", {}).items():
    if "iOS" not in runtime:
        continue
    for device in devices:
        if device.get("isAvailable") and "iPhone" in device.get("name", ""):
            candidates.append((runtime, device["name"], device["udid"]))
if not candidates:
    sys.exit("No available iPhone simulator runtime.")
runtime, name, udid = sorted(candidates)[-1]
print(udid)
print(f"Using {name} ({runtime})", file=sys.stderr)
PY
)"

xcrun simctl boot "$UDID" || true
xcrun simctl bootstatus "$UDID" -b
xcrun simctl install "$UDID" "$APP"

SYSTEM_LOG="$ROOT/build/simulator-system.log"
: > "$LOG"
xcrun simctl launch --console-pty --terminate-running-process "$UDID" "$BUNDLE" >"$LOG" 2>&1 &
LAUNCHER=$!
sleep "$HOLD_SECONDS"
ALIVE=0
if kill -0 "$LAUNCHER" 2>/dev/null; then
  ALIVE=1
fi
xcrun simctl spawn "$UDID" log show --last 2m --style compact --predicate 'processImagePath CONTAINS "NodeCast"' >"$SYSTEM_LOG" 2>&1 || true
FAILED_OPEN=0
if [[ "$ALIVE" -ne 1 ]]; then
  FAILED_OPEN=1
  echo "NodeCast exited during launch." >&2
fi
if grep -E -q "could not load class|could not find a class|Terminating app due to|couldn't start React Native|Symbol not found" "$SYSTEM_LOG" "$LOG"; then
  FAILED_OPEN=1
  echo "Launch log shows the scene delegate was not connected or the process aborted." >&2
fi
if [[ "$ALIVE" -eq 1 ]]; then
  kill "$LAUNCHER" 2>/dev/null || true
  wait "$LAUNCHER" 2>/dev/null || true
  xcrun simctl terminate "$UDID" "$BUNDLE" || true
fi
if [[ "$FAILED_OPEN" -eq 0 ]]; then
  echo "NodeCast stayed open for ${HOLD_SECONDS}s."
  exit 0
fi
echo "Simulator console:" >&2
cat "$LOG" >&2 || true
echo "System log:" >&2
cat "$SYSTEM_LOG" >&2 || true
echo "Recent crash reports:" >&2
find "$HOME/Library/Logs/DiagnosticReports" "$HOME/Library/Logs/DiagnosticReports/Retired" /tmp -name '*NodeCast*' -mmin -30 -print 2>/dev/null | while read -r report; do
  echo "----- $report -----" >&2
  tail -n 120 "$report" >&2 || true
done
exit 1
