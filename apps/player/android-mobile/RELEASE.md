# GlowTV 0.7.0 — Android phone and TV

GlowTV has a new name, supplied launcher artwork, leaf-green styling and Inter typography. Android phones use dark surfaces, native navigation, checked filters and an Add playlist sheet. Android TV and Fire TV have a dedicated icon rail, featured live Home, compact guide and D-pad focus.

- [Android phone and tablet APK](https://github.com/nhshajib/NodeCast/releases/download/glowtv-android-v0.7.0/GlowTV.apk)
- [Android TV and Fire TV APK](https://github.com/nhshajib/NodeCast/releases/download/glowtv-android-v0.7.0/GlowTV-TV.apk)
- [Checksums and exact release metadata](https://github.com/nhshajib/NodeCast/releases/tag/glowtv-android-v0.7.0)

Back navigation works after reopening the Android phone app. Identical source/options updates no longer restart VLC. Phone pause/resume passed six touch cycles in the same process with decoded video present. Both exact APKs passed eight-screen and eight-settings audits on Android API 35; TV used remote input only. Physical-device and provider-specific playback remain separate checks.

Existing application IDs, signing identity, profiles, playlists, favorites and encrypted backups are retained. Install over the matching existing edition to keep your local data. Playback settings remain over the video, and both APKs include their JavaScript and VLC: Expo Go and a running computer are not required.

These are public testing APKs using the existing Android test signing identity, not store releases. Android does not require weekly signing renewal. GlowTV is a player only and provides no channels, playlists, content or subscriptions.

[Phone setup](README.md) · [TV setup](../android-tv/README.md) · [Version history](../../../CHANGELOG.md)
