# GlowTV UI/UX audit — 0.7.3 work branch

Initial audit scope: app UI only. The user subsequently authorized version 0.7.3 packages, publication and the website update. No signing change, native module addition or engine/data-model migration was made. Native release results are recorded separately below. Baseline native screenshots are [iPhone](../verification/glowtv/audit-0.7.3/before/ios.jpg), [iPad](../verification/glowtv/audit-0.7.3/before/ipad.jpg), [Android](../verification/glowtv/audit-0.7.3/before/android.jpg), [TV](../verification/glowtv/audit-0.7.3/before/tv.jpg).

## Scope-check reconciliation

The prior guard required the entire TV remote controller to equal 0.7.0. C3/C4 and H3/H4 explicitly require changing that UI controller. The guard now permits these authorized UI changes while retaining exact protected model, engine patch, lifecycle-effect and navigation-motion checks. Additional explicitly requested UI exceptions, if needed, are recorded here rather than described as unchanged behavior.

## Critical

| Finding | Status | Implementation |
| --- | --- | --- |
| C1 | Fixed in source; physical-device follow-up | `app.json`, `app.config.js`, `orientationPolicy.ts`, `restoreOrientation.ts`, `usePlayerOrientation.ts`, `navigation/NodeCastProvider.tsx`: multitasking allowed, hardware iPad/tablet restores unlocked orientation; phones restore portrait; player landscape remains. No `expo-device` dependency added. |
| C2 | Fixed | `Player.tsx`: next-episode icon, spinner, title/subtitle use `primaryText`; `LibraryOptions.tsx`: selected segments use selected/selectedText tokens. |
| C3 | Fixed in source; physical-device follow-up | `TVRemoteController.kt`: two-tone ring, 1.05 scale, outline/background radius, no EditText ring; TV rows/tiles draw on unclipped containers. |
| C4 | Fixed in source; physical-device follow-up | Scoped rail; controller prioritizes latest non-rail scope and normalized stable remembered control IDs; library reads saved focused item; first category/search/action controls have preferred IDs. |

## Verification

Phase checks and final browser screenshot/contrast results are recorded in `verification/glowtv/audit-0.7.3/checks.json`. Native focus rings, real D-pad/key flows, iPad multitasking/rotation, VoiceOver/TalkBack and maximum Dynamic Type have separate native emulator/simulator evidence below. Physical-device behavior is not claimed as verified by web exports.

## High

