# GlowTV changes

## 1.0.2 — November 25, 2026

Android phone and TV are published as stable. iPhone/iPad verification is in progress; the published IPA remains 1.0.1.

- Native pull-to-refresh on Home and library lists, with animated loading placeholders and reduced-motion support.
- Per-playlist favorite Live TV categories, pinned ahead of other groups and included in backups.
- Home features a favorite live channel, or a greeting when none is saved.
- Removed public-IP/connection screens and automatic lookups; older backups remain readable.
- Reorganized player chrome around centered transport controls and a bottom timeline, keeping existing engines and features.
- Supplied four-second portrait/landscape launch films, with decoded-frame handoff and still-image fallbacks.

## 1.0.1 — November 23, 2026 · Fire TV fixes from real-device testing

From hands-on testing on a Hisense Fire TV (Fire OS 8) with an 11,491-channel M3U playlist. See `docs/TV-FIX-1.0.1.md`.

- **Keyboard:** selecting a text field on TV opens the keyboard (explicit IME request; React Native only does this in touch mode).
- **Playback:** large centred loading card with the channel name; after 15 s without a first frame, a card with Retry (focused), Try other player and Next channel. 404 and region-blocked (403) streams get specific messages. No Pause button until the picture starts.
- **Playlist form:** Back with unsaved details asks "Discard this playlist?" (Keep editing focused). Focus starts on the source tabs; the last tab is remembered (M3U first); the selected tab is the brightest; the name is prefilled; errors appear only after Connect.
- **Focus:** opening a page from the rail moves focus into it; Left lands on the current page's rail item; Up/Down stay inside the rail; content never falls into the rail; no diagonal jumps; entering a list lands on its first or last-focused item; focused rows stay away from the screen edge; closing a menu returns to the row.
- **Rail:** all nine items fit at 1080p, with a scrim over the content while expanded; "Switch playlist" uses one name.
- **Guide:** one Back on every guide screen; with no feed, channels are listed with "No programme info"; plain-language XMLTV help.
- **Library:** logos on by default in list view, on Home and in the player (contain, not crop), kept in a small credential-free store; multi-category groups split on `;`; empty or "undefined" groups show as Other; M3U playlists explain that movies and series come from Xtream accounts; compact Live TV header (at least five rows); whole-row focus ring; rings no longer clipped.
- **Home:** last-watched hero, Continue watching (including channels), Favorites and From your playlist rows; loading progress with step and elapsed time; a soft fade at the top edge.
- **Player:** channel position, group, logo and a "▲▼ Change channel" hint; Left opens a channel list.
- **Privacy:** no Home IP screen on first launch; Settings no longer looks up the public IP; Connection details looks it up only when asked and hides it until Show.
- **APK:** TV build drops USE_BIOMETRIC, USE_FINGERPRINT, VIBRATE and SYSTEM_ALERT_WINDOW, sets allowBackup=false, and adds a smaller `GlowTV-TV-armeabi-v7a.apk`.
- **Search:** the rail's Search opens with an empty query; search defaults to all channels of the current type.

## 1.0.0 — November 22, 2026 · First stable release

Design pass from `docs/CODEX-APP-AUDIT-0.7.4.md`, using the ui-ux-pro-max and unslop skills.

### Features (research-led plan, `docs/RELEASE-1.0.0.md`)

- **Catalogue:** shared `CatalogRepository` for phone and TV with paged queries (items, total, snapshot ID, cursor).
  - Storage is native SQLite with an FTS5 trigram index and credential-free rows.
  - Legacy JSON caches are migrated only after a row-for-row check, and kept as a fallback.
- **Refresh:** capture, fetch, validate, compare, commit.
  - Older generations and other profiles never win.
  - An empty response never empties a working library.
  - Exact duplicate IDs are dropped; distinct variants are kept.
- **Search and sorting:**
  - Ranked search keeps every 0.7.4 match and ranks exact, prefix, word prefix, then broader matches.
  - Newest first and the Home "Recently added" row use only real Xtream timestamps.
