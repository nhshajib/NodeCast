# Android TV version history

[← TV download & installation](README.md) · [All editions](../CHANGELOG.md)

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
