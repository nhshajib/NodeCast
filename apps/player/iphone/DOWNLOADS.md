# iPhone IPA downloads

[← Edition guide](README.md) · [All version history](CHANGELOG.md)

## Current published version: 1.0.0

- [**Direct GitHub download — GlowTV-1.0.0-unsigned.ipa**](https://github.com/nhshajib/NodeCast/releases/download/ios-v1.0.0/GlowTV-1.0.0-unsigned.ipa)
- [Release page and version-specific changelog](https://github.com/nhshajib/NodeCast/releases/tag/ios-v1.0.0)
- [Checksum file](https://github.com/nhshajib/NodeCast/releases/download/ios-v1.0.0/SHA256SUMS.txt)
- Published: 2026-11-23
- Status: Stable release
- Size: 32,540,598 bytes (31.0 MiB)
- Minimum OS: iOS 16.4 or later
- SHA-256: `f06a445a6b23bac10eb089ecc55c5df38c96b7b6cbdcaa422e9277f09a99a011`

This is a published GlowTV binary.

## Features

- **Your playlists, together:** Paste your provider’s details to fill the form, or connect with Xtream Codes, an M3U link or a local playlist file. Keep multiple profiles on your device.
- **A full TV guide:** Load XMLTV schedules, fix unmatched channels, shift a guide that runs early or late, and use catch-up when your provider supports it.
- **Movies and series:** Browse your provider’s library, choose seasons and continue with the next episode.
- **Favorites, lists and history:** Save channels, build your own lists, hide titles you never watch and resume where you left off.
- **Built for iPhone and iPad:** Watch in portrait or landscape. Compatible native playback supports AirPlay and picture-in-picture; availability depends on the stream and engine.
- **Take your settings with you:** Export and import an encrypted backup of profiles and preferences. Use family controls for protected categories.

## What changed in 1.0.0

- Faster, ranked search: exact names first, then names that start with what you typed.
- Your own lists, hidden titles, and series shown latest-first or unwatched-only, with autoplay of the next episode.
- Guide repair: suggested channel matches, a health summary, per-guide time offsets and recent history.
- Previous channel, return to live, and audio and subtitles that follow your preferred language.
- Paste your provider details to set up in seconds. Backups now carry lists and new preferences, and import lets you add or update.
- Native navigation, sheets and press feedback across the app.
- Existing playlists, profiles, signing and identifiers are retained; 0.7.x backups still import.

The IPA is unsigned. Sign it with Impactor and your own Apple account. Free Apple signing normally needs renewal every seven days. Keep the app installed when updating to retain profiles.

Download metadata comes from public GitHub release assets. Refresh the website metadata, then run `node scripts/sync-download-folders.mjs` from the repository root to update these records. GlowTV is a player only and provides no channels or subscriptions.