| Finding | Status | Implementation |
| --- | --- | --- |
| H1 | Fixed in source; native follow-up | `TVApp.tsx`, `uiPolicy.ts`: libraries return Home, Home requires a second Back within two seconds; first-run IP dismissal saves skipped. `FullGuide.tsx` consumes Back for settings/filters. |
| H2 | Fixed in source; native follow-up | `TVApp.tsx`: focus expands the scoped rail with labels; selected fill/weight differs from two-tone focus; root title-safe padding remains independent. |
| H3 | Fixed in source; native follow-up | `TVSeekBar.tsx`, `Player.tsx`, TV controller: adjustable VOD track, 18pt times, ±10s Left/Right with repeat acceleration, including hidden controls. Live has no timeline. |
| H4 | Fixed in source; native follow-up | Controller and TV app route CH+/− and hidden Up/Down through the current filtered live list; INFO opens local now/next/progress overlay; GUIDE preserves playback in the mini player. |
| H5 | Fixed | `designTokens.ts`, `theme.tsx`, `Typography.tsx`, `ui.tsx`, `PlaybackGlass.tsx`, TV rows: TV scale plus 14pt floor; 80dp channel rows and computed poster-row stride stay on grid. |
| H6 | Fixed in source; overscan follow-up | `tvSafe` horizontal 48 / vertical 27 is title-safe geometry, applied to TV content root and full-bleed player overlay controls. Video stays full bleed. |
| H7 | Fixed in source; remote follow-up | TV posters use a responsive 3–5-column 2:3 grid (five where space permits), one focus stop per tile; Menu/hold opens item actions; row stride derives from measured card width. |
| H8 | Fixed | `confirmDestructive.ts` and affected Privacy/family/network/guide/storage actions: explicit destructive confirmation. Home removal offers a five-second Undo before committing; reset and TV profile removal are visually separated. |
| H9 | Fixed in source; native sheet overlay follow-up | Root owns one toned banner; iOS uses FullWindowOverlay so sheets do not hide it. Info expires after four seconds; errors require Dismiss message. All phone call sites migrated. |
| H10 | Fixed in source; screen-reader follow-up | `Notice`, announcement hook, H1/H2 components, library search/refresh announcements, PIN errors and player failures; settings group headers; backup results scroll into view. |
| H11 | Fixed | Settings/profile/network/version/media/episode/guide labels include visible metadata and state. Daily, Follow device and native sheet Done/Cancel labels match visible copy. |
| H12 | Fixed | Home shows skeletons during loading, connected-empty refresh separately from disconnected setup, plus Try again on errors. |
| H13 | Fixed; iPhone/iPad simulator geometry passed | Responsive poster columns, 720pt readable content and tablet Home cards are implemented. MiniPlayerLayout measures the native Screens safe content frame, including interface insets, and subtracts it from the root frame. No fixed tab-height assumption remains. The native iPhone/iPad UI audit now checks mini-player geometry. |
| H14 | Fixed in source; native Dynamic Type follow-up | Guide cells size with font scale; channel column shows full names instead of stream IDs (no channel-number field exists in the protected model). Chips/pills grow, series header scrolls with episodes, delete sheet expands to full height. |

## Medium

| Finding | Status | Implementation |
| --- | --- | --- |
| M1 | Fixed | Shared typography enforces 12pt phone / 14sp TV floors; splash signature is explicit 12pt. Dense chrome alone uses the allowed font multiplier cap. |
| M2 | Fixed | Selection text/hearts/radios use link tones on light; progress tracks use line and fills use link; day segments include selected fill, check and state. Video/artwork colors are named fixed-contrast tokens. |
| M3 | Fixed in source; native track follow-up | Current audio/subtitle rows expose radio state/checks; disabled IconButton uses disabled state/.4 opacity; export/import and organization modes expose selection; guide/advanced controls expose expansion. |
| M4 | Fixed in source; native keyboard/autofill follow-up | Field allows caller overrides, surface-aware floating labels and announced inline errors. Provider, backup and PIN forms chain through refs and submit actions. Autofill metadata, required-field explanation/disabled Connect, password-length feedback, XMLTV reveal/URL keyboard and TV fullscreen-IME prevention are included. Unsaved native playlist sheets confirm discard. TV File explains picker requirements. |
| M5 | Fixed | Library/episode skeletons, one Now & next spinner, guide loader text, episode retry, clear/show-all guide/TV actions, Home retry/manage actions, episode loading text and Measuring storage copy. |
| M6 | Fixed | `formatting.ts` uses English Intl.PluralRules when available, with the same English fallback on Hermes runtimes without that constructor; guide dates use locale formatting; player title uses tail ellipsis/flex; tools use Playback info; library refresh copy never shows an unexplained empty label. |
| M7 | Fixed in source; native scrolling follow-up | Now line sits behind opaque cells; On now is text and part of the label. TV has a separate synchronized sticky ruler; focus updates preview/header without opening details. |
| M8 | Fixed in source; native navigation follow-up | iPhone Home/Live/Guide/Library/Search tabs, native library search, reduced header actions, no duplicate Android Home nav chips, inherited native titles suppress duplicate body headings, guide settings pushes natively and pushed titles travel in route params. |
| M9 | Fixed in source; native keys/focus follow-up | Shared TV track sheet holds chrome open; TV panels do not idle-close; video scrims protect chrome; mini scope receives media keys; Back navigates before closing mini playback; provider sheets trap focus; rail Search retains section. |
| M10 | Fixed in source; remote follow-up | Chevron Back controls, fill/check selection, Menu/hold hint with per-item options, flexible library heading and grouped two-column settings. Light mode is retained with two-tone focus and fixed video scrims rather than hiding a working setting. |

