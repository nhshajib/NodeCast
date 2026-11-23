# GlowTV 1.0.1 — Fire TV fix list

Source: hands-on test of `GlowTV-TV.apk` 1.0.0 on a Hisense Fire TV Edition (Fire OS 8, Android 11, 32-bit userspace, 1080p). It used the D-pad remote only, with the public iptv-org M3U playlist (11,491 channels). The keyboard not opening was reported separately.

| # | Item | Change | Where |
|---|---|---|---|
| — | Keyboard doesn't open | On Select, the field is focused and the keyboard requested explicitly (insets API, then `showSoftInput`, then a forced request). React Native only does this in touch mode. | `plugins/tv/TVRemoteController.kt` |
| 1 | Stream hangs forever | First-frame tracking (`onFirstPlay` / time > 0). A large centred loading card. After 15 s, a card with Retry (focused), Try other player and Next channel. Messages for 404 and 403 (region). No Pause button until a frame. | `CompatibilityPlayer.tsx`, `recovery.ts`, `BuiltInPlayer.tsx` |
| 2 | Back discards the playlist form | Back with typed details asks "Discard this playlist?". Keep editing is focused. | `TVApp.tsx`, `ProviderSheet.tsx` |
| 3 | Focus | Explained below the table. | `TVRemoteController.kt`, `TVApp.tsx`, `CompatibilityPlayer.tsx` |
| 4 | Rail doesn't fit | All nine items fit in 40 dp rows, with no scrolling. The content gets a scrim while the rail is expanded. | `TVApp.tsx` |
| 5 | Overlapping Backs | FullGuide draws a single Back on TV in every state. In setup, Back returns to the guide. | `FullGuide.tsx`, `TVApp.tsx` |
| 6 | Logos | On by default in list view, on Home and in the player. They are fitted (contain) and downsampled, and kept in a credential-free logo store (`logoCache.ts`). | several |
| 7 | Multi-category groups | Split on `;`. A channel belongs to every category it lists; subtitles read "A · B"; "undefined" becomes Other. | `groups.ts` and every matcher |
| 8 | Thin Home | The hero is the last-watched channel. Rows: Continue watching (including live), Favorites, From your playlist. | `TVHome.tsx` |
| 9 | Loading feedback | Shows the current step and elapsed time; the Add button is replaced while loading. | `TVApp.tsx`, `TVHome.tsx` |
| 10 | Header too tall | Chips and actions share one row: the actions (Recently watched, Library options, Grid view, TV guide) are 56 dp icon buttons that show their name while focused, so the chips keep most of the width. The hint and count move under the title; rows are 56 dp. The focused row stays inside the middle band of the list. | `TVApp.tsx`, `TVChannelRow.tsx`, controller |
| 11 | Row shifts on focus | The ring goes around the whole row; scaling is capped at about 8 dp per side. | controller |
| 12 | Clipped rings | Scale is capped, lists and Home rows are padded, and radio rows are padded. | controller, `TVHome.tsx`, `ChannelPlaybackOptions.tsx` |
| 13 | Hard top edge | A soft fade at the top of Home. | `TVHome.tsx` |
| 14 | Wrong empty states | M3U playlists say movies and series come from Xtream; an unfiltered empty list says why it's empty. | `TVApp.tsx` |
| 15 | Empty guide | With no feed, channels are listed with "No programme info". | `FullGuide.tsx` |
| 16 | Search | The rail's Search clears the query; the default scope is all channels of the current type. | `TVApp.tsx` |
| 17 | Form polish | Focus starts on the tabs. The last tab is remembered, starting with M3U. The selected tab is the brightest. The name is prefilled. Errors appear only after Connect. | `ProviderSheet.tsx` |
| 18 | First launch | The Home IP screen no longer opens on its own. | `TVApp.tsx` |
| 19 | IP privacy | Settings no longer looks up the IP. Connection details looks it up only when asked, hides it until Show, and names ipwho.is. | `NetworkCard.tsx`, `TVApp.tsx` |
| 20 | Player info | Shows the logo, "n of N · group" and a ▲▼ hint. Left opens a channel list. | `CompatibilityPlayer.tsx`, `TVApp.tsx`, controller |
| 21 | Developer copy | The XMLTV help is in plain language. | `FullGuide.tsx` |
| 22 | Label mismatch | The rail item reads "Switch playlist", matching its accessibility name. | `TVApp.tsx` |
| 23 | APK | The TV build removes USE_BIOMETRIC, USE_FINGERPRINT, VIBRATE and SYSTEM_ALERT_WINDOW, and sets allowBackup=false. A `GlowTV-TV-armeabi-v7a.apk` is added. The universal APK, which is tested on the x86_64 emulator, stays. | `app.config.js`, `apps-release.yml` |
| 24 | Memory | Every logo image uses `resizeMethod="resize"`. Each channel change still stops VLC before the next channel mounts. | several |

## #3 Focus

The native focus controller now does the following:
- Commits a page change only once focus actually lands inside it, which fixes focus staying on the rail during a page fade-in.
- Follows a rail selection into its page.
- On Left, always lands on the current page's rail item.
- Keeps Up and Down inside the rail, with hard stops at both ends.
- Never lets content fall into the rail vertically.
- Moves Up and Down to the nearest row first, so small controls at the side of a row (like the backup history switch) are reachable. Inside a scrolling list, its own next item comes first, even when scrolled out of view.
- Refuses diagonal moves to the side, and keeps Left and Right inside a chip strip or Home row until its end, even when the next item is scrolled off-screen.
- Never jumps to the far edge after paging.
- On entry, sends focus to a list's first or last-focused item.
- Waits briefly for a virtualized list to restore its row.

In addition:
- The player starts on a harmless control while loading, then on Play/Pause.
- The first channel row is preferred.

## Verification

- 183 unit tests and 20 emulator-driver tests pass, as do typecheck, the grid and scope guards, and both web exports.
- The scope guard records the reviewed recovery and VLC lifecycle additions.
- Emulator design and full checks run on CI before publication.
- Re-testing with the D-pad on a real Fire TV is still recommended for the focus items.

## Not covered

These need an Xtream account or a guide feed: VOD, catch-up and the XMLTV grid with real data.
