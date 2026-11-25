# iPhone IPA downloads

[← Edition guide](README.md) · [All version history](CHANGELOG.md)

## Current published version: 1.0.1

- [**Direct GitHub download — GlowTV-1.0.1-unsigned.ipa**](https://github.com/nhshajib/NodeCast/releases/download/ios-v1.0.1/GlowTV-1.0.1-unsigned.ipa)
- [Release page and version-specific changelog](https://github.com/nhshajib/NodeCast/releases/tag/ios-v1.0.1)
- [Checksum file](https://github.com/nhshajib/NodeCast/releases/download/ios-v1.0.1/SHA256SUMS.txt)
- Published: 2026-11-23
- Status: Stable release
- Size: 32,547,539 bytes (31.0 MiB)
- Minimum OS: iOS 16.4 or later
- SHA-256: `7682eb70b98194f52b98ad016e6f51d26ecbdca4f2216fe8edee395ba4d14f2a`

This is a published GlowTV binary.

## Features

- **Your playlists, together:** Paste your provider’s details to fill the form, or connect with Xtream Codes, an M3U link or a local playlist file. Keep multiple profiles on your device.
- **A full TV guide:** Load XMLTV schedules, fix unmatched channels, shift a guide that runs early or late, and use catch-up when your provider supports it.
- **Movies and series:** Browse your provider’s library, choose seasons and continue with the next episode.
- **Favorites, lists and history:** Save channels, build your own lists, hide titles you never watch and resume where you left off.
- **Built for iPhone and iPad:** Watch in portrait or landscape. Compatible native playback supports AirPlay and picture-in-picture; availability depends on the stream and engine.
- **Take your settings with you:** Export and import an encrypted backup of profiles and preferences. Use family controls for protected categories.

## What changed in 1.0.1

- Streams that never start show a clear card with Retry, Try other player and Next channel, instead of spinning forever.
- Channels listed under several categories now appear in each of them, and empty categories read "Other".
- Clearer messages for missing streams (404) and region-blocked channels.
- Existing playlists, profiles, signing and identifiers are retained.

The IPA is unsigned. Sign it with Impactor and your own Apple account. Free Apple signing normally needs renewal every seven days. Keep the app installed when updating to retain profiles.

Download metadata comes from public GitHub release assets. Refresh the website metadata, then run `node scripts/sync-download-folders.mjs` from the repository root to update these records. GlowTV is a player only and provides no channels or subscriptions.
