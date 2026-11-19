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
