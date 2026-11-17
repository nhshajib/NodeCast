# GlowTV audit and capture evidence

The app remains one shared project under `apps/player/`. The Astro website is independent under `website/`. Original brand inputs and mockups were committed first, in `2a78952`; all 60 source brand files still match that commit byte for byte.

## Checks

- App TypeScript: pass. Regression suite: **130 passed**, none failed or skipped.
- Design safety guard: original animation calls/timings, provider logic, storage models and playback policy match the previous source. Bundle IDs, URL scheme, backup formats and signing configuration remain unchanged.
- Website strict TypeScript: zero errors, warnings or hints. Astro static production build: **23 pages**, zero build warnings.
- Every generated page: axe WCAG 2.2 AA scan, HTML validation, runtime errors, image requests, internal links, metadata, canonical URLs and layout overflow checks at **360, 768, 1280 and 1920px**. See [website-audit.json](website-audit.json).
- Lighthouse: mobile and desktop on every page. [Full per-page scores](LIGHTHOUSE.md), [JSON](lighthouse-scores.json). These are local production-output lab measurements, not live HTTPS or field INP measurements.
- Structured data: 22 current JSON-LD payloads exactly match saved successful official Schema.org responses. The custom 404 breadcrumb URL changed afterwards and passes local structure checks; its fresh official recheck is pending because the validator now returns an HTTP 405/rate-limit challenge. See [schema-validation.json](schema-validation.json). The cached official responses are in [schema/](schema/).
- External repository, releases and issue links resolve. The custom domain's live HTTPS checks are blocked by connection access, and Pages is not configured. See [external-links.json](external-links.json) and [hosting setup](../../website/HOSTING.md).

## Native verification

**Current merged-navigation status:** the rebuilt TV APK passed the full remote-only audit in [43813323481](https://github.com/nhshajib/NodeCast/actions/runs/43813323481), and its eight screenshots have been refreshed. Native phone validation is still in progress. The first Android tab selection after import exposed a stale native-tab state handoff; the focused native-host fix is building in [44002344387](https://github.com/nhshajib/NodeCast/actions/runs/44002344387). iPhone cold-start/resume checks passed in [43822412868](https://github.com/nhshajib/NodeCast/actions/runs/43822412868); native form inset and keyboard corrections are being verified in [44000097756](https://github.com/nhshajib/NodeCast/actions/runs/44000097756). No merged phone pass or current phone screenshot refresh is claimed yet. Main has not been updated.

The phone/native records below are historical passes from before the newer native-navigation merge. They remain useful provenance, but do not establish that the merged phone app is ready. Native screenshot imports require an actual passing result bundle and all eight images; empty or failed artifacts are rejected.

- Android phone and TV release APK compilation, bundled JavaScript, native VLC architectures, installed package IDs and APK signature validation pass in [build 43735861623](https://github.com/nhshajib/NodeCast/actions/runs/43735861623).
- TV: **native emulator audit passed** using D-pad, Select, Back and keyboard text only; no touch input is allowed by the harness. It imports a synthetic provider and XMLTV guide, renders actual live video pixels, visits all eight capture screens and opens eight settings destinations. [Run](https://github.com/nhshajib/NodeCast/actions/runs/43735933260), [result](native/tv-audit.json).
- Android phone: the complete native eight-screen and eight-settings audit passed in [run 43738370813](https://github.com/nhshajib/NodeCast/actions/runs/43738370813). [Result](native/android-audit.json), [decoded-frame inspection](native/android-frame-audit.json).
- iPhone: the native cold-start/resume test passed on iPhone 17 Pro Max / iOS 26.5 Simulator. It checks six tab round trips, background intervals of 1/15/60 seconds, and three cold relaunches. [Evidence](native/ios-resume-audit.json). The corrected full iPhone capture test has also passed in [run 43736278167](https://github.com/nhshajib/NodeCast/actions/runs/43736278167); the iPad cold-start/resume and eight-screen tests also passed. See [iPhone result](native/ios-audit.json) and [iPad result](native/ipad-audit.json). The standalone unsigned iPhone device Release build also passed; [the actual IPA metadata](native/ios-build-audit.json) confirms GlowTV, the original bundle ID, iOS 16.4 minimum, iPhone/iPad support, compiled icons and native VLC.
- All **32 native captures** are usable: eight each for iPhone, iPad, Android phone and TV. The initial iPad snapshot was captured before a decoded frame appeared. The isolated capture now shuts down the completed simulator, waits for actual video pixels and passes; [frame audit](native/ipad-frame-audit.json). The player engine was unchanged. [Capture provenance](screenshot-provenance.json) distinguishes every native image from a browser candidate.

The current TV APK captured in the remote audit came from `50f2cb2`; its exact app and capture-harness commits are recorded in `native/tv-audit.json`. Subsequent native navigation and form corrections are phone-specific. The screenshots use original abstract motion, generated landscape artwork and invented names. They contain no real IPTV account or broadcaster content.

## Necessary visual fixes and limits

The native audit exposed duplicate Inter PostScript names, a launch-artwork callback that could stall the handoff, and an Android playlist sheet whose percentage height collapsed. Distinct font names, bounded launch callbacks and an anchored sheet fix these visual issues. Normal animation timing and player/data logic are retained. The tiny LIVE badge uses a slightly darker red to meet white-text contrast.

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
