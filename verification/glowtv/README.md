# GlowTV audit and capture evidence

The app remains one shared project under `apps/player/`. The Astro website is independent under `website/`. Original brand inputs and mockups were committed first, in `2a78952`; all 60 source brand files still match that commit byte for byte.

## Checks

- App TypeScript: pass. Regression suite: **130 passed**, none failed or skipped.
- Design safety guard: original animation calls/timings, provider logic, storage models and playback policy match the previous source. Bundle IDs, URL scheme, backup formats and signing configuration remain unchanged.
- Website strict TypeScript: zero errors, warnings or hints. Astro static production build: **23 pages**, zero build warnings.
- Every generated page: axe WCAG 2.2 AA scan, HTML validation, runtime errors, image requests, internal links, metadata, canonical URLs and layout overflow checks at **360, 768, 1280 and 1920px**. See [website-audit.json](website-audit.json).
- Lighthouse: mobile and desktop on every page. [Full per-page scores](LIGHTHOUSE.md), [JSON](lighthouse-scores.json). These are local production-output lab measurements, not live HTTPS or field INP measurements.
- Structured data: all 23 current JSON-LD payloads exactly match saved successful official Schema.org responses, with zero errors and warnings. The custom 404 page received a fresh successful response after the service became available again. See [schema-validation.json](schema-validation.json) and the saved official responses in [schema/](schema/).
- External repository, releases and issue links resolve. The custom domain's live HTTPS checks are blocked by connection access, and Pages is not configured. See [external-links.json](external-links.json) and [hosting setup](../../website/HOSTING.md).

## Native verification

All three native editions build successfully. The final Android phone APK, including the five visible Material navigation labels, passes compilation, signature, package-ID and native-library checks in [44078474690](https://github.com/nhshajib/NodeCast/actions/runs/44078474690), from `b7bd9c2`. The TV APK passes those checks in [44009489980](https://github.com/nhshajib/NodeCast/actions/runs/44009489980), from `a591349`. The standalone iPhone device Release build passes in [44004969792](https://github.com/nhshajib/NodeCast/actions/runs/44004969792), from `96bc32c`. Its actual IPA was independently inspected: ARM64, original bundle identifier, iOS 16.4 minimum, iPhone/iPad device families, embedded JavaScript, compiled icons and VLC, with no test runner inside the app. See [device-build metadata](native/ios-build-audit.json).

- **iPhone:** both native UI tests passed: six tab round trips, 1/15/60-second backgrounds, three cold relaunches, playlist import, EPG, decoded live video and all eight capture screens. [Result](native/ios-audit.json), [resume checks](native/ios-resume-audit.json), [decoded frame](native/ios-frame-audit.json).
- **iPad:** both cold-start/resume and eight-screen native tests passed in the same Apple workflow. The harness targets UIKit's top tab labels on iPadOS. [Result](native/ipad-audit.json), [decoded frame](native/ipad-frame-audit.json).
- **Android 11 phone:** the final APK passed the complete eight-screen and eight-settings native audit in [44081851830](https://github.com/nhshajib/NodeCast/actions/runs/44081851830). The first Guide tap is checked only after a verified import; text entry is asserted before submitting. All five tab labels are visible. [Result](native/android-audit.json), [decoded frame](native/android-frame-audit.json).
- **TV / Android 11:** the rebuilt TV APK passed the full D-pad, Select, Back and keyboard-only audit in [44076804369](https://github.com/nhshajib/NodeCast/actions/runs/44076804369). It verifies provider import, EPG, actual live video, all eight capture screens and eight settings destinations. No touch input is allowed. This is the representative Fire TV-era lab runtime, not a physical Hisense test. [Result](native/tv-audit.json), [decoded frame](native/tv-frame-audit.json).
- **Additional Android 15 x86 emulation:** VLC's decoded surface remains black in both phone and TV emulators despite valid native view bounds. Different GPU backends and Vulkan settings did not resolve it. The logs select the virtual `c2.goldfish.h264.decoder`; a normal property override did not change that selection. The host-video-path comparison in [44083348409](https://github.com/nhshajib/NodeCast/actions/runs/44083348409) also failed the frame check. No Android 15 rendering or physical-device compatibility pass is claimed. See [the rendering follow-up](ANDROID-15-EMULATOR.md) before publishing installers. Production decoder policy remains unchanged.

All **32 native captures** have been refreshed: eight each for iPhone, iPad, Android phone and TV. Imports require positive test summaries, all eight images and original decoded scene pixels. Both the bright-green band and the original dark scene region are checked, so green UI controls cannot qualify as video. Historical and failed test bundles never qualify as a current pass. The original scene, artwork and invented channel names contain no broadcaster content or real IPTV credentials. No new public installer release is claimed.

## Necessary visual fixes and limits

The native audit exposed duplicate Inter PostScript names, a launch-artwork callback that could stall the handoff, and an Android playlist sheet whose percentage height collapsed. Distinct font names, bounded launch callbacks and an anchored sheet fix these visual issues. Native UIKit headers and automatic form scroll/keyboard insets keep sheet controls hittable. The Android phone VLC view opts into native child layout within its portrait stage; decoder selection and playback policy are unchanged. Normal animation timing and player/data logic are retained. The tiny LIVE badge uses a slightly darker red to meet white-text contrast.

Provider features and advanced connection controls remain available, so long setup forms scroll on short phones rather than hiding controls to reproduce the sample layout. Screens show the actual supplied library: Continue watching appears when history exists. The TV guide and hero preserve remote navigation and existing playback controls.

There is no tvOS target in the current repository. Supplied Apple TV icons are retained for future work; no Apple TV binary, layered asset catalog or screenshot is claimed. Physical iPhone, Hisense Fire TV, hardware AirPlay/PiP, real provider reliability and physical 4K output still need device testing. Browser checks cannot establish those results.

No new public GlowTV release or store listing has been invented. Store links stay explicit pending labels; APK availability, sizes, hashes, minimum SDK and release dates activate from verified release metadata.

## Reproduce

```sh
cd apps/player
npm ci
npm run typecheck
npm test
# Supply a checkout of the preceding design as NODECAST_BASELINE_DIR:
NODECAST_BASELINE_DIR=/path/to/baseline node scripts/check-design.mjs

cd ../../website
npm ci
npm run typecheck
npm run build
npx playwright install chromium
npm run audit
LH_MODE=mobile node scripts/lighthouse.mjs
LH_MODE=desktop node scripts/lighthouse.mjs
python3 scripts/schema-audit.py
```

Use `CHROMIUM_PATH=/usr/bin/chromium` when running with the shared workspace's installed browser. `CAPTURE_ALL=1 npm run audit` saves every page at all four widths. Native audit workflows run independently from Metro; the release apps contain their own JavaScript bundle.
