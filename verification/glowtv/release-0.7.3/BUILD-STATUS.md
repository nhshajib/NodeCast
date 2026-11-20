# GlowTV 0.7.3 release verification

Current build source: `8cc4d8fc69ed2bb01e1028baf96a134f124377a7`.

- [Android phone and TV builds](https://github.com/nhshajib/NodeCast/actions/runs/44739839074).
- [iPhone/iPad native audits and ARM64 IPA build](https://github.com/nhshajib/NodeCast/actions/runs/44739843826).

These runs are pending. No 0.7.3 download is public; website links remain on the last verified release. Native packages must pass the release gates before publication.

## Completed source and website checks

TypeScript, 139 tests, the 8px grid and protected-source checks pass. The protected guard confirms unchanged provider/storage/guide/backup models, player-engine patches, playback lifecycle effects and transition definitions. All three web exports pass. Website tests, Astro check/build, all-page accessibility/HTML/link checks and 46 Lighthouse measurements passed. See [Lighthouse scores](../LIGHTHOUSE.md).

## Findings caught by native testing

- Fixed a nullable Kotlin focus target that prevented the TV build from compiling.
- Fixed a cold-launch Hermes exception from an unavailable `Intl.PluralRules` constructor. A subprocess regression test reproduces its absence.
- iPhone Home survived tab changes, background intervals and cold relaunches. Native playback and measured mini-player placement also reached and passed their assertions. The Library screen then exposed filters under UIKit's search header. The tab root now uses native safe-area insets for fixed controls as well as lists; the test checks their geometry.
- TV native video, remote Select, media keys and INFO were exercised. Back then left the Activity on Android 15 instead of reaching the JavaScript handler. The remote controller now routes Back through ReactActivity once, preserving native IME and dialog handling. [Before-fix capture](diagnostics/tv-activity-exited-before-fix.png).
- Corrected harness-only problems: exact rail labels instead of matching Home-IP controls; D-pad scrolling to off-screen rail actions; Select to reveal hidden controls; UIKit tab-role queries; native keyboard-aware field entry and system Back to dismiss Android sheets.
- Retried an emulator SDK image download that ended with premature EOF; it did not reach the app.

## Remaining native verification

The current rebuilt packages must complete all eight screens and settings checks, decoded video assertions and native iPhone/iPad tests. Physical Fire TV input/IME behavior, iPad multitasking and rotation, VoiceOver/TalkBack, and maximum Dynamic Type still require physical-device review. Emulator or browser results do not certify these behaviors.

## Current access blocker — November 20

The APK build at run 44739839074 passed for both editions. Phone run 44742115948 captured all eight screens and traversed all eight settings destinations, with six pause/resume cycles and decoded video in the same process. Its additional re-open test stopped after Settings retained its scroll position; the local harness now re-taps Settings to exercise scroll-to-top before opening Appearance.

Three follow-up commits are saved locally: the Settings retap test, an Android-native-sheet task heading, and compact 8px Android form spacing with foreground-only Connect targeting. TypeScript, 139 tests, all three exports, the grid and protected scope pass for these changes.

The workspace GitHub CLI token now returns HTTP 401 (Bad credentials). Connected GitHub tools can read existing run results, but do not expose workflow dispatch or release publication. The user has been asked to refresh workspace repository access, without sharing a token in chat. Local changes are preserved; no unverified 0.7.3 release or website download link has been published. The iPhone run continues independently.

## Access restored and final native follow-up

GitHub CLI authentication and repository push/admin access were verified after the user refreshed access. All saved commits have been pushed.

Current package source is `5a9a0484d6a3f18c2ea3fbfbc4e7a195c36665d7`:
- Android: https://github.com/nhshajib/NodeCast/actions/runs/44752201174
- iPhone/iPad and IPA: https://github.com/nhshajib/NodeCast/actions/runs/44752206397

The preceding run passed both iPhone tests and the iPad design test. Its iPad cold/resume test reported a visible Home control that was not hittable. The iOS measurement probe now uses noninteractive, accessibility-hidden RN views and measures the already inset tab body rather than nesting a native safe-area view. The modern Android Back dispatcher bridge, previously limited to phones, now also applies to TV on API 33–35. Legacy TV key handling remains in the remote controller. D-pad tests enter content with Right and recompute geometry after each key.

These corrections retain all player lifecycle effects, engines, data models and transitions. TypeScript, 139 tests, spacing/scope guards and all three exports pass. New native results are pending. No 0.7.3 release has been published yet.
