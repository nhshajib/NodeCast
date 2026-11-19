# GlowTV 0.7.2 — a calmer, clearer interface

[Download Android phone APK](https://github.com/nhshajib/NodeCast/releases/download/glowtv-android-v0.7.2/GlowTV.apk) · [Download TV APK](https://github.com/nhshajib/NodeCast/releases/download/glowtv-android-v0.7.2/GlowTV-TV.apk) · [Release and checksums](https://github.com/nhshajib/NodeCast/releases/tag/glowtv-android-v0.7.2)

- Consistent Lucide icons, including clear filled/outline favorite states and local native-tab assets.
- An 8px layout grid; primary green, neutral and semantic-red color families, with theme-safe surfaces.
- Bare settings/empty-state icons, plain information sections and fewer repeated Home/settings links.
- Clearer playback, playlist and library selection controls; existing native navigation and animations retained.
- Unchanged picture-in-picture props no longer schedule native decoder recreation during UI updates.
- Android poster libraries keep the first title visible on short screens with a compact metadata header.
- TV row and grid measurements remain aligned with the revised spacing for remote navigation and virtualization.

Existing profiles, playlists, favorites, guide settings, encrypted backups, application identifiers, signing identity and player engines are retained. Install over the matching existing edition to keep local data. Both APKs include JavaScript and VLC; Expo Go and a running computer are not needed while watching.

See the [screen-by-screen audit and before/after code](https://github.com/nhshajib/NodeCast/blob/main/docs/UI-UX-AUDIT-0.7.2.md), [design tokens](https://github.com/nhshajib/NodeCast/blob/main/apps/player/src/designTokens.ts) and each edition's `DOWNLOADS.md` for exact requirements, file size and SHA-256. Companion checksum files and release-metadata.json describe these exact builds.

These are public testing APKs using the existing Android test signing identity. Native emulator checks are separate from physical Fire TV/phone and provider-specific playback testing. Store publication is pending. GlowTV is a player only and provides no channels, playlists, content or subscriptions.
