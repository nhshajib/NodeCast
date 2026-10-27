import { registerRootComponent } from 'expo';

const App = process.env.EXPO_PUBLIC_APP_VARIANT === 'tv' ? require('./android-tv/TVApp').default : require('./App').default;

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
