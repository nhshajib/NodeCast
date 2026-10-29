# Android native verification

## 0.6.4 published binaries · October 29, 2026

Both final APKs passed signatures, embedded bundle/player checks and native emulator runs. Phone verification saves an encrypted backup through DocumentsUI, clears the disposable emulator's app data, imports the backup and verifies the provider, favorite, guide, dark appearance and family PIN. TV verification includes VLC, remote Next episode, mini-player continuity, SQLite persistence and Clear recents.

[Exact build records](native-0.6.4-builds.json) · [Fresh-device transfer](native-mobile-backup-0.6.4.json) · [Phone checks](native-mobile-checks-0.6.4.json) · [TV checks](native-tv-checks-0.6.4.json). These are API 35 emulator results. Physical iPhone sharing, physical TV file-picker availability and PiP/AirPlay still need device confirmation.

## 0.6.1 published TV binary · October 28, 2026

The current TV download is version 0.6.1, version code 601. Signature, bundle and architecture checks passed, and the emulator startup and remote smoke test passed on the release run. The phone download remains the 0.6.0 APK. Physical hardware and provider streams still need device confirmation.

[TV build record](../../android-tv/build.json) · [Build run](https://github.com/nhshajib/NodeCast/actions/runs/40799293352)

## 0.6.0 published binaries · October 28, 2026

Both APKs passed signature/bundle checks, repeated cold starts, SQLite guide persistence across process restart and family PIN filtering. Phone checks include the in-sheet PIN prompt and wrong-PIN rejection. TV checks also cover VLC/MP4, the same live mini-player session, D-pad Next episode and last-episode handling. The final TV APK includes the compact guide header fix.

[Build records](native-0.6.0-builds.json) · [Phone results](native-mobile-checks-0.6.0.json) · [TV results](native-tv-checks-0.6.0.json). API 35 x86-64 emulators were used. Physical hardware, provider-specific streams, PiP and AirPlay need device confirmation. The IPA passed device-target compilation and archive validation.

## 0.5.0 published binaries · October 28, 2026

Both new APKs passed signature/bundle checks and three repeated cold starts without Metro. The exact TV APK passed synthetic Xtream import, native VLC MPEG-TS playback, native MP4 episode playback, D-pad/Select Next episode across seasons, final-episode handling and Back navigation. The native test recognizes a completed decoded sample when UIAutomator waits for the short clip to finish. No app-binary change was needed for that test adjustment.

[Build and check records](native-0.5.0-builds.json) · [TV results](native-tv-checks-0.5.0.json) · [Mobile startup](native-mobile-0.5.0.png) · [TV Next episode](native-tv-next-0.5.0.png). The 0.5.0 IPA also passed native compilation and physical-device bundle validation; this is not a real-iPhone playback test. Physical hardware, native language-track combinations and real-provider streams still need testing.

## Historical Android 0.4.0 verification

The following records describe the previous Android 0.4.0 release. Current APK sizes, hashes and source commits are in `android-mobile/build.json` and `android-tv/build.json`.

## Checks completed

- TypeScript and **76 automated tests** pass. Android intent parameters, different application IDs, next-episode order, unrelated-show isolation, final-episode behavior, duplicate/missing rows and playback clock formatting are covered.
- Both standalone Release APKs compiled, passed signature verification, are non-debuggable, contain embedded JavaScript and VLC for ARM32, ARM64 and x86-64, and passed package / launcher checks.
- Native build: https://github.com/nhshajib/NodeCast/actions/runs/40529764464
- Native emulator checks: https://github.com/nhshajib/NodeCast/actions/runs/40532664044 — **both jobs succeeded**, using the exact APKs from that build.
- Each edition passed three force-stop/cold-start cycles plus the normal test launch, without Metro or Expo Go.
- The TV test connected to a local synthetic Xtream server, played generated H.264 MPEG-TS through embedded VLC, returned with remote Back, then played native MP4 episodes fullscreen. It used **D-pad/Select** to advance through actual provider IDs **401 → 905 → 1002**, crossing a season boundary, and verified that the last episode has no Next button.
- Browser episode tests additionally verified starting the next episode at zero despite saved progress, button placement and ordered metadata. Shared iOS and Android Metro exports pass.

## Startup race fixed

The first TV episode build exposed `The current activity is no longer available` during Expo's initial module export. The stack was symbolicated with a matching Hermes source map to `NativeModulesProxy.native.js`. The VLC picture-in-picture manager eagerly read the activity in its constructor. `scripts/patch-android-vlc.cjs` makes that lookup a nullable getter, applied reproducibly after npm install for the pinned dependency. It is idempotent and rejects an unexpected dependency/source version. This changes Android source only.

## Evidence and limits

`native-*.png` screenshots are from Android API 35 x86-64 emulators: Pixel 2 hardware profile for mobile, TV 1080p hardware profile with the Google APIs system image for TV. `tv-*.png` files without the native prefix are browser fixtures. All IPTV credentials and videos used by the tests are synthetic; no customer server was contacted.

Physical Android phones/TVs, real-provider streams, hardware codecs and device-specific focus behavior still need user testing. These APKs use the standard Android test key. Configure private signing before store distribution. Install updates over the existing app to retain local profiles.

