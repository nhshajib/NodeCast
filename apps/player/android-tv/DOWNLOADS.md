# Android TV / Fire TV APK downloads

[← Edition guide](README.md) · [All version history](CHANGELOG.md)

## Current published version: 1.0.2

- [**Direct GitHub download — GlowTV-TV.apk**](https://github.com/nhshajib/NodeCast/releases/download/glowtv-v1.0.2/GlowTV-TV.apk)
- [Release page and version-specific changelog](https://github.com/nhshajib/NodeCast/releases/tag/glowtv-v1.0.2)
- [Checksum file](https://github.com/nhshajib/NodeCast/releases/download/glowtv-v1.0.2/GlowTV-TV.apk.sha256)
- Published: 2026-11-25
- Status: Stable release
- Size: 240,646,927 bytes (229.5 MiB)
- Minimum OS: Android API 24 or later
- SHA-256: `9617f1f4ff2e30e2f23b9d641210002940c264bc416a3121ea7ddd1b19a5ee26`

This is a published GlowTV binary.

## Features

- **Made for your remote:** Browse with D-pad, Select and Back on Android TV, Google TV and Fire TV.
- **Your playlists, together:** Paste your provider’s details to fill the form, or connect with Xtream Codes, an M3U link or a local playlist file. Keep multiple profiles on your device.
- **A full TV guide:** Load XMLTV schedules, fix unmatched channels, shift a guide that runs early or late, and use catch-up when your provider supports it.
- **Movies and series:** Browse your provider’s library, choose seasons and continue with the next episode.
- **A lighter channel library:** Keep favorite Live TV categories first. Use a text list, enable logos or a grid, and hold OK or press Menu on a category to pin it.
- **Take your settings with you:** Export and import an encrypted backup of profiles and preferences. Use family controls for protected categories.

## What changed in 1.0.2

- Animated loading placeholders respect reduced motion; refresh stays available through the remote toolbar.
- Favorite Live TV categories stay at the start of the category list, separately for each playlist, and transfer with encrypted backups.
- Home features an available favorite live channel; without one, it shows a greeting.
- Centered playback controls, a bottom timeline and quieter actions preserve the existing player engines.
- Public-IP/connection screens and lookups removed; older settings and backups remain readable.
- Four-second portrait and landscape launch films, with decoded-frame handoff and still-image fallbacks.

Install the correct edition over your existing app to retain local profiles. Android does not require weekly signing renewal.

Download metadata comes from public GitHub release assets. Refresh the website metadata, then run `node scripts/sync-download-folders.mjs` from the repository root to update these records. GlowTV is a player only and provides no channels or subscriptions.
