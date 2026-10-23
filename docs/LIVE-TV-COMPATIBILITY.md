# Live TV: native player versus embedded VLC

## Observed cause

The iPhone log records HLS HTTP 405 and AVFoundation/CoreMedia error -12939: a response without the byte-range/content-length behavior Apple's player expects. The user confirms external VLC plays live TV. This establishes available live content and an Apple-player/server-response incompatibility. It does not establish the codecs or why HLS returns 405. Real stream URLs, credentials and the pasted log are not committed.

Changing an extension or retrying a rejected response cannot change Apple's decoder. The new path embeds LibVLC in NodeCast.

## Implemented in 0.2.3

- expo-libvlc-player 58.0.0 supplies the embedded engine for **live TV only** in newly compiled custom binaries. Automatic selects it when the real native module exists.
- Uses the TS/direct endpoint selected for external VLC, then bounded distinct alternatives. Movies/episodes keep native resume and language preference behavior.
- Live play/pause, loading/error/close controls, per-stream audio/subtitle selection, local recent-channel updates and bounded recovery. Backgrounding pauses playback and cancels pending retries; returning requires Play.
- VLC track IDs/names are stream-specific. Native-player language preferences are not silently applied or promised here. PiP, recording, casting and persistent background playback are not enabled.
- Engine preference is per profile and defaults to Automatic. Explicit unavailable VLC choices show a missing-binary explanation instead of pretending Apple's player is VLC.

## Expo Go limitation

Expo Go contains fixed native libraries. Installing separate VLC does not add its decoder to Expo Go. In Expo Go, supported streams still use Apple's player; external VLC remains the workaround for this provider.

Official workflow: https://docs.expo.dev/develop/development-builds/introduction/
Native module: https://github.com/cornejobarraza/expo-libvlc-player

## Build and test on Windows

Follow NATIVE-BUILDS.md to install dependencies, authenticate EAS and register the iPhone. Physical-iPhone EAS signing normally requires paid Apple Developer membership. Rebuild even if an older custom NodeCast app is installed: Metro reload cannot add LibVLC to its binary.

```powershell
npm.cmd ci
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest device:create
npx.cmd eas-cli@latest build --platform ios --profile development
```

Install EAS's resulting app on the registered iPhone, then run:

```powershell
npm.cmd run start:dev:tunnel
```

Open the link in the custom NodeCast app, not Expo Go. Set Default player to NodeCast, Built-in live player to Automatic, and Live TV format to Automatic or MPEG-TS. The screen must say **Built-in VLC · Live TV**. If unavailable, the installed binary needs rebuilding.

## Validation limits

Tests cover engine choice, capability absence, endpoint order, profile migration and error classification. Browser checks validate the native fallback path/unavailable-module guidance; they cannot validate LibVLC's iPhone decoder. Native config introspection and Metro exports are not CocoaPods/Xcode builds.

The dependency's iOS podspec currently pins VLCKit 4.0.0a25. The actual native build must resolve and compile it; no native compatibility claim follows from JavaScript tests. On a real iPhone test video/audio, tracks, pause/resume, rotation, network interruption, close/profile switching and provider connection-count release.
