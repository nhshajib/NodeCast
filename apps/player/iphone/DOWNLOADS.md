# iPhone IPA downloads

[← Edition guide](README.md) · [All version history](CHANGELOG.md)

## Current published version: 0.7.3

- [**Direct GitHub download — GlowTV-0.7.3-unsigned.ipa**](https://github.com/nhshajib/NodeCast/releases/download/ios-v0.7.3/GlowTV-0.7.3-unsigned.ipa)
- [Release page and version-specific changelog](https://github.com/nhshajib/NodeCast/releases/tag/ios-v0.7.3)
- [Checksum file](https://github.com/nhshajib/NodeCast/releases/download/ios-v0.7.3/SHA256SUMS.txt)
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

## What changed in 0.7.3

- Native startup handles devices whose JavaScript runtime omits plural-rule support.
- Clearer control states, accessible messages and confirmations for destructive actions.
- Responsive tablet layouts, readable text and improved guide navigation.
- Fixed controls respect the native header, search bar and adaptive tab-bar insets.
- Five focused library tabs, native sheets and measured mini-player placement above navigation.
- Existing playlists, profiles, playback engines and transitions are retained.

The IPA is unsigned. Sign it with Impactor and your own Apple account. Free Apple signing normally needs renewal every seven days. Keep the app installed when updating to retain profiles.

Download metadata comes from public GitHub release assets. Refresh the website metadata, then run `node scripts/sync-download-folders.mjs` from the repository root to update these records. GlowTV is a player only and provides no channels or subscriptions.