- **Organization:**
  - Named lists store ID references only.
  - Hidden titles leave browsing and search but stay in favorites and lists.
  - Unavailable saved titles are kept and marked.
  - Family restrictions always win.
- **Series:** latest-first display, an unwatched filter, jump to next and refresh episodes.
  - Optional autoplay is off by default and uses a cancellable ten-second countdown.
  - Continuation keeps the canonical order.
- **Guide:**
  - Matching order is manual choice, then exact EPG ID, then a unique exact name; similar names are only suggested.
  - Health counts and a quarter-hour time correction, applied once to display and catch-up times.
  - Past schedules are kept within the archive window.
  - Empty rows explain why they are empty.
- **Playback:**
  - Previous and recent channels, rechecked against access rules.
  - Return to live through the controlled reopen path; there is no local timeshift.
  - Exact language-variant matching that explains when only another variant exists.
  - Allowlisted playback help.
- **Transfer:**
  - Paste-and-preview of provider details, shown masked.
  - Backup payload version 2 adds lists and the new preferences; version 1 still imports, and the encryption envelope is unchanged.
  - Import preview offers Add or Update. Ambiguous matches need a choice. Update keeps the profile ID and this device's history.
- **Builds:** previews use build numbers 9900–9999; 10000 is reserved for the stable build.

- Brand type matches glowtv.app: Instrument Sans (400/500/600) for interface text, Newsreader 500 for display titles. Inter is removed; interface weight tops out at 600.
- Sentence-case labels everywhere; no letter-spaced uppercase eyebrows.
- Home: one header (native "Watch" title on iPhone and iPad, top app bar on Android) with Add playlist and, on iPhone and iPad, Settings. The greeting is gone. The featured card has its art in its own frame with the play and favourite actions together. Live rows use a small red dot and a play affordance.
- Public IP and VPN status moved from Home to Settings → Connection.
- Library and Search: native-style segmented controls without check marks, no profile subtitle, freshness line only when refreshing, failing or older than six hours. Search scope is one quiet line that opens a native choice. Search starts with a calm prompt instead of the whole library.
- Guide: one sticky time ruler with a now marker, 80pt programme cells without the clipped "On now" line, and relative dates in programme details.
- Player: options list with current values (Fit/Fill, sleep timer), no duplicate "Back to library", icon-only Back on phones, larger titles; iPad landscape uses a side-by-side theatre layout.
- iPad: full-width Home (wide hero, two-column live list), two-column Settings, two-column series header with capped button width.
- Android: no gear on tabs when Settings is a tab, no duplicate "+" in Settings, form footers clear the gesture bar.
- Add playlist: Cancel on the left; segmented source picker without check marks.
- Series: season picker as a segmented control, clearer watched state.
- TV: Search is a real rail destination that searches all media; the rail never scrolls; library filters sit above the grid so focus can't scroll them away; episodes are titled with the series name; shorter Home hero with a fully visible first shelf; no duplicate close button in guide details; compact guide preview; Remove sits apart from Edit and still confirms; forms use Android TV's full-screen text editor with the field label; larger player title.
- Deferred with reasons in the audit brief: per-ABI APK splits (changes the signed release, emulator smoke and download pipeline; scheduled after 1.0), iPad sidebar tabs.

## 0.7.4 — November 21, 2026 · Audit follow-up

- Guide: filter button beside the day picker, inline selected-day check, channel logos instead of initials, shorter rows.
- TV: focused poster titles no longer clip; small TV labels raised to 14; no stray scroll indicator in the guide.
- Inline show/hide password toggle; Add-playlist sheet respects the bottom safe area.
- Larger LIVE badges and small labels on phone.
- Existing identifiers, signing identity, profiles, playback engines and transitions are retained.

## 0.7.3 — November 19, 2026 · Accessibility and navigation

- Fixed native startup on Hermes runtimes without Intl.PluralRules.
- iPhone fixed controls respect native search/header insets without duplicate space on Home and Guide; programme details stay below their native sheet title.
- TV remote Back reaches React Native handlers consistently. The expanding rail preserves content width and restores focus without remounting poster grids.

