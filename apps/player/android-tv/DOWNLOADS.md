# Android TV / Fire TV APK downloads

[← Edition guide](README.md) · [All version history](CHANGELOG.md)

## Current published version: 0.6.7

- [**Direct GitHub download — NodeCast-tv-0.6.7.apk**](https://github.com/nhshajib/NodeCast/releases/download/android-v0.6.7/NodeCast-tv-0.6.7.apk)
- [Release page and version-specific changelog](https://github.com/nhshajib/NodeCast/releases/tag/android-v0.6.7)
- [Checksum file](https://github.com/nhshajib/NodeCast/releases/download/android-v0.6.7/NodeCast-tv-0.6.7.apk.sha256)
- Published: 2026-10-31
- Status: Public testing release
- Size: 223,769,039 bytes (213.4 MiB)
- Minimum OS: Android 7.0 (API 24)
- SHA-256: `6a3dcbcd6c9b3c42ee4a236006ad8f142785dc41957e91b926aae0bf8513ee01`

This is the existing NodeCast binary. The upcoming GlowTV design is not included, and no file has been renamed or republished.

## Features

- **Made for your remote:** Browse with D-pad, Select and Back on Android TV, Google TV and Fire TV.
- **Your playlists, together:** Connect with Xtream Codes, an M3U link or a local playlist file. Keep multiple profiles on your device.
- **A full TV guide:** Load XMLTV schedules, search programmes and use catch-up when your provider supports it.
- **Movies and series:** Browse your provider’s library, choose seasons and continue with the next episode.
- **A lighter channel library:** Use the default text list, enable grid or logos when you want them, and organize each media library separately.
- **Take your settings with you:** Export and import an encrypted backup of profiles and preferences. Use family controls for protected categories.

## What changed in 0.6.7

- Compact playback settings stay over the video instead of opening a separate page.
- Playing controls hide after four idle seconds; settings dismiss after eight while keeping unsaved edits and accessibility needs in mind.
- A lightweight channel list, optional grid/logos and cached category/favorite restoration after restart.

Install the correct edition over your existing app to retain local profiles. Android does not require weekly signing renewal.

Download metadata comes from public GitHub release assets. Refresh the website metadata, then run `node scripts/sync-download-folders.mjs` from the repository root to update these records. GlowTV is a player only and provides no channels or subscriptions.