## Low

Low findings have been assigned L1–L9 in their original order.

| Finding | Status | Implementation |
| --- | --- | --- |
| L1 — seek hit area | Fixed | `VideoSeekBar.tsx`: 44pt hit area. |
| L2 — secure-storage copy | Fixed | `navigation/NodeCastProvider.tsx`: Keychain on iOS, Android secure storage on Android; preview limitations retained. |
| L3 — floating labels | Fixed | `ui.tsx`: field and floating label share the supplied surface color. |
| L4 — ready-data splash | Fixed in source; native launch follow-up | `StartupSplash.tsx`: skip the intro once data is ready, then use the existing 100/260ms exit. Animation definitions and navigation transitions remain unchanged; skipping this intro is the explicit Low-phase exception. |
| L5 — duplicate Home search | Fixed | `HomeScreen.tsx`, `navigation/navigation.tsx`: remove the fake Home search; retain Search tab and native library header search. |
| L6 — detail deep links | Fixed in source; native cold restoration unverified | `detailRoute.ts`, `navigation/NodeCastProvider.tsx`, `navigation/navigation.tsx`: opaque ID/section params, validated cached-catalogue reconstruction, family access checks and an actionable missing-title screen. Browser profiles intentionally do not persist credentials, so browser reload cannot verify native secure-vault restoration. |
| L7 — stable TV IDs | Fixed in source; native restoration follow-up | `SearchScope.tsx`, `FullGuide.tsx`, `SeriesEpisodes.tsx`, `TVLibraryOptions.tsx`: stable named controls replace generated IDs on the affected paths. |
| L8 — inactive TV actions | Fixed | `TVApp.tsx`, `TVHome.tsx`, `BuiltInPlayer.tsx`: active-profile action disabled, featured action matches item kind, sleep-off disabled while off. |
| L9 — TV alignment | Fixed in source; native visual follow-up | `TVHome.tsx`, `TVChannelRow.tsx`, `TVApp.tsx`: consistent content edges, 16dp row/card radii and 36sp page/hero titles. |

### Corrections found during browser review

- Returning from the pushed Guide source page could leave the retained guide with old mappings. `FullGuide.tsx` now rereads metadata on screen focus, using the existing guide APIs.
- Doubled phone text exposed overlapping player controls. `Player.tsx` now uses compact icon controls with a flexible, single-line title; live streams omit inactive seek controls, and movie timing gets its own row. `BuiltInPlayer.tsx` gives large-text portrait chrome more height. No engine, lifecycle effect or seek implementation changed.
- `LibraryScreen.tsx` segments wrap instead of clipping at doubled text; `SectionHeading` reserves space for its action. `Typography.tsx` honors the allowed dense-chrome font cap in the browser simulation while native text continues to use native scaling.
- TV scope changes can reuse the same native view. `TVRemoteController.kt` tracks scope names as well as view identity, so reused containers still trigger content focus restoration.
- The web fallback tab bar now has sufficient vertical padding for its labels. NativeTabs remain unchanged.
- Large-text review also stacks the Home IP summary and source choices, wraps backup tabs, and widens the guide channel column. Dense day labels use the permitted 1.4 font cap. These fixes preserve full body-text scaling. Android fields place their labels above the input at large font scales, preventing floating-label text from overlapping entered values.

### Reproducing verification

Run `verification/glowtv/audit-0.7.3/verify-phase.sh phase4` from any directory. The three exports use `--clear` to prevent Metro reusing environment-specific transforms. Earlier phase checks passed, but the final cache-cleared run is the authoritative platform-variant export check.

