# iPhone IPA downloads

[← Edition guide](README.md) · [All version history](CHANGELOG.md)

## Current published version: 0.6.7

- [**Direct GitHub download — NodeCast-0.6.7-unsigned.ipa**](https://github.com/nhshajib/NodeCast/releases/download/ios-v0.6.7/NodeCast-0.6.7-unsigned.ipa)
- [Release page and version-specific changelog](https://github.com/nhshajib/NodeCast/releases/tag/ios-v0.6.7)
- [Checksum file](https://github.com/nhshajib/NodeCast/releases/download/ios-v0.6.7/SHA256SUMS.txt)
- Published: 2026-10-31
- Status: Public testing release
- Size: 35,754,931 bytes (34.1 MiB)
- Minimum OS: not listed in the published release
- SHA-256: `f6829d2ce28114429c730ae35eb8cf1d27fb2f19237f42f672ed068aa87f5a30`

This is the existing NodeCast binary. The upcoming GlowTV design is not included, and no file has been renamed or republished.

## Features

- **Your playlists, together:** Connect with Xtream Codes, an M3U link or a local playlist file. Keep multiple profiles on your device.
- **A full TV guide:** Load XMLTV schedules, search programmes and use catch-up when your provider supports it.
- **Movies and series:** Browse your provider’s library, choose seasons and continue with the next episode.
- **Favorites and history:** Save channels, resume watching and clear recents without deleting your profiles.
- **Built for iPhone and iPad:** Watch in portrait or landscape. Compatible native playback supports AirPlay and picture-in-picture; availability depends on the stream and engine.
- **Take your settings with you:** Export and import an encrypted backup of profiles and preferences. Use family controls for protected categories.

## What changed in 0.6.7

- Compact playback settings stay over the video instead of opening a separate page.
- Playing controls hide after four idle seconds; settings dismiss after eight while keeping unsaved edits and accessibility needs in mind.
- Portrait and landscape playback share the same controls and touch seek timeline.

The IPA is unsigned. Sign it with Impactor and your own Apple account. Free Apple signing normally needs renewal every seven days. Keep the app installed when updating to retain profiles.

Download metadata comes from public GitHub release assets. Refresh the website metadata, then run `node scripts/sync-download-folders.mjs` from the repository root to update these records. GlowTV is a player only and provides no channels or subscriptions.
