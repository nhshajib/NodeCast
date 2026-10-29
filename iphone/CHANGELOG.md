# iPhone version history

[← iPhone download & installation](README.md) · [All editions](../CHANGELOG.md)

## 0.6.1 · October 28, 2026 · Current download

- Rebuilt the unsigned iPhone IPA from the current source and replaced the 0.6.0 download.
- Install over the existing app with the same Apple account to keep local profiles.
- PiP and AirPlay still need confirmation on a physical iPhone.

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

- Verified physical-iPhone arm64 build, embedded JavaScript/VLC, archive integrity and SHA-256; physical-phone playback remains to be tested.
- Explicit search scopes and category retention, with profile-specific browsing context.
- Per-channel player, engine and live-format choices; redacted player information.
- Seasons, watched marks and Continue series; Next episode on mobile and TV.
- Remembered VLC track choices and clearer unavailable-language feedback.
- Local profiles remain account-free. Install over the existing app with the same signing identity.


## 0.3.0 · October 26, 2026

- Short tab transitions with a sliding lavender indicator and immediate press feedback.
- Visited tabs stay mounted, preserving Home / Settings scroll positions.
- Library and Favorites keep independent search and category selections.
- Cached library indexes reduce repeat work during navigation.
- Settings retain content through dismissal; Reduce Motion removes navigation movement.
- Inactive Home stops IP-check timers/listeners and refreshes when revisited.

[Download 0.3.0 IPA](https://github.com/nhshajib/NodeCast/releases/download/ios-v0.3.0/NodeCast-0.3.0-unsigned.ipa) · [Build record](build.json)

## 0.2.9 · October 26, 2026

- Animated NodeCast intro with brand mark, signal rings and cream wordmark.
- Launch handoff waits for the intro's first frame and local profiles, without waiting for provider/IP services.
- Reduced-motion introduction and delayed setup prompts.

## 0.2.8 · October 26, 2026

- Live video moved outside scrolling content to prevent fullscreen offsets and clipped edges.
- Controls overlay the fullscreen picture, with the same native player kept mounted through rotation.

## 0.2.7 · October 26, 2026

- Fullscreen landscape live playback, native launch artwork and app icon.
- Optional home-IP setup with explicit VPN-off confirmation.
- Clearer M3U HTTP 404 guidance, playlist parsing and request-header support.
- Optional Buy me a coffee support; the app remains free.

## Earlier foundations

Local profiles, search/favorites, viewing progress, playback settings, embedded VLC and personal-sideloading builds. See the in-app **Settings → Version history** and [archived source milestones](../docs/CHANGELOG-ARCHIVE.md) for the longer source history.
