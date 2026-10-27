// expo-libvlc-player 58.0.0 eagerly reads Activity while Expo exports modules.
// React can initialize that registry before Android has attached an Activity.
// Resolve the FragmentActivity when PiP is used, not in the manager constructor.
const fs = require('node:fs');
const path = require('node:path');
const packagePath = require.resolve('expo-libvlc-player/package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (pkg.version !== '58.0.0') throw new Error('Review the Android VLC activity-lifecycle patch for this dependency version.');
const file = path.join(path.dirname(packagePath), 'android/src/main/java/expo/modules/libvlcplayer/managers/PictureInPictureManager.kt');
const original = '  private val fragmentActivity = activity as? FragmentActivity';
const fixed = '  private val fragmentActivity: FragmentActivity?\n    get() = appContext.currentActivity as? FragmentActivity';
const source = fs.readFileSync(file, 'utf8');
if (source.includes(original)) {
  fs.writeFileSync(file, source.replace(original, fixed));
  console.log('Applied Android VLC startup lifecycle fix.');
} else if (!source.includes(fixed)) throw new Error('Android VLC startup patch no longer matches; review before building.');