Then run `python verification/glowtv/audit-0.7.3/capture.py` with Chromium and Playwright installed, followed by `python verification/glowtv/audit-0.7.3/contrast.py`. The capture script serves only temporary local exports and uses a synthetic provider, original demo artwork and original video. IP lookup failure is deliberately simulated; no subscription credentials are used.

For doubled text the browser harness patches only RN Web's four Dimensions font-scale defaults in the served response. Production bundles are not modified. This exercises shared adaptive UI; it is not a claim about native Dynamic Type or the native tab/header implementations.

## Visual evidence

Before images are the supplied **native 0.7.2 captures**; after images are **RN Web previews** at the specified viewport sizes. They are useful for shared layout review, but are not pixel-equivalent native comparisons. Contact sheets summarize eight full-resolution PNGs available in the same directory. Additional captures cover the bottom of Home, track selection, VOD and episode controls, and each settings destination.

| Edition | Before | After, light / normal text | After, dark / normal text | Doubled text |
| --- | --- | --- | --- | --- |
| iPhone | [Native baseline](../verification/glowtv/audit-0.7.3/before/ios.jpg) | [393×852](../verification/glowtv/audit-0.7.3/after/ios-light-text1-contact.jpg) | [393×852](../verification/glowtv/audit-0.7.3/after/ios-dark-text1-contact.jpg) | [Light](../verification/glowtv/audit-0.7.3/after/ios-light-text2-contact.jpg), [dark](../verification/glowtv/audit-0.7.3/after/ios-dark-text2-contact.jpg) |
| Android phone | [Native baseline](../verification/glowtv/audit-0.7.3/before/android.jpg) | [412×915](../verification/glowtv/audit-0.7.3/after/android-light-text1-contact.jpg) | [412×915](../verification/glowtv/audit-0.7.3/after/android-dark-text1-contact.jpg) | [Light](../verification/glowtv/audit-0.7.3/after/android-light-text2-contact.jpg), [dark](../verification/glowtv/audit-0.7.3/after/android-dark-text2-contact.jpg) |
| iPad | [Native baseline](../verification/glowtv/audit-0.7.3/before/ipad.jpg) | [1032×1376](../verification/glowtv/audit-0.7.3/after/ipad-light-text1-contact.jpg) | [1032×1376](../verification/glowtv/audit-0.7.3/after/ipad-dark-text1-contact.jpg) | [Light](../verification/glowtv/audit-0.7.3/after/ipad-light-text2-contact.jpg), [dark](../verification/glowtv/audit-0.7.3/after/ipad-dark-text2-contact.jpg) |
| TV | [Native baseline](../verification/glowtv/audit-0.7.3/before/tv.jpg) | [1920×1080](../verification/glowtv/audit-0.7.3/after/tv-light-text1-contact.jpg) | [1920×1080](../verification/glowtv/audit-0.7.3/after/tv-dark-text1-contact.jpg) | Native TV text/remote follow-up required |

[Full screenshot index](../verification/glowtv/audit-0.7.3/SCREENSHOTS.md). Supplemental 1080p TV density previews: [light](../verification/glowtv/audit-0.7.3/after/tv-dp1080-light-text1-contact.jpg), [dark](../verification/glowtv/audit-0.7.3/after/tv-dp1080-dark-text1-contact.jpg). These use 960×540 logical pixels at 2× density, alongside the required 1920×1080 viewport captures.

### Evidence by finding

All filenames below are in `verification/glowtv/audit-0.7.3/after/`. The contact-sheet table above supplies the platform's before image and all theme/text-size variants. The completed run's exact screenshots and assertions are listed in [browser-audit.json](../verification/glowtv/audit-0.7.3/browser-audit.json).

