# GlowTV 1.0.1 — Android phone and TV

[Download Android phone APK](https://github.com/nhshajib/NodeCast/releases/download/glowtv-v1.0.1/GlowTV.apk) · [Download TV APK](https://github.com/nhshajib/NodeCast/releases/download/glowtv-v1.0.1/GlowTV-TV.apk) · [Release and checksums](https://github.com/nhshajib/NodeCast/releases/tag/glowtv-v1.0.1)

Fixes from hands-on testing on a Fire TV with the remote, plus everything in 1.0.0.

- **Keyboard:** selecting a text field on TV now opens the keyboard.
- **Channels that won't start:** a clear loading card, then after 15 seconds Retry, Try other player and Next channel. Missing (404) and region-blocked streams are named.
- **Remote focus:** focus goes into the page you open. Left returns to the current page in the rail. The rail fits on screen. Lists start on their first item, and Back never loses your place.
- **Logos everywhere:** in lists, on Home and in the player, kept between launches.
- **Categories:** channels with several categories, such as News;Public, appear under each one.
- **TV Home:** your last channel, Continue watching and Favorites. In the player, Left opens a channel list.
- **Privacy:** your public IP is only looked up when you ask, and stays hidden until you choose Show.
- **Smaller Fire TV download:** `GlowTV-TV-armeabi-v7a.apk` for Fire TV and other 32-bit TVs. The universal `GlowTV-TV.apk` still works everywhere.

Your profiles, playlists, favorites, guide settings, encrypted backups, app identifiers, signing identity and player engines carry over. To keep your local data, install over the matching edition. Both APKs include JavaScript and VLC, so no computer is needed while watching.

Each edition's `DOWNLOADS.md` lists exact requirements, file size and SHA-256. The companion checksum files and `release-metadata.json` describe these exact builds.

The release was verified with Android emulator checks on phone and TV, and iPhone/iPad simulator checks. It was not tested on physical devices. GlowTV is a player only and provides no channels, playlists, content or subscriptions.
