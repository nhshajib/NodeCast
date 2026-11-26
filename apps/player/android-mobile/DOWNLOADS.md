# Android phone APK downloads

[← Edition guide](README.md) · [All version history](CHANGELOG.md)

## Current published version: 1.0.3

- [**Direct GitHub download — GlowTV.apk**](https://github.com/nhshajib/NodeCast/releases/download/android-v1.0.3/GlowTV.apk)
- [Release page and version-specific changelog](https://github.com/nhshajib/NodeCast/releases/tag/android-v1.0.3)
- [Checksum file](https://github.com/nhshajib/NodeCast/releases/download/android-v1.0.3/GlowTV.apk.sha256)
- Published: 2026-11-26
- Status: Stable release
- Size: 242,149,257 bytes (230.9 MiB)
- Minimum OS: Android API 24 or later
- SHA-256: `2ef3ca5349b84c4b4a69676ac3e7a1add0121fc2ddc119e8579e98ce257bee49`

This is a published GlowTV binary.

## Features

- **Your playlists, together:** Paste your provider’s details to fill the form, or connect with Xtream Codes, an M3U link or a local playlist file. Keep multiple profiles on your device. Pull to refresh Home or a library without leaving the screen.
- **A full TV guide:** Load XMLTV schedules, fix unmatched channels, shift a guide that runs early or late, and use catch-up when your provider supports it.
- **Movies and series:** Browse your provider’s library, choose seasons and continue with the next episode.
- **Your favorites first:** Keep a favorite live channel on Home, pin Live TV categories, build lists and resume recent viewing.
- **Playback, in focus:** Centered transport controls and a bottom timeline keep the picture clear. Audio, subtitles and supported player options stay close.
- **Take your settings with you:** Export and import an encrypted backup of profiles and preferences. Use family controls for protected categories.

## What changed in 1.0.3

- The old native splash logo is removed. GlowTV’s launch film starts after the system handoff, while fonts load alongside it.
- Previous and Next channel controls are visible during normal playback on both native and VLC players.
- VLC uses a quieter header, centered transport and bottom audio, player and fullscreen actions.
- Prepared search data is reused between queries, with fewer catalogue rebuilds for recent channels.
- Existing playlists, favorites, signing, backups and playback engines are retained.

Install the correct edition over your existing app to retain local profiles. Android does not require weekly signing renewal.

Download metadata comes from public GitHub release assets. Refresh the website metadata, then run `node scripts/sync-download-folders.mjs` from the repository root to update these records. GlowTV is a player only and provides no channels or subscriptions.
