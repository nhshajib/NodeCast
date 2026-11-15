#!/bin/bash
set -euo pipefail
if [[ ! -f ios/GlowTV.xcodeproj/xcshareddata/xcschemes/GlowTVResume.xcscheme ]]; then ruby scripts/ios-resume-project.rb; fi
CAPTURE=resume
if [[ "${GLOWTV_CAPTURE_DEVICE:-iphone}" = ipad ]]; then
  CAPTURE=resume-ipad
  # The completed iPhone simulator otherwise competes for scarce CI RAM/GPU.
  xcrun simctl shutdown all || true
  SIMULATOR_ID="$(python3 - <<'PYDEVICE'
import json, subprocess
raw=json.loads(subprocess.check_output(["xcrun","simctl","list","devices","available","-j"]))
choices=[(runtime,d["name"],d["udid"]) for runtime,devices in raw["devices"].items() if "iOS" in runtime for d in devices if d.get("isAvailable") and "iPad Pro 13-inch" in d["name"]]
if not choices: raise SystemExit("A 13-inch iPad Pro simulator is required for native tablet captures")
print(sorted(choices)[-1][2])
PYDEVICE
)"
  xcrun simctl boot "$SIMULATOR_ID" || true
  xcrun simctl bootstatus "$SIMULATOR_ID" -b
  xcrun simctl install "$SIMULATOR_ID" build/DerivedDataSim/Build/Products/Release-iphonesimulator/GlowTV.app
else
SIMULATOR_ID="$(python3 - <<'PY'
import json, subprocess
raw=json.loads(subprocess.check_output(['xcrun','simctl','list','devices','booted','-j']))
print(next(d['udid'] for runtime, devices in raw['devices'].items() if 'iOS' in runtime for d in devices if 'iPhone' in d['name']))
PY
)"
fi
collect_results() {
  result=$?
  if [[ -d build/${CAPTURE}.xcresult ]]; then
    xcrun xcresulttool export attachments --path build/${CAPTURE}.xcresult --output-path build/${CAPTURE}-captures || true
    xcrun xcresulttool get test-results summary --path build/${CAPTURE}.xcresult > build/${CAPTURE}-summary.json || true
  fi
  exit "$result"
}
trap collect_results EXIT
TEST_ARGS=()
if [[ "${GLOWTV_ONLY_DESIGN:-0}" = 1 ]]; then TEST_ARGS=(-only-testing:GlowTVResumeUITests/GlowTVResumeUITests/testDesignHomeGuideAndPlayer); fi
set -o pipefail
xcodebuild test "${TEST_ARGS[@]}" -workspace ios/GlowTV.xcworkspace -scheme GlowTVResume -configuration Release -destination "id=$SIMULATOR_ID" -derivedDataPath build/DerivedDataSim -resultBundlePath build/${CAPTURE}.xcresult CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=NO 2>&1 | tee build/${CAPTURE}-ui.log
