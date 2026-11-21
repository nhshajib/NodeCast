# Android phone APK downloads

[← Edition guide](README.md) · [All version history](CHANGELOG.md)

## Current published version: 0.7.3

- [**Direct GitHub download — GlowTV.apk**](https://github.com/nhshajib/NodeCast/releases/download/glowtv-android-v0.7.3/GlowTV.apk)
- [Release page and version-specific changelog](https://github.com/nhshajib/NodeCast/releases/tag/glowtv-android-v0.7.3)
- [Checksum file](https://github.com/nhshajib/NodeCast/releases/download/glowtv-android-v0.7.3/GlowTV.apk.sha256)
- Published: 2026-11-21
- Status: Public testing release
- Size: 241,943,349 bytes (230.7 MiB)
- Minimum OS: Android API 24 or later
- SHA-256: `e7c6a45ab5fbda88d4009555adb403ea348f72defb21363f63b95474a58366a7`

This is a published GlowTV binary.

## Features

- **Your playlists, together:** Connect with Xtream Codes, an M3U link or a local playlist file. Keep multiple profiles on your device.
- **A full TV guide:** Load XMLTV schedules, search programmes and use catch-up when your provider supports it.
- **Movies and series:** Browse your provider’s library, choose seasons and continue with the next episode.
- **Favorites and history:** Save channels, resume watching and clear recents without deleting your profiles.
- **Playback your way:** Adjust playback over the video, choose supported player options and set a sleep timer.
- **Take your settings with you:** Export and import an encrypted backup of profiles and preferences. Use family controls for protected categories.

## What changed in 0.7.3

- Native startup handles devices whose JavaScript runtime omits plural-rule support.
- Clearer control states, accessible messages and confirmations for destructive actions.
- Responsive tablet layouts, readable text and improved guide navigation.
- Five focused library tabs, native sheets and measured mini-player placement above navigation.
- Existing playlists, profiles, playback engines and transitions are retained.

Install the correct edition over your existing app to retain local profiles. Android does not require weekly signing renewal.

Download metadata comes from public GitHub release assets. Refresh the website metadata, then run `node scripts/sync-download-folders.mjs` from the repository root to update these records. GlowTV is a player only and provides no channels or subscriptions.
