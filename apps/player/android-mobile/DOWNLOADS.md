# Android phone APK downloads

[← Edition guide](README.md) · [All version history](CHANGELOG.md)

## Current published version: 0.6.7

- [**Direct GitHub download — NodeCast-mobile-0.6.7.apk**](https://github.com/nhshajib/NodeCast/releases/download/android-v0.6.7/NodeCast-mobile-0.6.7.apk)
- [Release page and version-specific changelog](https://github.com/nhshajib/NodeCast/releases/tag/android-v0.6.7)
- [Checksum file](https://github.com/nhshajib/NodeCast/releases/download/android-v0.6.7/NodeCast-mobile-0.6.7.apk.sha256)
- Published: 2026-10-31
- Status: Public testing release
- Size: 225,135,495 bytes (214.7 MiB)
- Minimum OS: Android 7.0 (API 24)
- SHA-256: `f90a857ded82542b2efc56173b957702cd4fcc11610e8a73374d5f457d8b4554`

This is the existing NodeCast binary. The upcoming GlowTV design is not included, and no file has been renamed or republished.

## Features

- **Your playlists, together:** Connect with Xtream Codes, an M3U link or a local playlist file. Keep multiple profiles on your device.
- **A full TV guide:** Load XMLTV schedules, search programmes and use catch-up when your provider supports it.
- **Movies and series:** Browse your provider’s library, choose seasons and continue with the next episode.
- **Favorites and history:** Save channels, resume watching and clear recents without deleting your profiles.
- **Playback your way:** Adjust playback over the video, choose supported player options and set a sleep timer.
- **Take your settings with you:** Export and import an encrypted backup of profiles and preferences. Use family controls for protected categories.

## What changed in 0.6.7

- Compact playback settings stay over the video instead of opening a separate page.
- Playing controls hide after four idle seconds; settings dismiss after eight while keeping unsaved edits and accessibility needs in mind.
- Portrait and landscape playback share the same controls; local profiles and settings are retained.

Install the correct edition over your existing app to retain local profiles. Android does not require weekly signing renewal.

Download metadata comes from public GitHub release assets. Refresh the website metadata, then run `node scripts/sync-download-folders.mjs` from the repository root to update these records. GlowTV is a player only and provides no channels or subscriptions.
