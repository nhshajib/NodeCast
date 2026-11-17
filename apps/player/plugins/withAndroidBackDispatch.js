const { withMainActivity } = require('expo/config-plugins');

// RN 0.88 installs its dispatcher bridge only on Android 16+. With predictive
// Back enabled, Android 13–15 otherwise finish the Activity before native-stack
// receives Back. Bridge the same existing RN dispatch on those runtimes only.
// No navigator, route, animation option or TV remote handler is replaced.
module.exports = (config, { tv = false } = {}) => {
  if (tv) return config;
  if (require('react-native/package.json').version !== '0.88.0') {
    throw new Error('Review the Android Back dispatcher bridge for this React Native version.');
  }
  return withMainActivity(config, mod => {
    if (mod.modResults.language !== 'kt') throw new Error('Android Back dispatch requires the Kotlin activity.');
    let source = mod.modResults.contents;
    if (source.includes('glowTVBackCallback')) return mod;
    const activity = 'class MainActivity : ReactActivity() {';
    const create = 'super.onCreate(null)';
    const fallback = 'super.invokeDefaultOnBackPressed()';
    if (!source.includes(activity) || !source.includes(create) || !source.includes(fallback)) {
      throw new Error('Review the Expo MainActivity Back dispatcher template.');
    }
    source = source.replace(activity, `${activity}
  private var glowTVBackCallback: androidx.activity.OnBackPressedCallback? = null
`);
    source = source.replace(create, `${create}
    if (Build.VERSION.SDK_INT in 33..35) {
      val callback = object : androidx.activity.OnBackPressedCallback(true) {
        @Suppress("DEPRECATION")
        override fun handleOnBackPressed() {
          isEnabled = false
          try { this@MainActivity.onBackPressed() } finally { isEnabled = true }
        }
      }
      glowTVBackCallback = callback
      onBackPressedDispatcher.addCallback(this, callback)
    }`);
    // Let root Back reach the original Activity fallback without reentering
    // our bridge. Reenable it so navigation still works after app resume.
    source = source.replaceAll(fallback, `run {
        glowTVBackCallback?.isEnabled = false
        try { super.invokeDefaultOnBackPressed() }
        finally { glowTVBackCallback?.isEnabled = true }
      }`);
    mod.modResults.contents = source;
    return mod;
  });
};
