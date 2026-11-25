# Android mobile version history

## 1.0.2 · 2026-11-25 · Stable release

- Pull to refresh on Home and library lists, with animated loading placeholders and reduced-motion support.
- Favorite Live TV categories stay at the start of the category list, separately for each playlist, and transfer with encrypted backups.
- Home features an available favorite live channel; without one, it shows a greeting.
- Centered playback controls, a bottom timeline and quieter actions preserve the existing player engines.
- Public-IP/connection screens and lookups removed; older settings and backups remain readable.
- Four-second portrait and landscape launch films, with decoded-frame handoff and still-image fallbacks.

[Verified release and checksums](https://github.com/nhshajib/NodeCast/releases/tag/glowtv-v1.0.2)


## 0.7.3 — November 19, 2026 · Accessibility and navigation

- Fixed native startup on Hermes runtimes without Intl.PluralRules.
- Fixed native header spacing and programme-sheet title overlap on iOS.
- TV preserves grid layout when the rail expands and restores focus when entering content; modern Android Back reaches app handlers.

- Responsive iPad layouts and tablet orientation policy, clearer guide text and accessible forms.
- Visible TV focus, restored channel position, consistent Back behavior and remote playback controls.
- Confirmations, undo for recent items, accessible status messages and clearer loading states.
- Mini-player placement measures native interface insets instead of assuming a fixed tab-bar height.
- Existing identifiers, signing identity, profiles, playback engines and transition settings are retained.
- Native build and device verification results are recorded separately; source changes alone do not verify physical hardware.


## 0.7.2 — November 19, 2026 · UI audit

- Consistent Lucide icons with clear saved/unsaved favorite states.
- An 8px layout grid, including player controls, track menus, TV switches, guide cells and floating labels, and three UI color families: primary green, neutral and semantic red.
- Removed generic icon backplates, passive information cards and duplicate navigation; playable items and actionable settings retain cards.
- Clearer Home hierarchy and less promotional/support clutter. Every existing destination and feature remains available.
- Correct dark/light appearance changes for retained movie cards and media rows.
- Existing transitions, animations, provider/storage models and JS player lifecycle effects retained.
- Android native VLC now ignores unchanged picture-in-picture props, preventing unnecessary decoder recreation during UI updates.
- Native release builds and screen audits passed. Physical-device/provider compatibility remains a separate check.

- Compact movie/series metadata keeps the first poster title above navigation on small phones.

[← Mobile download & installation](README.md) · [All editions](../../../CHANGELOG.md)

## 0.7.0 · November 18, 2026 · Public testing release

- GlowTV display name, launcher icons, Inter typography and leaf-green styling.
- Dark Android surfaces, native navigation and playlist sheet; Back works after reopening.
- Duplicate VLC source/options updates retain the decoder during playback.
- Existing app IDs, signing certificates, local profiles and backups are retained.
- Verified release APK on Android API 35: eight screens, eight settings destinations and decoded video. Six touch pause/resume cycles passed in the same process. Physical-device/provider testing remains separate.
- [Direct download, requirements and checksum](DOWNLOADS.md).

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

[Feature details and limits](../../../verification/roadmap/README.md). Chromecast, multiview, QR/portal pairing, cloud sync, DVR and downloads remain future work.


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

[Shared source history](../src/releases.ts) · [Verification details](../../../verification/android/README.md)
