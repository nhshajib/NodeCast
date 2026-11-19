#!/usr/bin/env bash
set -euo pipefail
export npm_config_cache=/tmp/glowtv-npm-cache
phase="$1"
cd "$(dirname "$0")/../../../apps/player"
npm ci > "/tmp/glowtv-073-${phase}-ci.log" 2>&1
npm run typecheck > "/tmp/glowtv-073-${phase}-types.log" 2>&1
npm test > "/tmp/glowtv-073-${phase}-tests.log" 2>&1
EXPO_NO_TELEMETRY=1 npx expo export --platform web --output-dir /tmp/glowtv-web > "/tmp/glowtv-073-${phase}-ios.log" 2>&1
EXPO_NO_TELEMETRY=1 EXPO_PUBLIC_APP_VARIANT=tv npx expo export --platform web --output-dir /tmp/glowtv-tv-web > "/tmp/glowtv-073-${phase}-tv.log" 2>&1
EXPO_NO_TELEMETRY=1 EXPO_PUBLIC_DESIGN_PLATFORM=android npx expo export --platform web --output-dir /tmp/glowtv-android-web > "/tmp/glowtv-073-${phase}-android.log" 2>&1
cd ../..
node verification/glowtv/check-ui-grid.cjs
node verification/glowtv/check-ui-scope.cjs
printf 'Phase %s checks passed\n' "$phase"