- Responsive iPad layouts and tablet orientation policy, clearer guide text and accessible forms.
- Visible TV focus, restored channel position, consistent Back behavior and remote playback controls.
- Confirmations, undo for recent items, accessible status messages and clearer loading states.
- Mini-player placement measures native interface insets instead of assuming a fixed tab-bar height.
- Existing identifiers, signing identity, profiles, playback engines and transition settings are retained.
- Native build and device verification results are recorded separately; source changes alone do not verify physical hardware.

## 0.7.2 — November 19, 2026 · UI audit

- Consistent Lucide icons with clear saved/unsaved favorite states.
- An 8px layout grid, including player controls, track menus, TV switches, guide cells and floating labels, and three UI color families: primary green, neutral and semantic red.
- Removed generic icon backplates, passive information cards and duplicate navigation; playable items and actionable settings retain cards.
- Clearer Home hierarchy and less promotional/support clutter. Every existing destination and feature remains available.
- Correct dark/light appearance changes for retained movie cards and media rows.
- Existing transitions, animations, provider/storage models and JS player lifecycle effects retained.
- Android native VLC now ignores unchanged picture-in-picture props, preventing unnecessary decoder recreation during UI updates.
- Native release builds and screen audits passed. Physical-device/provider compatibility remains a separate check.
- Refreshed native iPhone, iPad, Android and TV screenshots and direct website download metadata.
- The complete screen-by-screen findings, code diffs and tokens are linked in [the UI audit](docs/UI-UX-AUDIT-0.7.2.md).

## GlowTV 0.7.0 — November 18, 2026 · Public testing release

- Website downloads now link directly to each published IPA/APK, with platform features, version details, checksums and release notes. GlowTV 0.7.0 is published for iPhone/iPad, Android phone/tablet and Android TV/Fire TV.

- New GlowTV name, supplied launcher assets and tagline. Existing IDs, signing, profiles, backups and animations are retained.
- Shared app moved to `apps/player/`; independent Astro website in `website/`.
- Original demo scenes replace the bundled public samples.
- Platform guides, support, structured data and accessible screenshot galleries.
- Fixed Android 13–15 phone Back dispatch, including navigation after reopening; native routes and transition settings are retained.
- Added a virtual-device-only VLC decoder fallback for Android 15 emulator rendering; physical-device decoding remains unchanged.
- Direct testing downloads are published; store publication and physical-device review remain follow-ups. The website is live on Vercel.

## Version history

## 0.7.0 — GlowTV design

- Leaf-green palette and bundled Inter typography across the phone and TV interfaces.
- iPhone: warm light surfaces, five-tab navigation, timeline guide with program sheet, full-width portrait player.
- Android: dark default, pill navigation, checked chips, floating labels and M3U / Xtream / File playlist sheet.
- TV: slim rail, featured Home, retained connection card, compact guide and single green remote focus.
- **Feels native (iPhone and Android phone):** system navigation through Expo Router. Pages use a native stack with edge swipe-back on iOS and predictive back on Android. The tab bar is native, and re-tapping a tab scrolls to the top. Short tasks (playlist form, player choice, remove confirmation, channel playback, programme details) open in native sheets you can drag.
- Every control shows a pressed state when your finger lands and is at least 44 points. Switch rows toggle from the whole row. Haptics fire only when something changes: a favourite, a switch, a seek, a saved playlist or a removed profile.
- Library lists no longer rebuild on every keystroke, category chips are virtualised, and guide rows no longer filter every programme per row.
- Fixed a seek bar issue that could seek twice at the end of a drag.
- TV: reselecting the active rail item returns the channel list to the top, the channel list keeps more rows ready while scrolling, and Select shows a brief pressed scale.
- Rules for future screens are in `CLAUDE.md`, and the audit is in `docs/NATIVE-AUDIT.md`.
- Existing player lifecycle effects are preserved. The same configured slide is added around TV pages.
- Provider, catalog, guide, catch-up, backup models and playback-policy modules remain unchanged.
- Android 0.7.0 is published after native eight-screen and eight-settings audits, decoded-frame checks and six phone touch pause/resume cycles. Existing update signing identity was verified. iPhone and iPad UI audits passed, and the standalone ARM64 IPA passed archive, identifier and checksum verification. Physical-device/provider testing remains separate.
- Identical Android VLC source/options updates retain the current decoder instead of restarting playback.