| Findings | After capture(s) / additional proof |
| --- | --- |
| C1, H13 | iPad `home`, `movies`, `settings`; orientation unit tests. Multitasking requires native verification. |
| C2 | `episode-player`, `settings-library-organization`; [contrast ratios](../verification/glowtv/audit-0.7.3/contrast.json). |
| C3–C4, H1–H4 | TV `home`, `guide`, `player`, `vod-player`; Back policy unit tests. Native ring/key/focus behavior is not verified in a browser. |
| H5–H7 | TV `movies`, `guide`, `settings`, `player`. |
| H8–H11 | `settings`, `settings-family-controls`, `settings-library-storage`, `settings-backup-transfer`, `home-bottom`, `player-tracks`. Native alerts/announcements require follow-up. |
| H12, M5 | `home`, `series`, `guide`; loading/error branches are implemented in source, not all are exercised by the successful-provider screenshot fixture. |
| H14, M1, M6–M8 | Phone/tablet `guide`, `movies`, `series`, `search`, `playlists`, including doubled-text variants. |
| M2–M3 | `guide`, `player-tracks`, `settings-default-player` (phone) / `settings-playback` (TV), `settings-library-organization`; contrast results. |
| M4 | `playlists`, `settings-backup-transfer`, `settings-family-controls`; provider validation tests. Native keyboard/autofill and discard alerts require follow-up. |
| M9–M10 | TV `player-tracks`, `player`, `settings`, `search`; native remote/mini-player follow-up. |
| L1–L3 | `vod-player`, `settings-backup-transfer`, Android `playlists`. |
| L4 | Ready-data source branch; native cold-launch timing remains unmeasured. |
| L5–L6 | `home`, `movies`; route-ID assertions and route validator tests. Cold restoration requires native secure storage. |
| L7–L9 | TV `home`, `settings`, `settings-playback`, `search`; native focus follow-up. |

The current RN Web version ignores native `accessibilityState`; `FocusPressable.tsx` now maps it to explicit web ARIA attributes. Backup Export/Import use tab roles, visible checks and selected state. Browser verification toggles both modes. Input focus uses the contrast-safe link tone on light surfaces; native TV EditText continues to use this JS border rather than the native ring.

## Remaining limitations and next native pass

- H13 follow-up: measured native interface insets replace the fixed tab-height fallback. Native geometry assertions cover the mini player; physical-device placement remains a follow-up.
- The published 0.7.3 (703) packages include the existing TV Kotlin controller and orientation configuration changes. No native module was added; identifiers and signing are unchanged. The initial audit phase kept the existing version until the user authorized compilation and publication.
- Verify the two-tone TV ring on green/dark/light surfaces, scope and row restoration, every D-pad Back flow, Menu/hold, CH+/−, hidden-controls seeking, INFO/GUIDE and mini-player media keys on Fire TV and Android TV.
- Verify iPad Split View, Slide Over/Stage Manager and all rotations, including closing landscape playback; phones must return to portrait.
- Verify VoiceOver/TalkBack announcements, largest native Dynamic Type, form keyboard chaining/autofill/discard protection, and native cold detail/series links against the secure saved catalogue.
- Successful synthetic-provider browser flows do not validate real subscriptions, codecs, provider catch-up endpoints, native casting/PiP or encrypted transfer on devices. The existing engine/model tests and protected scope checks remain in place.

Additional TV-density review: poster width is capped at 160dp; the grid header scrolls with posters and contributes its measured height to `getItemLayout`. Tile height reserves 112dp for two title lines, metadata and padding. Guide cells reserve space for a separate On now label, so multi-line timing cannot push programme titles outside the timeline viewport. Timing uses selectedText on selected cells; ordinary secondary text on the dark selected fill would fall below 4.5:1.

## Completed verification results

