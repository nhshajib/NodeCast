# Android phone APK downloads

[← Edition guide](README.md) · [All version history](CHANGELOG.md)

## Current published version: 0.7.0

- [**Direct GitHub download — GlowTV.apk**](https://github.com/nhshajib/NodeCast/releases/download/glowtv-android-v0.7.0/GlowTV.apk)
- [Release page and version-specific changelog](https://github.com/nhshajib/NodeCast/releases/tag/glowtv-android-v0.7.0)
- [Checksum file](https://github.com/nhshajib/NodeCast/releases/download/glowtv-android-v0.7.0/GlowTV.apk.sha256)
- Published: 2026-11-18
- Status: Public testing release
- Size: 239,769,045 bytes (228.7 MiB)
- Minimum OS: Android API 24 or later
- SHA-256: `331515e2f6b4ca48aaa38d0ece827eeab7f9d1175c9afcf90e87f4f2203cd62c`

This is a published GlowTV binary.

## Features

- **Your playlists, together:** Connect with Xtream Codes, an M3U link or a local playlist file. Keep multiple profiles on your device.
- **A full TV guide:** Load XMLTV schedules, search programmes and use catch-up when your provider supports it.
- **Movies and series:** Browse your provider’s library, choose seasons and continue with the next episode.
- **Favorites and history:** Save channels, resume watching and clear recents without deleting your profiles.
- **Playback your way:** Adjust playback over the video, choose supported player options and set a sleep timer.
- **Take your settings with you:** Export and import an encrypted backup of profiles and preferences. Use family controls for protected categories.

## What changed in 0.7.0

- GlowTV branding, launcher icons, Inter typography and a leaf-green design system.
- Dark Android surfaces, native pill navigation, checked filters and an Add playlist sheet.
- Fixed Android 13–15 Back navigation from details and settings, including after reopening the app.
- Repeated identical player updates keep the existing VLC decoder alive instead of restarting playback.

Install the correct edition over your existing app to retain local profiles. Android does not require weekly signing renewal.

Download metadata comes from public GitHub release assets. Refresh the website metadata, then run `node scripts/sync-download-folders.mjs` from the repository root to update these records. GlowTV is a player only and provides no channels or subscriptions.
