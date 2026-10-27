# Android TV version history

[← TV download & installation](README.md) · [All editions](../CHANGELOG.md)

## 0.4.0 · October 27, 2026 · Current TV APK

- Dedicated landscape interface with a sidebar, three-column library and visible remote focus.
- Xtream Codes / M3U connections, local profiles, categories, search and favorites.
- Embedded VLC for live TV; fullscreen native movie/episode controls with play/pause, 10-second rewind, 30-second forward and audio/subtitles.
- Bottom-right **Next episode** follows the provider's actual ordered episode list, including season changes. It opens the following episode from the beginning and releases the previous stream first.
- Next is hidden for movies, live TV and the final available episode.
- Saved movie/episode language preferences, public IP/location, home-IP reference and version history.
- Fixed the Android VLC activity-initialization startup race.
- Native emulator checks passed for repeated cold starts, generated MPEG-TS / MP4 playback, remote Back and D-pad/Select next-episode activation.

[Download 0.4.0 TV APK](https://github.com/nhshajib/NodeCast/releases/download/android-v0.4.0/NodeCast-tv-0.4.0.apk) · [Build record](build.json)

Earlier 0.3.x TV builds were development/testing iterations. Use 0.4.0 as the published TV download.

[Shared source history](../src/releases.ts) · [Verification details](../verification/android/README.md)
