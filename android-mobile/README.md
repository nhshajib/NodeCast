# NodeCast for Android phones and tablets

This edition uses the main premium mobile interface in `App.tsx`, with local profiles, Xtream Codes / M3U, embedded VLC, favorites, search, home-IP reference and version history. It runs without a PC or Expo Go.

Package: `com.nhshajib.nodecast`. Android 7 or later, ARM32, ARM64 and x86-64.

## Download and install

[Download NodeCast mobile APK](https://github.com/nhshajib/NodeCast/releases/download/android-v0.3.3/NodeCast-mobile-0.3.3.apk) · [Android testing release](https://github.com/nhshajib/NodeCast/releases/tag/android-v0.3.3)

Open the repository's **Actions → Build Android phone and TV APKs**, choose a successful run containing the mobile artifact, and download **NodeCast-Android-mobile**. Unzip it, transfer the `.apk` to your phone and open it. Allow installation from the browser or Files app when Android asks. Future APK updates should be installed over this app to retain profiles.

The workflows build Release APKs signed with the Expo template's standard Android test key, verify the signature, embedded JavaScript and VLC libraries, and publish separate downloads. No development server or weekly signing renewal is needed. Keep a copy of your provider details; uninstalling removes local app data.

## Source and build

Shared source lives at the repository root to keep fixes synchronized across iPhone and Android. This folder contains mobile distribution notes and receives APKs during CI; the TV edition has a separate interface in `../android-tv/TVApp.tsx`.

Local: `NODECAST_TARGET=mobile EXPO_PUBLIC_APP_VARIANT=mobile npx expo prebuild --platform android --clean`, then `cd android && ./gradlew assembleRelease`. Both the CI and local builds use the template test key. These are personal testing builds. Configure a private signing key before store distribution.
