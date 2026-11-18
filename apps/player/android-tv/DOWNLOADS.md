# Android TV / Fire TV APK downloads

[← Edition guide](README.md) · [All version history](CHANGELOG.md)

## Current published version: 0.7.0

- [**Direct GitHub download — GlowTV-TV.apk**](https://github.com/nhshajib/NodeCast/releases/download/glowtv-android-v0.7.0/GlowTV-TV.apk)
- [Release page and version-specific changelog](https://github.com/nhshajib/NodeCast/releases/tag/glowtv-android-v0.7.0)
- [Checksum file](https://github.com/nhshajib/NodeCast/releases/download/glowtv-android-v0.7.0/GlowTV-TV.apk.sha256)
- Published: 2026-11-18
- Status: Public testing release
- Size: 238,272,181 bytes (227.2 MiB)
- Minimum OS: Android API 24 or later
- SHA-256: `cd3c462569622763ad72e973f04e864355b58339f4bb157b7224ed1692cf1492`

This is a published GlowTV binary.

## Features

- **Made for your remote:** Browse with D-pad, Select and Back on Android TV, Google TV and Fire TV.
- **Your playlists, together:** Connect with Xtream Codes, an M3U link or a local playlist file. Keep multiple profiles on your device.
- **A full TV guide:** Load XMLTV schedules, search programmes and use catch-up when your provider supports it.
- **Movies and series:** Browse your provider’s library, choose seasons and continue with the next episode.
- **A lighter channel library:** Use the default text list, enable grid or logos when you want them, and organize each media library separately.
- **Take your settings with you:** Export and import an encrypted backup of profiles and preferences. Use family controls for protected categories.

## What changed in 0.7.0

- GlowTV branding, launcher icons, Inter typography and a leaf-green design system.
- A dedicated TV icon rail, featured live-channel Home and compact guide with remote focus.
- Existing playlists, profiles, playback engines, backups and transition settings remain compatible.
- Repeated identical player updates keep the existing VLC decoder alive instead of restarting playback.

Install the correct edition over your existing app to retain local profiles. Android does not require weekly signing renewal.

Download metadata comes from public GitHub release assets. Refresh the website metadata, then run `node scripts/sync-download-folders.mjs` from the repository root to update these records. GlowTV is a player only and provides no channels or subscriptions.
