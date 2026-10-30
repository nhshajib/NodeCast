# Android TV version history

[← TV download & installation](README.md) · [All editions](../CHANGELOG.md)

## 0.6.6 · October 30, 2026 · Current download

- Keeps the native live-video host stable through player settings and uses a TV side panel; avoids duplicate decoder initialization for unchanged source/options.
- Back closes live track settings before exiting playback.
- Remote-accessible connection/IP details replace the separate mobile modal window.
- Native focus indicators, initial panel focus repair and bounded view scans reduce navigation work; tile focus no longer updates the whole library.
- Bounded category, media, guide and episode rendering; searchable pages for large library organization lists.
- Preserves final progress, immediate watched marks and visible recents without rebuilding hidden lists during fullscreen playback.
- Dark appearance contrast fixes in the connection summary, selected categories and version badge.

## 0.6.5 · October 29, 2026

- TV-only native D-pad/Select navigation, visible focus, automatic scrolling, disabled-control skipping and focus restoration after Back.
- Active player, subtitle/audio, programme and PIN panels keep focus inside; covered mini-player controls stay out of the focus path.
- Remote-friendly switches and fields, Fire TV Menu / long Select context options and remote media controls.
- Compact TV guide rows place channel controls beside programmes, keep the first programme visible and align time ticks.
- Quick playlist switcher and Dark defaults for new TV installations; existing preferences stay intact.
- Standard and Leanback launcher entries, without requiring Leanback hardware, for Fire TV compatibility.
- Provider-supported Xtream catch-up from completed guide programmes, with archive-window validation and server-timezone conversion. Historical guide data is required; M3U archive templates, multiview and recording are not included.
- iPhone and Android mobile downloads remain 0.6.4.
- SHA-256 `0dc209a17cda06cc50918ba162bd7cdc439f5e86b8a0713216e399b5de5f9dd4`.

## 0.6.4 · October 29, 2026

- Clear recents without deleting resume progress or watched marks.
- Password-encrypted export/import of profiles, provider details, favorites, settings and optional history. Import previews changes and preserves existing profiles.
- Family protection transfers to a fresh device; interrupted imports recover before startup.
- Standalone native startup, guide persistence and family protection checks passed.
- SHA-256 `c9003b3949af6f59917e2627890edf8c0407fca55db52c51215b69ab69e50cee`.

## 0.6.1 · October 28, 2026

- Rebuilt the Android TV APK from the current source and replaced the 0.6.0 TV download.
- Version code 601 installs over 0.6.0 and keeps the compact guide layout.
- The Android phone download remains 0.6.0.

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
- Native VLC and MP4 playback, cross-season Next episode, D-pad/Select and Back checks passed on the emulator.
- Explicit search scopes and category retention, with profile-specific browsing context.
- Per-channel player, engine and live-format choices; redacted player information.
- Seasons, watched marks and Continue series; Next episode on mobile and TV.
- Remembered VLC track choices and clearer unavailable-language feedback.
- Local profiles remain account-free. Install over the existing app with the same signing identity.


## 0.4.0 · October 27, 2026

- Dedicated landscape interface with a sidebar, three-column library and visible remote focus.
- Xtream Codes / M3U connections, local profiles, categories, search and favorites.
- Embedded VLC for live TV; fullscreen native movie/episode controls with play/pause, 10-second rewind, 30-second forward and audio/subtitles.
- Bottom-right **Next episode** follows the provider's actual ordered episode list, including season changes. It opens the following episode from the beginning and releases the previous stream first.
- Next is hidden for movies, live TV and the final available episode.
- Saved movie/episode language preferences, public IP/location, home-IP reference and version history.
- Fixed the Android VLC activity-initialization startup race.
- Native emulator checks passed for repeated cold starts, generated MPEG-TS / MP4 playback, remote Back and D-pad/Select next-episode activation.

[Download 0.4.0 TV APK](https://github.com/nhshajib/NodeCast/releases/download/android-v0.4.0/NodeCast-tv-0.4.0.apk) · [Build record](build.json)

Earlier 0.3.x TV builds were development/testing iterations. Use 0.4.0 as the published TV download.

[Shared source history](../src/releases.ts) · [Verification details](../verification/android/README.md)
