# GlowTV 0.7.2 UI audit evidence

The [screen-by-screen audit](../../docs/UI-UX-AUDIT-0.7.2.md) records findings for all eight requested categories, before/after examples and links to the updated React Native and styled-components code. The [complete code diff](../../docs/UI-UX-0.7.2.patch) uses published 0.7.0 (`5c1ce75`) as its baseline. The [design tokens](../../apps/player/src/designTokens.ts) define the 8px grid and primary-green, neutral and semantic-red color families.

## Scope and automated checks

- App TypeScript and all **130 regression tests** pass.
- [Grid guard](check-ui-grid.cjs): **430** padding, margin and gap properties pass, including conditional branches. Optical geometry, safe areas and native system metrics are excluded.
- [Scope guard](check-ui-scope.cjs): provider, storage, guide, backup and playback models; JS engine lifecycle effects; animation calls; and TV remote handling match the 0.7.0 baseline.
- [Browser audit](browser-audit.json): loaded screen and settings checks on iPhone, iPad, Android and TV, with both appearances and phone/TV viewport variants. Retained poster and row components respond to appearance changes without list remounts.
- [HTTP fixture proof](ui-072-http-fixture.json): actual HEAD and byte-range responses use the same original video bytes. This changes only the test origin, not production provider APIs.

## Native builds and captures

The [release record](release-0.7.2.json) links each public installer to its exact source, build workflow, native audit, SHA-256, file size and update identity. Native build and test-harness source commits are recorded separately.

- iPhone and iPad: two UI tests each pass in [44458856991](https://github.com/nhshajib/NodeCast/actions/runs/44458856991), covering native navigation, cold launch, suspension, import, guide and original decoded video. The same workflow builds the standalone ARM64 device IPA. [Archive inspection](native/ios-build-audit.json) verifies identity, minimum OS, embedded JavaScript/VLC, icon assets and absence of a test runner.
- The selected iPhone Home capture comes from the earlier passing iPhone test on identical production UI inputs: [per-image provenance](native/ios-home-provenance.json). The later test caught that screen while its import sheet was still dismissing; it is not used for marketing.
- Android phone and TV: final native audit and capture sources are recorded in [phone results](native/android-audit.json) and [TV results](native/tv-audit.json). The TV audit forbids touch input. Phone and TV jobs may pass in separate workflow runs against the exact same APK build; a failed job is never counted as evidence for its edition. The publisher verifies both positive job conclusions and their native result bundles, including phone pause/resume and TV Select/media-key proofs. Both require original scene pixels and all eight screens and settings destinations. Phone pause/resume must retain the same process; TV additionally exercises Select and dedicated media keys before guide-preview replay.
- [Screenshot provenance](screenshot-provenance.json) records all 32 native originals and per-image workflow evidence. Website derivatives preserve actual app content; no replacement artwork or text is composited into a capture.

## Website checks

[Current website audit](website-audit.json) records the production output across 23 pages at 360, 768, 1280 and 1920px: HTML validation, axe, images, internal links, metadata, structured-data basics, runtime errors and overflow. Website strict TypeScript and static builds are checked separately.

[Lighthouse scores](LIGHTHOUSE.md), [official Schema.org responses](schema-validation.json) and [old external-link results](external-links.json) are **historical measurements**, not fresh scores for this UI release or the subsequently redesigned website. Do not use them as current performance, live HTTPS or field-INP claims. Downloads use release API metadata rather than invented sizes or hashes.

## Limits and native exception

The only new native guard ignores an unchanged Android picture-in-picture property so a visual prop update does not schedule unnecessary decoder recreation. The existing engine version, teardown behavior, JS lifecycle, bundle/application identifiers and signing identities remain unchanged. A proposed teardown modification was investigated and reverted.

A non-seekable MP4 test origin triggered a VLC crash in the Android x86 emulator; the final native transport checks cover a seekable origin with correct HTTP ranges. This is a known test-coverage limit, not a claim that every provider or codec works. Physical iPhone, Android phone, Hisense Fire TV, 4K output, hardware AirPlay/PiP and real provider testing remain separate. There is no native tvOS target, and no Apple TV build or physical-device test is claimed.

## Reproduce

```sh
npm --prefix apps/player ci
npm --prefix apps/player run typecheck
npm --prefix apps/player test
node verification/glowtv/check-ui-grid.cjs
node verification/glowtv/check-ui-scope.cjs
npm --prefix website ci
npm --prefix website test
npm --prefix website run typecheck
npm --prefix website run build
CHROMIUM_PATH=/usr/bin/chromium npm --prefix website run audit
```

Native audit workflows install the compiled apps with embedded JavaScript; Metro and Expo Go are not involved. The phone harness reads native accessibility nodes without UIAutomator's long idle wait, keeping the app's real animation and auto-hide timings unchanged.
