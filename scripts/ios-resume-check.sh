#!/bin/bash
set -euo pipefail
if [[ ! -f ios/NodeCast.xcodeproj/xcshareddata/xcschemes/NodeCastResume.xcscheme ]]; then ruby scripts/ios-resume-project.rb; fi
SIMULATOR_ID="$(python3 - <<'PY'
import json, subprocess
raw=json.loads(subprocess.check_output(['xcrun','simctl','list','devices','booted','-j']))
print(next(d['udid'] for runtime, devices in raw['devices'].items() if 'iOS' in runtime for d in devices if 'iPhone' in d['name']))
PY
)"
collect_results() {
  result=$?
  if [[ -d build/resume.xcresult ]]; then
    xcrun xcresulttool export attachments --path build/resume.xcresult --output-path build/resume-captures || true
    xcrun xcresulttool get test-results summary --path build/resume.xcresult > build/resume-summary.json || true
  fi
  exit "$result"
}
trap collect_results EXIT
set -o pipefail
xcodebuild test -workspace ios/NodeCast.xcworkspace -scheme NodeCastResume -configuration Release -destination "id=$SIMULATOR_ID" -derivedDataPath build/DerivedDataSim -resultBundlePath build/resume.xcresult CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO 2>&1 | tee build/resume-ui.log
