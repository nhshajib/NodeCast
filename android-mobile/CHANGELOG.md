# Android mobile version history

[← Mobile download & installation](README.md) · [All editions](../CHANGELOG.md)

## 0.6.7 · October 30, 2026 · All editions

- Compact translucent playback settings stay over the video on iPhone, Android mobile and TV. Long panels scroll; short menus fit their contents.
- Playing controls fade out after four idle seconds. Tap the video or press a TV navigation/Select/Back key to reveal them without triggering an unintended action.
- Settings dismiss after eight idle seconds. Active touches, unsaved channel changes, saving, paused/loading/failed playback and screen readers keep controls available.
- Mobile portrait and landscape playback use the same custom overlay, including a touch seek timeline. Next-episode handoffs preserve orientation. Native fullscreen no longer covers the settings interface.
- TV media keys control playback directly. Video stays mounted and menus retain the existing live connection.
- Opacity transitions respect Reduce Motion. Local profiles and existing settings are retained.

## 0.6.4 · October 29, 2026

- Clear recents without deleting resume progress or watched marks.
- Password-encrypted export/import of profiles, provider details, favorites, settings and optional history. Import previews changes and preserves existing profiles.
- Family protection transfers to a fresh device; interrupted imports recover before startup.
- Standalone native startup, guide persistence and family protection checks passed.
- SHA-256 `610f318a0b2d6a93bd204002b5cd8a7a7f2f0b51f4e611b55e23cf636aa2f329`.

## 0.6.0 · October 28, 2026

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
