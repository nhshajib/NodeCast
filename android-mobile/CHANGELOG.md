# Android mobile version history

[← Mobile download & installation](README.md) · [All editions](../CHANGELOG.md)

## 0.6.0 · October 28, 2026 · Current download

- Full XMLTV/gzip guides with local schedules, mapping, programme search and synchronized TV timelines.
- Light, Dark and Follow device appearance.
- Six-digit local family PIN with protected categories, background relocking and reset-based recovery.
- Persistent mini-player, Fit/Fill, VOD speed and in-app sleep timer.
- Capability-gated native PiP; iPhone native playback also offers AirPlay. Physical-device confirmation is still needed.
- Local M3U import, advanced provider headers, sorting, refresh policy and separate cache/history controls.
- Fixed mobile PIN prompt layering and a TV second-playlist connection race; compact TV guide controls keep programmes visible.

[Feature details and limits](../verification/roadmap/README.md). Chromecast, multiview, QR/portal pairing, cloud sync, DVR and downloads remain future work.


## 0.5.0 · October 28, 2026

- Signed release validated and repeated native emulator cold starts passed.
- Explicit search scopes and category retention, with profile-specific browsing context.
- Per-channel player, engine and live-format choices; redacted player information.
- Seasons, watched marks and Continue series; Next episode on mobile and TV.
- Remembered VLC track choices and clearer unavailable-language feedback.
- Local profiles remain account-free. Install over the existing app with the same signing identity.


## 0.4.0 · October 27, 2026

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
