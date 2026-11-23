# Android TV / Fire TV APK downloads

[← Edition guide](README.md) · [All version history](CHANGELOG.md)

## Current published version: 1.0.0

- [**Direct GitHub download — GlowTV-TV.apk**](https://github.com/nhshajib/NodeCast/releases/download/glowtv-v1.0.0/GlowTV-TV.apk)
- [Release page and version-specific changelog](https://github.com/nhshajib/NodeCast/releases/tag/glowtv-v1.0.0)
- [Checksum file](https://github.com/nhshajib/NodeCast/releases/download/glowtv-v1.0.0/GlowTV-TV.apk.sha256)
- Published: 2026-11-23
- Status: Stable release
- Size: 240,142,894 bytes (229.0 MiB)
- Minimum OS: Android API 24 or later
- SHA-256: `b0862108274bc05e0e04f12b152eaede43fef778a731713f58681cb14b1d3f4c`

This is a published GlowTV binary.

## Features

- **Made for your remote:** Browse with D-pad, Select and Back on Android TV, Google TV and Fire TV.
- **Your playlists, together:** Paste your provider’s details to fill the form, or connect with Xtream Codes, an M3U link or a local playlist file. Keep multiple profiles on your device.
- **A full TV guide:** Load XMLTV schedules, fix unmatched channels, shift a guide that runs early or late, and use catch-up when your provider supports it.
- **Movies and series:** Browse your provider’s library, choose seasons and continue with the next episode.
- **A lighter channel library:** Use the default text list, enable grid or logos when you want them, and organize each media library separately.
- **Take your settings with you:** Export and import an encrypted backup of profiles and preferences. Use family controls for protected categories.

## What changed in 1.0.0

- Faster, ranked search: exact names first, then names that start with what you typed.
- Your own lists, hidden titles, and series shown latest-first or unwatched-only, with autoplay of the next episode.
- Guide repair: suggested channel matches, a health summary, per-guide time offsets and recent history.
- Previous channel, return to live, and audio and subtitles that follow your preferred language.
- Paste your provider details to set up in seconds. Backups now carry lists and new preferences, and import lets you add or update.
- Library options open with focus on the current choice, so every option is reachable with the remote.
- Existing playlists, profiles, signing and identifiers are retained; 0.7.x backups still import.

Install the correct edition over your existing app to retain local profiles. Android does not require weekly signing renewal.

Download metadata comes from public GitHub release assets. Refresh the website metadata, then run `node scripts/sync-download-folders.mjs` from the repository root to update these records. GlowTV is a player only and provides no channels or subscriptions.
