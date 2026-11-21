# GlowTV 0.7.3 release verification

## Published packages and native audits

All three **0.7.3 / build 703** packages are public. [Public download checks](public-downloads.json) confirm HTTP 200 for each file. Version, size, SHA-256 and minimum OS match the actual published assets and their generated release metadata.

| Edition | Package build / source | Native verification | Publication |
| --- | --- | --- | --- |
| iPhone / iPad | [44761996308](https://github.com/nhshajib/NodeCast/actions/runs/44761996308), `f81da181dd8632b9f04a56e23294b79f29db935e` | Both devices: 2 passed, 0 failed; all eight screens, cold launches, background/resume, decoded video and mini-player geometry | [Verified publication](https://github.com/nhshajib/NodeCast/actions/runs/44848750921), [IPA release](https://github.com/nhshajib/NodeCast/releases/tag/ios-v0.7.3) |
| Android phone | [44849613228](https://github.com/nhshajib/NodeCast/actions/runs/44849613228), `f1f48f6621904741c42337b29d215f26ed6ae777` | [API 35 audit](https://github.com/nhshajib/NodeCast/actions/runs/44851008761): eight screens/settings, six same-process pause/resume cycles and Back after reopening | [Verified draft/upload](https://github.com/nhshajib/NodeCast/actions/runs/44852360755), [public APKs](https://github.com/nhshajib/NodeCast/releases/tag/glowtv-android-v0.7.3) |
| Android TV / Fire TV | Same Android build/source | [API 35](https://github.com/nhshajib/NodeCast/actions/runs/44851615852), [API 30 / SwiftShader](https://github.com/nhshajib/NodeCast/actions/runs/44852270604): remote-only navigation, eight screens/settings, decoded frames, Select/media pause, INFO, CH+/− and Back | Same verified upload; made public after the additional API 30 audit passed |

Native Android capture harness: `10944540f93997b581eeb768f40f403b2d828c72`. Gallery images come from the exact final packages. The API 30 frame is retained as additional evidence. Local IPA archive, ARM64, embedded JS, original bundle ID, four tablet orientations, multitasking configuration and published checksum match are recorded in [ios-package.json](ios-package.json).

The final Android-only profile-storage wording and TV fixes do not change iOS runtime behavior. No native module was added; original package IDs and signing configuration are retained. All 32 store/gallery captures use the original synthetic fixture, without real channels or copyrighted programmes.

## Completed source and website checks

TypeScript, 139 tests, the 8px grid (457 properties) and protected-source checks pass. The protected guard confirms unchanged provider/storage/guide/backup models, player-engine patches, playback lifecycle effects and transition definitions. All three web exports pass. Website tests, Astro check/build, all-page accessibility/HTML/link checks and 46 Lighthouse measurements passed. See [Lighthouse scores](../LIGHTHOUSE.md). Fresh screenshots and generated public-release metadata are included in the final website audit.

## Findings caught by native testing

- Fixed a nullable Kotlin focus target that prevented TV compilation.
- Fixed a cold-launch Hermes exception from an unavailable `Intl.PluralRules` constructor. A subprocess regression test reproduces its absence.
- Native iPhone captures exposed filters under the native search header. The tab root now respects native safe-area insets for fixed controls as well as lists, with geometry assertions.
- The mini-player measurement probe is noninteractive and accessibility-hidden. iOS measures its already inset body without another native safe-area view.
- Android 13–15 predictive Back bypassed the legacy TV key handler. The existing modern Back dispatcher bridge now also applies to TV, retaining legacy key handling and native IME behavior.
- Focus scale changed screen-space origins without changing widths, making same-column rail buttons look like Right targets. D-pad geometry now uses stable descendant layout bounds, including scrolling, without changing focus animation.
- Android native sheets retain their content heading where UIKit-style header titles are unavailable; compact form spacing remains on the 8px grid.
- iOS ordinary headers already inset Home and Guide; only translucent search tabs receive an additional top inset. Native geometry assertions catch duplicate header spacing. Programme sheets use automatic native insets and do not repeat the sheet title.
- The TV rail expands over a fixed-width slot instead of resizing and remounting the poster grid; Right restores active content focus.
- Harness corrections preserve real assertions: foreground-sheet Connect targeting, no duplicate Go submission, keyboard dismissal before page Back, UIKit tab-role queries, native tab retap scrolling and fresh D-pad geometry after each key.

## Android 11 virtual-codec diagnostic

Final-APK API 30 run [44851619375](https://github.com/nhshajib/NodeCast/actions/runs/44851619375) reached decoded playback, Select pause, dedicated media keys and INFO, then aborted inside VLC MediaCodec `CreateSurface` during Channel Up (`p_sys->video.p_surface`). The prior API 30 audit of the same TV UI had passed. This is retained as a native failure, not reclassified as a passed test; [crash excerpt](diagnostics/tv-api30-mediacodec.txt). The same APK then passed the full audit with the existing SwiftShader emulator graphics backend in run [44852270604](https://github.com/nhshajib/NodeCast/actions/runs/44852270604). This comparison does not establish that physical hardware can never encounter a codec issue. The app's engine patches, decoding policy and lifecycle effects remain unchanged.

## Physical-device follow-up

Physical Fire TV input/IME behavior, iPad multitasking and rotation, VoiceOver/TalkBack, maximum Dynamic Type, native casting/PiP and real-provider compatibility still require device review. Emulator and browser results do not certify these behaviors. No native module was added; identifiers and signing are unchanged.

## Live website and hosting follow-up

The live download pages show 0.7.3, matching public file checksums. All three Home screenshot files match the optimized native source bytes. HTTPS, robots and sitemap are reachable; see [live-site.json](live-site.json).

Vercel currently redirects the apex host to `www`, while source canonicals use the apex. Repository/GitHub access cannot change that existing Vercel project-level domain rule. In **Vercel → Project Settings → Domains**, connect `glowtv.app` directly to **Production** (no redirect), then redirect `www.glowtv.app` to `glowtv.app`. No DNS or MX changes are needed for this existing connected-domain setup. An app-level reverse redirect would risk a loop and was removed. Downloads and the updated website work through the current redirect.
