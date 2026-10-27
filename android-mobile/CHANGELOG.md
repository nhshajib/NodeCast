# Android mobile version history

[← Mobile download & installation](README.md) · [All editions](../CHANGELOG.md)

## 0.4.0 · October 27, 2026 · Current APK

- Fixed a VLC startup race when Android had not attached the native activity yet.
- Standalone phone/tablet build with embedded VLC, Xtream Codes / M3U, local profiles, search, categories and favorites.
- Public-IP/location card, optional home-IP reference, playback settings and version history.
- Dark welcome-screen status icons and the shared premium mobile interface.
- Android VLC handoff uses an explicit native video activity; Apple-only Infuse is hidden on Android.
- Passed signed-APK checks and repeated native emulator cold starts.

[Download 0.4.0 APK](https://github.com/nhshajib/NodeCast/releases/download/android-v0.4.0/NodeCast-mobile-0.4.0.apk) · [Build record](build.json)

## 0.3.3 · October 27, 2026 · Superseded testing release

Earlier standalone Android testing build. Upgrade to 0.4.0 for the native startup fix. Install over the existing app to retain local profiles.

[Shared source history](../src/releases.ts) · [Verification details](../verification/android/README.md)
