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
