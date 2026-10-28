# What's new in NodeCast

[← Choose your edition](README.md)

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
| iPhone | [0.5.0 · IPA](iphone/README.md) | [iPhone changelog](iphone/CHANGELOG.md) |
| Android mobile | [0.5.0 · APK](android-mobile/README.md) | [Mobile changelog](android-mobile/CHANGELOG.md) |
| Android TV | [0.5.0 · TV APK](android-tv/README.md) | [TV changelog](android-tv/CHANGELOG.md) |

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
