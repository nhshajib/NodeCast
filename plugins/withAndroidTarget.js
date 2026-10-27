const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
module.exports = (config, { tv = false } = {}) => {
  if (tv) config = withDangerousMod(config, ['android', async mod => {
    const fs = require('fs/promises');
    const path = require('path');
    const target = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/drawable/tv_banner.png');
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(mod.modRequest.projectRoot, 'assets/tv-banner.png'), target);
    return mod;
  }]);
  return withAndroidManifest(config, mod => {
  const manifest = mod.modResults.manifest;
  manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
  const app = manifest.application[0];
  // IPTV subscriptions commonly supply HTTP URLs; retain iOS transport parity.
  app.$['android:usesCleartextTraffic'] = 'true';
  if (tv) {
    manifest['uses-feature'] = [
      ...(manifest['uses-feature'] || []).filter(f => !['android.software.leanback', 'android.hardware.touchscreen'].includes(f.$['android:name'])),
      { $: { 'android:name': 'android.software.leanback', 'android:required': 'true' } },
      { $: { 'android:name': 'android.hardware.touchscreen', 'android:required': 'false' } },
    ];
    app.$['android:banner'] = '@drawable/tv_banner';
    const activity = app.activity.find(a => a.$['android:name'] === '.MainActivity');
    activity.$['android:screenOrientation'] = 'landscape';
    for (const filter of activity['intent-filter'] || []) {
      if ((filter.action || []).some(a => a.$['android:name'] === 'android.intent.action.MAIN')) {
        filter.category = [{ $: { 'android:name': 'android.intent.category.LEANBACK_LAUNCHER' } }];
      }
    }
  }
  return mod;
  });
};
