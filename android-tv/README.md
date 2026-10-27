# NodeCast for Android TV / Google TV

A separate landscape interface in `TVApp.tsx`: a left navigation rail, three-column library, large remote-selectable controls with lavender focus outlines, search, categories, favorites, profile management, home-IP reference, version history and optional support. Live TV uses embedded VLC. Press the remote's Back button to close a page/player, clear a search, or return to Live TV before exiting.

Package: `com.nhshajib.nodecast.tv`. Separate app/data from the phone edition. Android 7+, ARM32, ARM64 and x86-64. Built for Android TV / Google TV devices; this is not a Samsung Tizen or LG webOS app.

## Download and install

Open **Actions → Build Android phone and TV APKs**, select the latest successful run and download **NodeCast-Android-tv**. Unzip and transfer the `.apk` to the TV using a USB drive or a trusted file-transfer app. Open it in a TV file manager and allow installation from that file manager if prompted. NodeCast TV appears in the TV app launcher. Enter your own Xtream Codes details or M3U URL using the on-screen keyboard or the Google TV phone remote keyboard.

No Expo Go, PC connection or weekly renewal is needed after installation. Install updates over the existing app to retain local profiles. Remote, video-decoder and network behavior still need testing on your TV model.

## Build

The shared dependencies, playback and provider code live at the repository root. CI selects this entry with `NODECAST_TARGET=tv EXPO_PUBLIC_APP_VARIANT=tv`, configures a TV launcher/banner, makes touchscreen optional and locks landscape. Both APKs use the template Android test key for personal testing. Configure a private signing key before store distribution.

To generate locally, set those two variables before `npx expo prebuild --platform android --clean`, then run `./gradlew assembleRelease` inside `android/`. Local and CI builds use the same template test key.
