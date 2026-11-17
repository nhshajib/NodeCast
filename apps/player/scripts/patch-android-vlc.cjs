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
// The phone's portrait stage has Yoga-constrained dimensions. VLC adds its
// Android TextureView after that first layout; ExpoView otherwise ignores the
// child's requestLayout and can leave a playing decoder on a zero-size surface.
// Keep the validated TV fullscreen layout behavior unchanged.
const layoutBefore=') : ExpoView(context, appContext) {';
const layoutAfter=layoutBefore+'\n  override val shouldUseAndroidLayout: Boolean = !context.packageName.endsWith(".tv")';
if(!viewSource.includes(layoutAfter)){
 if(!viewSource.includes(layoutBefore))throw new Error('Review Android VLC native child-layout patch');
 viewSource=viewSource.replace(layoutBefore,layoutAfter);
}
for(const declaration of ['  var source: String? = null','  var options: MutableList<String> = mutableListOf()']){
 const before=declaration+'\n    set(value) {\n      field = value';
 const after=declaration+'\n    set(value) {\n      if (context.packageName.endsWith(".tv") && field == value) return\n      field = value';
 if(viewSource.includes(before))viewSource=viewSource.replace(before,after);
 else if(!viewSource.includes(after))throw new Error('Review TV VLC prop identity patch');
}
fs.writeFileSync(viewFile,viewSource);

// Android 15's x86 virtual Goldfish codec advertises hardware decoding but
// produces a black texture in the headless emulator. Keep VLC and its normal
// settings on physical devices; use its existing software decoder only for
// this virtual hardware/API combination.
const playerFile=path.join(path.dirname(packagePath),'android/src/main/java/expo/modules/libvlcplayer/player/MediaPlayer.kt');
let playerSource=fs.readFileSync(playerFile,'utf8');
const decoderBefore='    libVlc = LibVLC(context)';
const decoderAfter=`    val virtualCodecFallback = android.os.Build.VERSION.SDK_INT >= 35 &&
      (android.os.Build.HARDWARE == "ranchu" || android.os.Build.HARDWARE == "goldfish")
    libVlc = if (virtualCodecFallback) {
      LibVLC(context, arrayListOf("--codec=avcodec"))
    } else {
      LibVLC(context)
    }`;
// Also upgrade an existing local install carrying the earlier preview patch.
const legacyDecoderAfter=decoderAfter.replace('arrayListOf("--codec=avcodec")','arrayListOf("--codec=avcodec", "--avcodec-hw=none")');
if(playerSource.includes(legacyDecoderAfter))playerSource=playerSource.replace(legacyDecoderAfter,decoderAfter);
if(playerSource.includes(decoderBefore))playerSource=playerSource.replace(decoderBefore,decoderAfter);
else if(!playerSource.includes(decoderAfter))throw new Error('Review Android VLC virtual-codec compatibility patch');
fs.writeFileSync(playerFile,playerSource);
