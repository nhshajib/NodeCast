# App refinement — November 25, 2026

Baseline: main `db5f56e`, published GlowTV 1.0.1. Android phone/TV 1.0.2 is now published; the new iPhone IPA remains gated on Apple CI. Identifiers, signing, installation instructions, screen transitions and persistent IPTV engines remain unchanged.

## Changes

- Phone/iPad Home and library lists use native pull-to-refresh, connected to the existing refresh generation/cache flow. Demo and disconnected views do not fetch.
- Shared loading skeletons use one native-driven opacity animation per group, stop on unmount, and stay still with Reduce Motion. Cached content stays visible while refreshing.
- Live TV category pins are per profile, bounded and validated, and travel through the existing encrypted backup format. They reorder only available groups; they do not reveal hidden or restricted categories. Phones expose a management action at the start of the category strip. TV exposes management in Library organization and long-press on categories. Each management row is one remote focus stop.
- Home features the first available favorite live channel, in saved order. Without one, it greets the user instead of promoting a recent/random title. Continue watching, recent channels, films and the rest of the library remain accessible.
- Removed the connection/IP screens, onboarding detour, network requests and their unused UI modules. `ipAddress.ts` is a pure validator retained for older saved preferences and backup imports. No live IP lookup remains. Historical release notes are retained.
- Player presentation uses a quiet top title/action row, centered transport controls and a bottom timeline/secondary actions. Header/footer measurements keep the transport out of their way. Track selection, seeking, fullscreen, external players, next episodes and the custom persistent surfaces remain intact.

## Player reference

Reviewed NuvioMobile's public `cmp-rewrite` source at `0d20af8`, particularly `PlayerControls.kt` and `PlayerOverlayScaffold.kt` in `composeApp/src/commonMain/kotlin/com/nuvio/app/features/player/`:
https://github.com/NuvioMedia/NuvioMobile/tree/0d20af8/composeApp/src/commonMain/kotlin/com/nuvio/app/features/player

The reference is Kotlin/Compose. GlowTV uses an original React Native implementation of its control hierarchy; no Nuvio branding, content, code or engines were imported. No APK was executed or decompiled.

## Supplied launch artwork

Both owner-supplied H.264 clips are exactly 4 seconds, 30 fps, silent, approximately 200 KB each. Original files are bundled unchanged in `apps/player/assets/launch/`; matching final stills are extracted for accessibility and decoder failure fallback.

The initial viewport chooses portrait or landscape (TV always landscape). Contain sizing preserves the complete artwork on phones/tablets/TV, including its existing wordmark; app text is not overlaid a second time. Rotation during launch does not restart the clip. The native splash releases only after a decoded frame or safe still is ready. The four-second visible launch is followed by a short fade once data is ready; a bounded fallback exposes the app's own loading/recovery UI if storage is delayed. Reduce Motion uses the final still and a short handoff. The dedicated launch player is disposed separately from IPTV playback.

The scope guard explicitly permits this owner-requested splash replacement and retirement of the Home IP route. It still freezes other navigation/animation definitions and persistent engine effects. Native launch background changes require the next native build. No new module is needed (`expo-video` is already installed).

## Design guidance

Applied the repository's Unslop skill (Damir Sokolovsky, CC BY 4.0, https://heydamir.design/unslop), keeping GlowTV's existing Newsreader/Instrument Sans typography, colors and 8px grid. Applied the React best-practices checklist to hooks, stable data, cleanup, control accessibility and avoiding extra dependencies.

## Verification

Results and screenshots are recorded in `verification/glowtv/refinement-2026-11-25/`. Browser checks do not verify native pull gestures, Apple/Android decoder handoff, TV remote focus, VoiceOver/TalkBack or physical-device behavior. Android packages and download metadata are now updated from passing native CI; the new iPhone IPA is still pending.

### Unslop polish

- Reduced the phone favorite-channel hero to a compact logo/title/action layout; the live list remains visible sooner. Live logos use contain sizing. Removed its circular heart backplate and unused hero/placeholder styles.
- Suppressed the duplicate generic live-channel poster shelf when those same channels already appear under Live now. Other library shelves and saved favorites remain.
- Shortened category-management copy and used a grouped list on phones. TV retains separated rows so its focus ring can expand without clipping.
- Removed the empty colored greeting panel on TV, preserved contrast in light mode, and widened the expanded rail to 224 dp so Switch playlist fits.
- Implemented TV category Menu/hold-OK through the existing native remote controller's event bridge, not only a touch long-press callback. The remote-only native smoke suite explicitly checks pin/unpin using Menu.
- Removed retired onboarding/IP steps from the active native/browser test harnesses. Kept legacy backup validation tests.

### Build and release status

