// Phone editions (iPhone, Android phone, web) use Expo Router: native stack, native tabs and
// native sheets from `app/`. The TV edition keeps its own D-pad navigator.
if (process.env.EXPO_PUBLIC_APP_VARIANT === 'tv') {
  const { registerRootComponent } = require('expo');
  registerRootComponent(require('./android-tv/TVApp').default);
} else {
  require('expo-router/entry');
}
