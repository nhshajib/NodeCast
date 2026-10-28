const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// SQLite's native store is not used by browser preview, but its lazy web module references WASM.
config.resolver.assetExts.push('wasm');
module.exports = config;
