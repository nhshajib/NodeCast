# Android phone APK downloads

[← Edition guide](README.md) · [All version history](CHANGELOG.md)

## Current published version: 1.0.2

- [**Direct GitHub download — GlowTV.apk**](https://github.com/nhshajib/NodeCast/releases/download/glowtv-v1.0.2/GlowTV.apk)
- [Release page and version-specific changelog](https://github.com/nhshajib/NodeCast/releases/tag/glowtv-v1.0.2)
- [Checksum file](https://github.com/nhshajib/NodeCast/releases/download/glowtv-v1.0.2/GlowTV.apk.sha256)
- Published: 2026-11-25
- Status: Stable release
- Size: 242,198,297 bytes (231.0 MiB)
- Minimum OS: Android API 24 or later
- SHA-256: `98b3bda440e3bd7deb985d6d03c2866bec0a9504df166e33ed583bb9c5a51fc0`

This is a published GlowTV binary.

## Features

- **Your playlists, together:** Paste your provider’s details to fill the form, or connect with Xtream Codes, an M3U link or a local playlist file. Keep multiple profiles on your device. Pull to refresh Home or a library without leaving the screen.
- **A full TV guide:** Load XMLTV schedules, fix unmatched channels, shift a guide that runs early or late, and use catch-up when your provider supports it.
- **Movies and series:** Browse your provider’s library, choose seasons and continue with the next episode.
- **Your favorites first:** Keep a favorite live channel on Home, pin Live TV categories, build lists and resume recent viewing.
- **Playback, in focus:** Centered transport controls and a bottom timeline keep the picture clear. Audio, subtitles and supported player options stay close.
- **Take your settings with you:** Export and import an encrypted backup of profiles and preferences. Use family controls for protected categories.

## What changed in 1.0.2

- Pull to refresh on Home and library lists, with animated loading placeholders and reduced-motion support.
- Favorite Live TV categories stay at the start of the category list, separately for each playlist, and transfer with encrypted backups.
- Home features an available favorite live channel; without one, it shows a greeting.
- Centered playback controls, a bottom timeline and quieter actions preserve the existing player engines.
- Public-IP/connection screens and lookups removed; older settings and backups remain readable.
- Four-second portrait and landscape launch films, with decoded-frame handoff and still-image fallbacks.

Install the correct edition over your existing app to retain local profiles. Android does not require weekly signing renewal.

Download metadata comes from public GitHub release assets. Refresh the website metadata, then run `node scripts/sync-download-folders.mjs` from the repository root to update these records. GlowTV is a player only and provides no channels or subscriptions.
