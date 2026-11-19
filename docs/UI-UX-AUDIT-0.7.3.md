# GlowTV UI/UX audit — 0.7.3 work branch

Scope: app UI only. No version bump, release, website edit, signing change, native module addition or engine/data-model migration. Native builds are deliberately deferred. Baseline native screenshots are [iPhone](../verification/glowtv/audit-0.7.3/before/ios.jpg), [iPad](../verification/glowtv/audit-0.7.3/before/ipad.jpg), [Android](../verification/glowtv/audit-0.7.3/before/android.jpg), [TV](../verification/glowtv/audit-0.7.3/before/tv.jpg).

## Scope-check reconciliation

The prior guard required the entire TV remote controller to equal 0.7.0. C3/C4 and H3/H4 explicitly require changing that UI controller. The guard now permits these authorized UI changes while retaining exact protected model, engine patch, lifecycle-effect and navigation-motion checks. Additional explicitly requested UI exceptions, if needed, are recorded here rather than described as unchanged behavior.

## Critical

| Finding | Status | Implementation |
| --- | --- | --- |
| C1 | Fixed in source; native verification pending | `app.json`, `app.config.js`, `orientationPolicy.ts`, `restoreOrientation.ts`, `usePlayerOrientation.ts`, `navigation/NodeCastProvider.tsx`: multitasking allowed, hardware iPad/tablet restores unlocked orientation; phones restore portrait; player landscape remains. No `expo-device` dependency added. |
| C2 | Fixed | `Player.tsx`: next-episode icon, spinner, title/subtitle use `primaryText`; `LibraryOptions.tsx`: selected segments use selected/selectedText tokens. |
| C3 | Fixed in source; native verification pending | `TVRemoteController.kt`: two-tone ring, 1.05 scale, outline/background radius, no EditText ring; TV rows/tiles draw on unclipped containers. |
| C4 | Fixed in source; native verification pending | Scoped rail; controller prioritizes latest non-rail scope and normalized stable remembered control IDs; library reads saved focused item; first category/search/action controls have preferred IDs. |

## Verification

Phase checks and final browser screenshot/contrast results are recorded in `verification/glowtv/audit-0.7.3/checks.json`. Native focus rings, real D-pad/key flows, iPad multitasking/rotation, VoiceOver/TalkBack and maximum Dynamic Type require a future native build and physical-device testing. They are not claimed as verified by web exports.

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
| H13 | Partly fixed | Responsive poster columns, 720pt readable content and tablet Home cards are implemented. Mini player uses safe-area plus platform tab-height fallback; SDK 58 native tabs do not expose a root-level measured bar-height hook. Actual native placement needs confirmation, especially iPad top tabs. |
| H14 | Fixed in source; native Dynamic Type follow-up | Guide cells size with font scale; channel column shows full names instead of stream IDs (no channel-number field exists in the protected model). Chips/pills grow, series header scrolls with episodes, delete sheet expands to full height. |
