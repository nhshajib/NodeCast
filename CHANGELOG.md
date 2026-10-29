# What's new in NodeCast

[← Choose your edition](README.md)

## 0.6.2 · October 28, 2026

- Fixed the iPhone crash on launch and during playback. Startup no longer loads file, document, and crypto native modules, Picture in Picture waits until you ask for it, and live TV survives an early VLC stop.
- Replaced the iPhone download with `NodeCast-0.6.2-unsigned.ipa`. Install over the existing app with the same Apple account to keep local profiles.
- Android phone and Android TV downloads are unchanged.

## 0.6.1 · October 28, 2026

- Rebuilt the iPhone IPA and Android TV APK from the current source and replaced those downloads.
- Android TV keeps the compact guide layout, so programme timelines stay visible, and installs over 0.6.0.
- The Android phone download remains 0.6.0.

## 0.6.0 · October 28, 2026

- Full XMLTV/gzip guides with local schedules, mapping, programme search and synchronized TV timelines.
- Light, Dark and Follow device appearance.
- Six-digit local family PIN with protected categories, background relocking and reset-based recovery.
- Persistent mini-player, Fit/Fill, VOD speed and in-app sleep timer.
- Capability-gated native PiP; iPhone native playback also offers AirPlay. Physical-device confirmation is still needed.
- Local M3U import, advanced provider headers, sorting, refresh policy and separate cache/history controls.
- Fixed mobile PIN prompt layering and a TV second-playlist connection race; compact TV guide controls keep programmes visible.

[Feature details and limits](verification/roadmap/README.md). Chromecast, multiview, QR/portal pairing, cloud sync, DVR and downloads remain future work.


## 0.5.0 · October 28, 2026 · All editions

- Preserved profile-specific browsing state, explicit search scopes and cached TV lists during refresh failures.
- Added per-channel player, internal engine and live-format preferences, plus redacted player information.
- Added season selection, watched marks, Continue series and next episode on mobile as well as TV.
- Remembered embedded-VLC track choices and clearer missing-language feedback.
- Updated Settings version history and standalone IPA/mobile APK/TV APK downloads.

[Research, implementation and validation](docs/RESEARCH-2026-10-27.md)

## Published versions

| Edition | Current download | Version history |
| --- | --- | --- |
| iPhone | [0.6.2 · IPA](iphone/README.md) | [iPhone changelog](iphone/CHANGELOG.md) |
| Android mobile | [0.6.0 · APK](android-mobile/README.md) | [Mobile changelog](android-mobile/CHANGELOG.md) |
| Android TV | [0.6.1 · TV APK](android-tv/README.md) | [TV changelog](android-tv/CHANGELOG.md) |

## October 27, 2026 · Android 0.4.0

- Separate mobile and TV editions, each with local profiles, Xtream Codes / M3U, search, favorites and built-in live playback.
- Fixed an Android VLC startup race caused by reading the native activity before it was attached.
- TV gets a landscape library, visible remote focus and fullscreen movie/episode controls.
- A bottom-right TV **Next episode** button follows the server's episode list, crosses seasons and hides on the final episode. The current stream closes before the following episode opens.
- Native emulator checks passed for repeated cold starts, generated MPEG-TS / MP4 playback and D-pad/Select episode changes. Physical hardware and customer-provider streams still need testing.

## October 26, 2026 · iPhone 0.3.0

- Smoother tab transitions and moving lavender tab indicator.
- Visited tabs retain their scroll positions; Library and Favorites keep separate searches/categories.
- Settings retain their content during dismissal, with Reduce Motion support.
- Includes the animated intro, fullscreen/landscape playback and optional home-IP reference from earlier iPhone releases.

The iPhone download is the original verified 0.3.0 binary, republished as a permanent release asset. A newer shared source version does not automatically update that IPA.

For earlier changes, use the edition-specific changelogs and [archived source milestones](docs/CHANGELOG-ARCHIVE.md). Detailed engineering checks are in [verification results](verification/RESULTS.md).