[← Choose your edition](README.md)

## 0.6.8 · October 31, 2026 · iPhone

- Active tab content no longer depends on a fade animation finishing, preventing an interrupted transition from leaving Home invisible.
- Navigation settles when the app backgrounds or returns, without remounting screens or resetting scroll positions.
- A completion fallback settles interrupted tab, indicator and settings-page motion.
- Android mobile and TV downloads remain 0.6.7.

## 0.6.7 · October 30, 2026 · All editions

- TV channels now default to a compact text list with Grid view and optional logos. Logos are off in the list to avoid artwork requests; movies and series retain their layout.
- TV Library organization separates preferences, categories and favorites; correct media-specific sort/search settings persist, fresh disk caches restore categories after restarting, and favorite/category writes use the latest profile.
- TV only loads catalogues that are needed, reuses numeric sorting, and avoids rebuilding the whole channel search index for a favorite toggle.
- Compact translucent playback settings stay over the video on iPhone, Android mobile and TV. Long panels scroll; short menus fit their contents.
- Playing controls fade out after four idle seconds. Tap the video or press a TV navigation/Select/Back key to reveal them without triggering an unintended action.
- Settings dismiss after eight idle seconds. Active touches, unsaved channel changes, saving, paused/loading/failed playback and screen readers keep controls available.
- Mobile portrait and landscape playback use the same custom overlay, including a touch seek timeline. Next-episode handoffs preserve orientation. Native fullscreen no longer covers the settings interface.
- TV media keys control playback directly. Video stays mounted and menus retain the existing live connection.
- Opacity transitions respect Reduce Motion. Local profiles and existing settings are retained.

## 0.6.6 · October 30, 2026 · Android TV

- TV player settings open beside a persistent video surface. Identical VLC source/options updates no longer restart the decoder.
- Live audio/subtitle panels close with Back before leaving the player.
- TV connection details use the normal remote-controlled navigation window and a compact two-column layout; the sidebar opens them directly.
- Native focus highlighting avoids React state updates per D-pad move; new panels repair focus before drawing; focus scans and delayed scroll repair are bounded.
- Category, media, guide and episode lists render bounded windows. Large organization lists use search/paging.
- Fullscreen history updates stay out of the hidden library; final progress and manual watched marks update when needed.
- Fixes Dark appearance contrast in the connection summary, selected categories and version badge.
- iPhone and Android mobile downloads remain 0.6.4.

## 0.6.5 · October 29, 2026 · Android TV

- D-pad/Select throughout the TV library, guide, settings, profiles and player, with visible focus, scrolling and restoration after Back.
- Isolated active panels, full-size TV switches, system keyboard activation and Fire TV Menu / long Select shortcuts.
- Compact TV guide rows put channel controls beside programmes, with aligned time labels.
- Quick playlist switching, Dark defaults for new TV installations and Fire TV-compatible launcher declarations.
- Provider-supported Xtream catch-up opens completed guide programmes using the provider's archive window and server time zone. Historical XMLTV data is required.
- iPhone and Android mobile remain 0.6.4. [TV details](apps/player/android-tv/CHANGELOG.md) · [Reference comparison](verification/tv-remote/FEATURE-COMPARISON.md).

## 0.6.4 · October 29, 2026

- Clear recents from Home, TV recent channels and Library & storage; progress and watched marks stay.
- Encrypted device transfer includes profiles, provider details, favorites, settings and optional history. Import adds copies and preserves existing profiles.
- Family protection and interrupted-import recovery are included.
- iPhone launch/linking/playback fixes retained and checked in a Release simulator. Both Android APKs rebuilt and tested.

[Transfer details and verification](verification/transfer/README.md).

## 0.6.3 · October 28, 2026

- Fixed the iPhone crash at opening. The file-system library required a function the rest of the app does not provide, so the process closed before the first screen. It is now built with the same modules, and iOS is given the scene delegate class that is actually registered.
- Replaced the iPhone download with `NodeCast-0.6.3-unsigned.ipa`. A Release simulator launch stayed open. Install over the existing app with the same Apple account to keep local profiles.
- Android phone and Android TV downloads are unchanged.

