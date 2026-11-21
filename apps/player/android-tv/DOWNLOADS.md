# Android TV / Fire TV APK downloads

[← Edition guide](README.md) · [All version history](CHANGELOG.md)

## Current published version: 0.7.4

- [**Direct GitHub download — GlowTV-TV.apk**](https://github.com/nhshajib/NodeCast/releases/download/glowtv-v0.7.4/GlowTV-TV.apk)
- [Release page and version-specific changelog](https://github.com/nhshajib/NodeCast/releases/tag/glowtv-v0.7.4)
- [Checksum file](https://github.com/nhshajib/NodeCast/releases/download/glowtv-v0.7.4/GlowTV-TV.apk.sha256)
- Published: 2026-11-21
- Status: Public testing release
- Size: 240,424,191 bytes (229.3 MiB)
- Minimum OS: Android API 24 or later
- SHA-256: `9d8a6a4cb1a312293fd78f6a7400f688d44a30613590ef4f687b18b862e8150b`

This is a published GlowTV binary.

## Features

- **Made for your remote:** Browse with D-pad, Select and Back on Android TV, Google TV and Fire TV.
- **Your playlists, together:** Connect with Xtream Codes, an M3U link or a local playlist file. Keep multiple profiles on your device.
- **A full TV guide:** Load XMLTV schedules, search programmes and use catch-up when your provider supports it.
- **Movies and series:** Browse your provider’s library, choose seasons and continue with the next episode.
- **A lighter channel library:** Use the default text list, enable grid or logos when you want them, and organize each media library separately.
- **Take your settings with you:** Export and import an encrypted backup of profiles and preferences. Use family controls for protected categories.

## What changed in 0.7.4

- Focused movie and series titles no longer clip at the tile edge.
- Larger labels for update time, connection location and LIVE.
- The guide shows channel logos instead of initials, without a stray scroll indicator.
- Existing playlists, profiles, playback engines and remote navigation are retained.

Install the correct edition over your existing app to retain local profiles. Android does not require weekly signing renewal.

Download metadata comes from public GitHub release assets. Refresh the website metadata, then run `node scripts/sync-download-folders.mjs` from the repository root to update these records. GlowTV is a player only and provides no channels or subscriptions.
