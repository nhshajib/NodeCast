// Expo 58.0.3 returns Intent.toString() instead of the selected document URI.
// Keep URI permissions in Android's activity-result flow and return only its data URI.
const fs = require('node:fs');
const path = require('node:path');
const root = path.dirname(require.resolve('expo-intent-launcher/package.json'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (pkg.version !== '58.0.3') throw new Error('Review document-result patch for this expo-intent-launcher version.');
const file = path.join(root, 'android/src/main/java/expo/modules/intentlauncher/IntentLauncherModule.kt');
const before = 'payload.data?.let { putString(ATTR_DATA, it.toString()) }';
const after = 'payload.data?.data?.let { putString(ATTR_DATA, it.toString()) }';
const source = fs.readFileSync(file, 'utf8');
if (!source.includes(after)) {
  if (!source.includes(before)) throw new Error('Document-result patch no longer matches; review before building.');
  fs.writeFileSync(file, source.replace(before, after));
  console.log('Applied Android document-result URI fix.');
}
