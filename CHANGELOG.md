# What's new in NodeCast

[← Choose your edition](README.md)

## 0.6.7 · October 30, 2026 · All editions

- TV channels now default to a compact text list with Grid view and optional logos. Logos are off in the list to avoid artwork requests; movies and series retain their layout.
- TV Library organization separates preferences, categories and favorites; correct media-specific sort/search settings persist, fresh disk caches restore categories after restarting, and favorite/category writes use the latest profile.
- TV only loads catalogues that are needed, reuses numeric sorting, and avoids rebuilding the whole channel search index for a favorite toggle.
- Compact translucent playback settings stay over the video on iPhone, Android mobile and TV. Long panels scroll; short menus fit their contents.
- Playing controls fade out after four idle seconds. Tap the video or press a TV navigation/Select/Back key to reveal them without triggering an unintended action.
- Settings dismiss after eight idle seconds. Active touches, unsaved channel changes, saving, paused/loading/failed playback and screen readers keep controls available.
- Mobile portrait and landscape playback use the same custom overlay, including a touch seek timeline. Next-episode handoffs preserve orientation. Native fullscreen no longer covers the settings interface.
- TV media keys control playback directly. Video stays mounted and menus retain the existing live connection.
- Opacity transitions respect Reduce Motion. Local profiles and existing settings are retained.

## 0.6.6 · October 30, 2026 · Android TV

- TV player settings open beside a persistent video surface. Identical VLC source/options updates no longer restart the decoder.
- Live audio/subtitle panels close with Back before leaving the player.
- TV connection details use the normal remote-controlled navigation window and a compact two-column layout; the sidebar opens them directly.
- Native focus highlighting avoids React state updates per D-pad move; new panels repair focus before drawing; focus scans and delayed scroll repair are bounded.
- Category, media, guide and episode lists render bounded windows. Large organization lists use search/paging.
- Fullscreen history updates stay out of the hidden library; final progress and manual watched marks update when needed.
- Fixes Dark appearance contrast in the connection summary, selected categories and version badge.
- iPhone and Android mobile downloads remain 0.6.4.

## 0.6.5 · October 29, 2026 · Android TV

- D-pad/Select throughout the TV library, guide, settings, profiles and player, with visible focus, scrolling and restoration after Back.
- Isolated active panels, full-size TV switches, system keyboard activation and Fire TV Menu / long Select shortcuts.
- Compact TV guide rows put channel controls beside programmes, with aligned time labels.
- Quick playlist switching, Dark defaults for new TV installations and Fire TV-compatible launcher declarations.
- Provider-supported Xtream catch-up opens completed guide programmes using the provider's archive window and server time zone. Historical XMLTV data is required.
- iPhone and Android mobile remain 0.6.4. [TV details](android-tv/CHANGELOG.md) · [Reference comparison](verification/tv-remote/FEATURE-COMPARISON.md).

## 0.6.4 · October 29, 2026

- Clear recents from Home, TV recent channels and Library & storage; progress and watched marks stay.
- Encrypted device transfer includes profiles, provider details, favorites, settings and optional history. Import adds copies and preserves existing profiles.
- Family protection and interrupted-import recovery are included.
- iPhone launch/linking/playback fixes retained and checked in a Release simulator. Both Android APKs rebuilt and tested.

[Transfer details and verification](verification/transfer/README.md).

## 0.6.3 · October 28, 2026

- Fixed the iPhone crash at opening. The file-system library required a function the rest of the app does not provide, so the process closed before the first screen. It is now built with the same modules, and iOS is given the scene delegate class that is actually registered.
- Replaced the iPhone download with `NodeCast-0.6.3-unsigned.ipa`. A Release simulator launch stayed open. Install over the existing app with the same Apple account to keep local profiles.
- Android phone and Android TV downloads are unchanged.

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
| iPhone | [0.6.3 · IPA](iphone/README.md) | [iPhone changelog](iphone/CHANGELOG.md) |
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