The build candidate is **1.0.2 / 10003**, above the installed 1.0.1 build 10001. No identifiers, signing identity or existing screen transitions changed. The native splash background and TV Menu bridge require fresh native packages. No new dependency or native module was installed.

Physical-device testing remains skipped by the owner's earlier decision. Android design/full emulator checks (phone and remote-only TV) passed and the verified APK release is published. Full iPhone/iPad simulator checks and IPA packaging remain required before publishing the new Apple release.

Local verification: **187 app tests**, **22 Python input-driver tests**, TypeScript, UI grid/scope guards, and iOS-style/Android/TV exports pass. Four browser profiles (393×852, 412×915, 1032×1376, 960×540 at 2× scale) verify the greeting, saved-channel hero, category ordering, removed connection UI and decoded VOD transport/timeline placement. Browser TV focus is DOM focus, not proof of native D-pad behavior.

Launch verification checks normal playback on iOS-style, Android and TV previews, correct 1080×1920 / 1920×1080 media, muted playback, Reduce Motion, and blocked-decoder fallback. Clips are four seconds; measured total browser startup includes font/asset load and handoff as recorded in `launch-checks.json`.

Website build and all 27-page accessibility/HTML/runtime/request audits pass; all 9 website tests pass. Website feature/release-note copy is version-aware and will expose 1.0.2 only when real public release metadata selects it. Current download links/checksums and cross-version counters continue to refer to actual published files. Native website/store screenshots are not replaced by browser previews.

Browser evidence (not native certification):
- [iPhone Home](../verification/glowtv/refinement-2026-11-25/iphone-home.png), [category settings](../verification/glowtv/refinement-2026-11-25/iphone-category-settings.png), [player](../verification/glowtv/refinement-2026-11-25/iphone-player.png).
- [Android Home](../verification/glowtv/refinement-2026-11-25/android-home.png), [player](../verification/glowtv/refinement-2026-11-25/android-player.png).
- [iPad Home](../verification/glowtv/refinement-2026-11-25/ipad-home.png), [player](../verification/glowtv/refinement-2026-11-25/ipad-player.png).
- [TV Home](../verification/glowtv/refinement-2026-11-25/tv-home.png), [category settings](../verification/glowtv/refinement-2026-11-25/tv-category-settings.png), [player](../verification/glowtv/refinement-2026-11-25/tv-player.png).
- [Flow checks](../verification/glowtv/refinement-2026-11-25/checks.json), [launch checks](../verification/glowtv/refinement-2026-11-25/launch-checks.json).

### Native gate corrections

The first design run used an obsolete phone hero action and sampled TV video beneath the redesigned bottom scrim. The capture harness now selects the visible live-channel row and inspects the same original video band above the scrim, with unchanged RGB thresholds and black/green-UI negative controls.

The full TV remote suite exposed a real category-management bug after opening Settings: current-page items are empty there. Management now uses the active playlist’s cached sections and reapplies hidden/category access rules. Fresh build 10003 is required; build 10002 is not approved for publication.

The phone native capture also exposed fixed-height top/bottom scrims overlapping across portrait video and remaining visible after controls hid. Scrims now scale to the video bounds, stop at 160 dp, and follow the existing 180 ms ChromeLayer fade and reduced-motion policy. No playback surface or engine lifecycle changes. Browser regression checks require the shading to reach zero opacity during playback before revealing and pausing.

The build-10003 Android design and full phone/TV suites passed. The iPhone cold-start/background-resume test passed, but its design harness queried a standalone channel StaticText that is now correctly grouped into a descriptive accessible button. The harness now requires that actual live-channel button and checks it is hittable after the playlist sheet closes. App source and build numbers are unchanged for this test-only retry.

The subsequent iPhone design test passed, but the cold/resume test intermittently timed out on hittability after 60 seconds in the background. Its failure had no corresponding screen capture. The harness now waits for foreground activation, resolves a fresh Home accessibility query on every poll, and preserves the existing visible/hittable assertions without navigation or relaunch recovery. A failure records app/device screenshots and both app/SpringBoard hierarchies so a genuine app defect cannot be mistaken for a stale accessibility target. Runtime app source and build numbers are unchanged.

## Android publication

Android phone, universal TV and 32-bit TV build 10003 passed native design and full suites, signed-archive verification and publication workflow [45716750863](https://github.com/nhshajib/NodeCast/actions/runs/45716750863). [Stable APK release](https://github.com/nhshajib/NodeCast/releases/tag/glowtv-v1.0.2). Website metadata and Android/TV screenshots now use the published exact files; iPhone remains on its existing verified 1.0.1 release while full Apple CI runs. Installation instructions are unchanged. Physical-device checks remain skipped by owner decision.