## 0.6.2 · October 28, 2026

- Fixed the iPhone crash on launch and during playback. Startup no longer loads file, document, and crypto native modules, Picture in Picture waits until you ask for it, and live TV survives an early VLC stop.
- Replaced the iPhone download with `NodeCast-0.6.2-unsigned.ipa`. Install over the existing app with the same Apple account to keep local profiles.
- Android phone and Android TV downloads are unchanged.

## 0.6.1 · October 28, 2026

- Rebuilt the iPhone IPA and Android TV APK from the current source and replaced those downloads.
- Android TV keeps the compact guide layout, so programme timelines stay visible, and installs over 0.6.0.
- The Android phone download remains 0.6.0.

## 0.6.0 · October 28, 2026

- Full XMLTV/gzip guides with local schedules, mapping, programme search and synchronized TV timelines.
- Light, Dark and Follow device appearance.
- Six-digit local family PIN with protected categories, background relocking and reset-based recovery.
- Persistent mini-player, Fit/Fill, VOD speed and in-app sleep timer.
- Capability-gated native PiP; iPhone native playback also offers AirPlay. Physical-device confirmation is still needed.
- Local M3U import, advanced provider headers, sorting, refresh policy and separate cache/history controls.
- Fixed mobile PIN prompt layering and a TV second-playlist connection race; compact TV guide controls keep programmes visible.

[Feature details and limits](verification/roadmap/README.md). Chromecast, multiview, QR/portal pairing, cloud sync, DVR and downloads remain future work.


## 0.5.0 · October 28, 2026 · All editions

- Preserved profile-specific browsing state, explicit search scopes and cached TV lists during refresh failures.
- Added per-channel player, internal engine and live-format preferences, plus redacted player information.
- Added season selection, watched marks, Continue series and next episode on mobile as well as TV.
- Remembered embedded-VLC track choices and clearer missing-language feedback.
- Updated Settings version history and standalone IPA/mobile APK/TV APK downloads.

[Research, implementation and validation](docs/RESEARCH-2026-10-27.md)

## Published versions

| Edition | Current download | Version history |
| --- | --- | --- |
| iPhone | [0.6.3 · IPA](apps/player/iphone/README.md) | [iPhone changelog](apps/player/iphone/CHANGELOG.md) |
| Android mobile | [0.6.0 · APK](apps/player/android-mobile/README.md) | [Mobile changelog](apps/player/android-mobile/CHANGELOG.md) |
| Android TV | [0.6.1 · TV APK](apps/player/android-tv/README.md) | [TV changelog](apps/player/android-tv/CHANGELOG.md) |

## October 27, 2026 · Android 0.4.0

- Separate mobile and TV editions, each with local profiles, Xtream Codes / M3U, search, favorites and built-in live playback.
- Fixed an Android VLC startup race caused by reading the native activity before it was attached.
- TV gets a landscape library, visible remote focus and fullscreen movie/episode controls.
- A bottom-right TV **Next episode** button follows the server's episode list, crosses seasons and hides on the final episode. The current stream closes before the following episode opens.
- Native emulator checks passed for repeated cold starts, generated MPEG-TS / MP4 playback and D-pad/Select episode changes. Physical hardware and customer-provider streams still need testing.

## October 26, 2026 · iPhone 0.3.0

- Smoother tab transitions and moving lavender tab indicator.
- Visited tabs retain their scroll positions; Library and Favorites keep separate searches/categories.
- Settings retain their content during dismissal, with Reduce Motion support.
- Includes the animated intro, fullscreen/landscape playback and optional home-IP reference from earlier iPhone releases.

The iPhone download is the original verified 0.3.0 binary, republished as a permanent release asset. A newer shared source version does not automatically update that IPA.

For earlier changes, use the edition-specific changelogs and [archived source milestones](docs/CHANGELOG-ARCHIVE.md). Detailed engineering checks are in [verification results](verification/RESULTS.md).
