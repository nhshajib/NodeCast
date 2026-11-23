const base = require('./app.json').expo;
module.exports = () => {
  const tv = process.env.NODECAST_TARGET === 'tv';
  return {
    ...base,
    name: base.name,
    ...(tv ? { icon: './assets/launchers/tv/tv-launcher-icon-512.png' } : {}),
    orientation: tv ? 'landscape' : base.orientation,
    android: {
      ...base.android,
      package: tv ? 'com.nhshajib.nodecast.tv' : 'com.nhshajib.nodecast',
      versionCode: base.android.versionCode,
      permissions: ['INTERNET', 'ACCESS_NETWORK_STATE'],
      blockedPermissions: ['android.permission.RECORD_AUDIO', ...(tv ? ['android.permission.USE_BIOMETRIC', 'android.permission.USE_FINGERPRINT', 'android.permission.VIBRATE', 'android.permission.SYSTEM_ALERT_WINDOW'] : [])],
      ...(tv ? { banner: './assets/tv-banner.png', allowBackup: false } : {}),
    },
    plugins: [...base.plugins.filter(p => (Array.isArray(p) ? p[0] : p) !== 'expo-screen-orientation'),
      ['expo-screen-orientation', { initialOrientation: tv ? 'LANDSCAPE' : 'DEFAULT' }],
      ['./plugins/withAndroidTarget', { tv }], ['./plugins/withTVRemote', { tv }], ['./plugins/withAndroidBackDispatch', { tv }]],
  };
};
