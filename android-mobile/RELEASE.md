Android TV 0.6.1 is a current-source rebuild. It keeps the compact guide layout so programme timelines stay visible, and version code 601 installs over the 0.6.0 TV app. The phone APK in this notes file is still the published 0.6.0 mobile build. Native videos can offer PiP; Chromecast is not included. Choose the correct APK:

- [**NodeCast mobile 0.6.0 APK**](https://github.com/nhshajib/NodeCast/releases/download/android-v0.6.0/NodeCast-mobile-0.6.0.apk): Android phone/tablet interface. This file is unchanged.
- [**NodeCast TV 0.6.1 APK**](https://github.com/nhshajib/NodeCast/releases/download/android-v0.6.1/NodeCast-tv-0.6.1.apk): Android TV / Google TV with fullscreen series playback and a bottom-right Next episode button.

Both include embedded VLC, local Xtream Codes / M3U profiles and the JavaScript bundle. No Expo Go, PC connection or weekly signing renewal is needed. Each edition has its own app ID and local storage. Install subsequent updates over the existing app to preserve profiles.

These personal testing Release builds use the standard Android test signing key. They are not Play Store releases. Configure a private signing key before public/store distribution. Android may ask permission to install from your browser or file manager.

TV edition instructions: https://github.com/nhshajib/NodeCast/tree/main/android-tv
Mobile edition instructions: https://github.com/nhshajib/NodeCast/tree/main/android-mobile

Native playback and remote behavior still need confirmation on physical devices. Use only content you are authorized to access.