- Critical, High, Medium and Low phase checks passed. Final run: `npm ci`, typecheck, 139 passing tests, three cache-cleared web exports, the 8px grid guard (457 properties) and the protected-scope guard.
- Browser: 14 required cases plus 2 supplemental TV-density cases, 316 screenshots, zero recorded page errors or document-width overflows. Both themes and doubled phone/tablet text were exercised. Backup modes were switched and their ARIA selection asserted; search results and stable detail-route IDs were asserted.
- Contrast: 36 recorded checks passed (4.5:1 for text; 3:1 for graphical state). See [checks.json](../verification/glowtv/audit-0.7.3/checks.json), [contrast.json](../verification/glowtv/audit-0.7.3/contrast.json) and [verification output](../verification/glowtv/audit-0.7.3/verification.txt). These are scoped token/surface checks, not a guarantee for arbitrary provider artwork or video frames.
- Browser previews cannot validate native playback, TV keys/focus rings, iPad multitasking/rotation, screen-reader announcements or largest native Dynamic Type. H13 native placement is covered by the release audit assertions; physical-device confirmation is still required.

Native Live search routing: `uiPolicy.ts` supplies one shared platform-to-view mapping for both the tab body and its native search callback. iPhone uses the dedicated live view; Android retains its watch view. A regression test covers this contract so native search cannot silently update a different list.

## Native release follow-up

The user subsequently authorized compiling and publishing the packages and updating the website. Release progress, native-only findings, corrections and run links are recorded in [the 0.7.3 release verification](../verification/glowtv/release-0.7.3/BUILD-STATUS.md). Native captures exposed iOS fixed controls beneath the search header and Android TV Back bypassing JS. Both are corrected in source. All final packages are published: iPhone/iPad native suites and exact-APK Android phone/API 35 TV audits passed, as did the additional Android 11 TV audit with SwiftShader graphics. The earlier Android 11 MediaCodec failure is retained in the release report. Physical-device checks remain separate.

### Final native screenshots and release results

[Release verification and known limitation](../verification/glowtv/release-0.7.3/BUILD-STATUS.md) records every package source, build, audit and publication. [Screenshot provenance](../verification/glowtv/screenshot-provenance.json) covers all 32 native captures, copied to `store-assets/` and optimized for the website. The native after galleries are [iPhone](../verification/glowtv/native/ios-home.png), [iPad](../verification/glowtv/native/ipad-home.png), [Android](../verification/glowtv/native/android-home.png) and [TV](../verification/glowtv/native/tv-home.png). Each folder also contains Guide, Player, Movies, Series, Add playlist, Search and Settings images under the same platform prefix.

A single Android 11 SwANGLE run aborted in VLC MediaCodec surface creation during channel switching; the exact same APK passed with SwiftShader. No engine or decoding-policy change was made. Hardware Fire TV playback, every remote key, iPad multitasking/rotation, VoiceOver/TalkBack and largest Dynamic Type remain explicit device follow-ups.

## Follow-up audit (ui-ux-pro-max + design skills)

Fixed in source after reviewing the 0.7.3 native captures and the website:

- **Phone guide:** the filter button now shares the row with the day picker instead of sitting alone. The selected day's check mark sits inline with its label. Channel cells show the channel logo when there is one, never two-letter initials. Rows are shorter (programme cells 80 pt, growing with Dynamic Type), so more channels fit.
- **TV guide:** no initials badge; the stray horizontal scroll indicator under the ruler is hidden on TV.
- **TV posters:** the title and group no longer touch, or clip at, the tile edge when focused (16 px inset).
- **Type sizes:**
  - TV: "Updated", connection location and "• LIVE" raised from 11 to 14.
  - Phone: LIVE badges raised from 8–9 to 11, the featured kicker from 10 to 12, and the version "CURRENT" tag from 9 to 11.
- **Add-playlist sheet:**
  - The password field has an inline eye toggle (44 pt), replacing the full-width "Show password" button.
  - The sheet's bottom padding includes the safe-area inset, so the footer clears Android's gesture bar.
- **Website (phone):** the hero screenshot strip no longer tilts and enlarges the iPhone shot. `.device-phone.ios` outranked the phone rule. Shots now sit level at one height, like an App Store preview row.

Still needs a device: D-pad pass on Fire TV / Android TV (`scripts/tv-remote-driver.py`), and the six feel tests on iPhone and Android.
