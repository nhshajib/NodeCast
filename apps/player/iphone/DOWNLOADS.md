# iPhone IPA downloads

[← Edition guide](README.md) · [All version history](CHANGELOG.md)

## Current published version: 0.7.4

- [**Direct GitHub download — GlowTV-0.7.4-unsigned.ipa**](https://github.com/nhshajib/NodeCast/releases/download/ios-v0.7.4/GlowTV-0.7.4-unsigned.ipa)
- [Release page and version-specific changelog](https://github.com/nhshajib/NodeCast/releases/tag/ios-v0.7.4)
- [Checksum file](https://github.com/nhshajib/NodeCast/releases/download/ios-v0.7.4/SHA256SUMS.txt)
- Published: 2026-11-21
- Status: Public testing release
- Size: 32,976,590 bytes (31.4 MiB)
- Minimum OS: iOS 16.4 or later
- SHA-256: `269445664effb0bdf2d114ecceca89805953a729251f48f6f23fb6d2efcb8d2d`

This is a published GlowTV binary.

## Features

- **Your playlists, together:** Connect with Xtream Codes, an M3U link or a local playlist file. Keep multiple profiles on your device.
- **A full TV guide:** Load XMLTV schedules, search programmes and use catch-up when your provider supports it.
- **Movies and series:** Browse your provider’s library, choose seasons and continue with the next episode.
- **Favorites and history:** Save channels, resume watching and clear recents without deleting your profiles.
- **Built for iPhone and iPad:** Watch in portrait or landscape. Compatible native playback supports AirPlay and picture-in-picture; availability depends on the stream and engine.
- **Take your settings with you:** Export and import an encrypted backup of profiles and preferences. Use family controls for protected categories.

## What changed in 0.7.4

- A tidier guide: the filter sits beside the day picker, the selected day reads inline, channels show logos and more rows fit.
- An inline show/hide button in the password field.
- Easier-to-read LIVE badges and small labels.
- Existing playlists, profiles, playback engines and transitions are retained.

The IPA is unsigned. Sign it with Impactor and your own Apple account. Free Apple signing normally needs renewal every seven days. Keep the app installed when updating to retain profiles.

Download metadata comes from public GitHub release assets. Refresh the website metadata, then run `node scripts/sync-download-folders.mjs` from the repository root to update these records. GlowTV is a player only and provides no channels or subscriptions.
