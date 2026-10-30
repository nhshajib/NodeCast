# TiviMate reference and NodeCast TV

Reference: the supplied APK identifies as `ar.tvplayer.tv`, version 5.3.3. Only its manifest and ZIP metadata were inspected; no DEX, implementation code or branding was copied. The feature comparison uses the user's TiviMate feature list and the public [TiviMate website](https://tivimate.com/). The uploaded APK was not executed in this workspace. NodeCast is independently implemented and retains its own interface and palette.

The reference manifest marks Leanback and touch as optional and offers standard and Leanback launcher categories. NodeCast TV now supports both launcher categories and does not require Leanback hardware, improving Fire TV compatibility. NodeCast still requires Android API 24+ and includes ARM32/ARM64 and x86-64. The user’s target is the Hisense 50QD6QF Fire TV; physical-device confirmation remains necessary.

| Feature | NodeCast TV | Placement |
| --- | --- | --- |
| Multiple playlists | Local profiles already supported; new quick switcher | Sidebar playlist selector |
| Favorites | Per-profile favorites and ordering; remote access audited | Tile favorite action and Favorites tab |
| Search | Channels/titles, search scope and guide programme search | Library and guide search fields; Select opens keyboard |
| Catch-up | New provider-advertised Xtream archive playback | Select an eligible completed programme in TV guide |
| Parental controls | Local PIN and protected categories; active prompt traps focus | Settings → Family controls |
| Personalization | Light/Dark/System, library sorting, category visibility, playback choices | Existing settings; new installations default to Dark |
| Multiview | Future phase, not included | Plan: optional two-stream player-menu action, with provider connection limits and Fire TV decoder checks |
| Recording | Future phase, not included | Plan: provider-supported recording to user-selected storage, native foreground service/scheduling and clear storage/standby handling |

## Catch-up implementation

Channel capability comes from `tv_archive=1` and positive `tv_archive_duration`; unsupported channels do not gain fake archive actions. The programme must have ended, fit inside the provider archive window and have a reasonable duration. The app retrieves the active account's `server_info.timezone` before constructing the Xtream timeshift request. This avoids using the TV's local timezone as the archive clock. Missing or invalid metadata produces a readable error.

The guide can retain up to seven past days for archive-capable TV channels, within the existing size/programme limits. Availability also depends on the provider supplying historical XMLTV programmes. A programme details screen offers Watch catch-up only when eligible, and Watch channel live separately. Back returns to the guide at its previous time window. Archive URLs remain transient and are not added to ordinary movie history or exported as resume links.

Protocol reference: [Archive & Catch-up specification](https://uniplayer.net/docs/specs/catchup/), section 6, documents the Xtream archive flags and `/timeshift/USERNAME/PASSWORD/DURATION/START/STREAM_ID.EXT` endpoint with duration in minutes and the server's archive timezone. No provider media is bundled.

## Fire TV remote behavior

- D-pad: spatial focus, list/category scrolling and visible focus ring.
- Select/OK: activate the focused control; select an input to open the system keyboard.
- Back: close the active subpanel first, then return to the previous screen.
- Menu or long Select: open channel/player/library options in context.
- Play/Pause, Rewind/Fast-forward and Stop: use the active player's available controls.
- Focus is kept out of hidden backgrounds and controls covered by the mini-player.

Multiview and recording are deliberately absent from this release's navigation until their resource, provider and storage requirements can be implemented and verified. Catch-up is the user's selected first priority.
