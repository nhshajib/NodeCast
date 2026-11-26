# GlowTV 1.0.3 · Android mobile · build 10004

[Stable mobile release](https://github.com/nhshajib/NodeCast/releases/tag/android-v1.0.3) · [Direct APK](https://github.com/nhshajib/NodeCast/releases/download/android-v1.0.3/GlowTV.apk)

- Removed the old native splash logo; the supplied film starts after handoff while fonts load alongside it.
- Visible Previous/Next channel controls on native and VLC playback, a quiet header and bottom player actions.
- Prepared search data and a single recent-channel lookup reduce repeated catalogue work.
- Android API 24 or later; identifiers, private signing identity, profiles and backups retained.

242,149,257 bytes. SHA-256: `2ef3ca5349b84c4b4a69676ac3e7a1add0121fc2ddc119e8579e98ce257bee49`.

Verified [native screens/playback](https://github.com/nhshajib/NodeCast/actions/runs/45723583990), [full features/backup](https://github.com/nhshajib/NodeCast/actions/runs/45722739853) and [publication](https://github.com/nhshajib/NodeCast/actions/runs/45725139671). Physical-device checks were skipped by owner decision. TV and Apple downloads will be updated separately after their own checks.

## Earlier 1.0.2 notes

GlowTV 1.0.2 · build 10003, for Android phones/tablets and Android TV, Google TV and Fire TV.

- Pull to refresh Home and library lists on phones and tablets, with animated loading placeholders that respect reduced motion.
- Pin Live TV categories separately for each playlist. On TV, use Library organization or hold OK / press Menu on a category.
- Home features an available favorite live channel; without one, it greets you. Continue watching and the rest of your library remain available.
- Clearer player controls: centered transport, a bottom timeline where supported, and video shading that disappears with the controls.
- Four-second portrait and landscape launch films, with still-image and reduced-motion fallbacks.
- Removed the connection/IP screens and lookups. Older saved settings and encrypted backups remain readable; backups also carry category pins.
- Fixed TV category management when opened from Settings.

Files:
- `GlowTV.apk`: Android phone/tablet touch interface.
- `GlowTV-TV.apk`: universal TV interface for remote control.
- `GlowTV-TV-armeabi-v7a.apk`: smaller TV package for 32-bit devices.

App identifiers, private Android signing identity and existing player engines are retained. SHA-256 companion files and `release-metadata.json` describe the exact attached packages.

Verification: [Android build](https://github.com/nhshajib/NodeCast/actions/runs/45614594754), [native design checks](https://github.com/nhshajib/NodeCast/actions/runs/45618141434), and [full phone/TV checks](https://github.com/nhshajib/NodeCast/actions/runs/45618145461). TV interactions were D-pad/Select/Back/Menu driven. Physical-device checks were skipped by owner decision; the release is gated on CI.

Existing installation guides: [Android](https://glowtv.app/install/android/) · [Android TV](https://glowtv.app/install/android-tv/) · [Fire TV](https://glowtv.app/install/fire-tv/).

GlowTV is a free media player only. It provides no channels, subscriptions or content. Add your own legally obtained playlist or provider account.
