/** Build a disposable browser QA export; native production builds never run this script. */
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const root = path.dirname(require.resolve('react-native-web/package.json'));
const file = path.join(root, 'dist/exports/AccessibilityInfo/index.js');
const original = fs.readFileSync(file, 'utf8');
if (!original.includes('resolve(true);')) throw new Error('Review RN Web accessibility mock before running QA.');
try {
  // RN Web hardcodes screen-reader=true. Simulate a normal, screen-reader-off device only in this QA bundle.
  fs.writeFileSync(file, original.replace('resolve(true);', 'resolve(false);'));
  execFileSync(process.execPath, [require.resolve('expo/bin/cli'), 'export', '--platform', 'web', '--output-dir', process.argv[2] || 'build/playback-web'], {stdio:'inherit', env:{...process.env, EXPO_NO_TELEMETRY:'1', EXPO_OFFLINE:'1'}});
} finally { fs.writeFileSync(file, original); }
