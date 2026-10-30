// expo-libvlc-player 58.0.0 eagerly reads Activity while Expo exports modules.
// React can initialize that registry before Android has attached an Activity.
// Resolve the FragmentActivity when PiP is used, not in the manager constructor.
const fs = require('node:fs');
const path = require('node:path');
const packagePath = require.resolve('expo-libvlc-player/package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (pkg.version !== '58.0.4') throw new Error('Review the Android VLC activity-lifecycle patch for this dependency version.');
const file = path.join(path.dirname(packagePath), 'android/src/main/java/expo/modules/libvlcplayer/managers/PictureInPictureManager.kt');
const original = '  private val fragmentActivity = activity as? FragmentActivity';
const fixed = '  private val fragmentActivity: FragmentActivity?\n    get() = appContext.currentActivity as? FragmentActivity';
const source = fs.readFileSync(file, 'utf8');
if (source.includes(original)) {
  fs.writeFileSync(file, source.replace(original, fixed));
  console.log('Applied Android VLC startup lifecycle fix.');
} else if (!source.includes(fixed)) throw new Error('Android VLC startup patch no longer matches; review before building.');

// TV rerenders may resend identical native props. They must not restart the decoder.
const viewFile=path.join(path.dirname(packagePath),'android/src/main/java/expo/modules/libvlcplayer/LibVlcPlayerView.kt');
let viewSource=fs.readFileSync(viewFile,'utf8');
for(const declaration of ['  var source: String? = null','  var options: MutableList<String> = mutableListOf()']){
 const before=declaration+'\n    set(value) {\n      field = value';
 const after=declaration+'\n    set(value) {\n      if (context.packageName.endsWith(".tv") && field == value) return\n      field = value';
 if(viewSource.includes(before))viewSource=viewSource.replace(before,after);
 else if(!viewSource.includes(after))throw new Error('Review TV VLC prop identity patch');
}
fs.writeFileSync(viewFile,viewSource);
