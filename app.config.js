const base = require('./app.json').expo;
module.exports = () => {
  const tv = process.env.NODECAST_TARGET === 'tv';
  return {
    ...base,
    name: tv ? 'NodeCast TV' : base.name,
    orientation: tv ? 'landscape' : base.orientation,
    android: {
      ...base.android,
      package: tv ? 'com.nhshajib.nodecast.tv' : 'com.nhshajib.nodecast',
      versionCode: 301,
      permissions: ['INTERNET', 'ACCESS_NETWORK_STATE'],
      blockedPermissions: ['android.permission.RECORD_AUDIO'],
      ...(tv ? { banner: './assets/tv-banner.png' } : {}),
    },
    plugins: [...base.plugins.filter(p => (Array.isArray(p) ? p[0] : p) !== 'expo-screen-orientation'),
      ['expo-screen-orientation', { initialOrientation: tv ? 'LANDSCAPE' : 'PORTRAIT_UP' }],
      ['./plugins/withAndroidTarget', { tv }]],
  };
};
