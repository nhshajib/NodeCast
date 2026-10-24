# Verification — final reference-led design, October 23, 2026

- TypeScript: passed (`npm run typecheck`).
- Provider/parser, IP, external-link, and secure-vault tests: **27 passed** (`npm test`).
- iOS Metro/Hermes export: passed. This validates the JavaScript bundle; it is not an Apple native build or an installable IPA.
- Web Metro export: passed.
- Chromium at 390×844, 2× scale: welcome, Home/IP, reference-IP comparison, stale-IP handling, live library, favorites, movie grid/search, movie details, native-player screen, external-player disclosure/browser fallback, preferences, provider validation, Xtream login, episodes, multi-profile switching, favorite isolation, and deletion/cancellation all passed. **No page errors.** See `ui-checks.json`.
- 13 captures in `screenshots/` were made from the actual browser preview after transitions finished. The supplied design-reference images were not reused as app screenshots.
- Demo films/public test streams are used for visual review. IP/location values are simulated: the displayed IPs use documentation-only ranges; London is a fixture, not a geolocation observation. Home/Weekend profile names and the sample provider/episodes are test fixtures. No actual IPTV account was used.
- The final visual review corrected literal line breaks, decorative-icon accessibility labels, unintended segment shadows, missing arrow glyphs, and screenshots taken during modal transitions.

Still unverified: physical iPhone/Expo Go execution, Keychain behavior on a physical device, actual IPTV provider transport/codec compatibility, external VLC/Infuse handoff to installed iPhone apps, audio/subtitles, interruption handling, and rotation. Browser checks do not establish those behaviors.

The existing source ZIP has not been rebuilt or replaced. Screenshot images/PDF are review artifacts only, as requested. No sign-in or Supabase integration is enabled.

## Research-led feature milestone

- TypeScript passed; **47 automated tests passed**.
- Updated web and iOS Metro/Hermes exports passed (JavaScript validation, not an IPA).
- Updated Chromium fixture run passed: explicit export-link import, password visibility, hidden categories, cross-media search, favorites ordering, actual video progress events, one-tap resume, Start over, completion, subtitle-off preference, cached results after refresh failure, metadata/history credential-field exclusion, and cancellation when closing playback. Xtream now/next display assertions also passed. No page errors; see `milestone-ui-checks.json`.
- `screenshots/14-continue-watching.png` shows the actual updated browser Home using simulated provider/IP data. Physical iPhone/native behavior remains unverified as described above.
- No package/ZIP was updated.

## 0.2.1 live playback, navigation and search fixes

- TypeScript and **57 automated tests** pass, including global-receiver timer regression, alternate stream paths, direct source preservation, M3U non-rewriting, profile format validation, search variants and consistent versions.
- Web and iOS JavaScript exports pass; these are not standalone native builds.
- Targeted browser checks: Playback Back/Close; saved live-format preference; Settings version history; search beyond a previously selected category; BBC1/BBC-1 matching; failed HLS followed by alternate endpoint and actual playback events; closing cancels pending fallback; failed-stream escape/external actions; format disclosure; and navigation at 320px width. See playback-fixes-ui.json.
- The alternate .ts endpoint fixture deliberately serves MP4 bytes to verify source switching. This does **not** validate native MPEG-TS codecs. Deliberately failed media endpoints produce expected expo-video web promise rejections; the report records those separately from unexpected page errors. No blanket browser-error-free claim is made for failed native media.
- The original milestone browser regression also passes: movie progress, resume, restart, completion, track preference, favorites/category organization, metadata-only storage and cached refresh failure.
- Screenshots 15 and 16 show actual browser fixture screens, with no real account data.
- Exact real-provider live failure remains unverified. iPhone safe-area behavior, actual HLS/TS content and VLC handoff require the user's retest. Existing local profiles are preserved; no server credentials were accessed.

## 0.2.2 custom native build workflow

- Added Expo SDK-matched expo-dev-client and separate development, preview and production EAS profiles.
- TypeScript and all 57 existing tests pass. Expo native configuration introspection resolves the dev-client, video and secure-store plugins and generates iOS plist/entitlement/pod configuration. This is not an Xcode compile or physical-device validation.
- EAS project ID is locally configured from the user's supplied value. The selected bundle identifier is com.nhshajib.nodecast; neither remote project ownership/slug nor Apple identifier availability is established by local config.
- No cloud build, submission or Apple signing was performed from this workspace. See docs/NATIVE-BUILDS.md.

## 0.2.3 embedded live-TV compatibility engine

- TypeScript and **65 automated tests** pass; final web and iOS Metro exports succeed. Engine-policy tests cover module absence, native overrides, movie/episode isolation, TS/direct URL order, signed M3U preservation, profile migration and observed server error classification.
- Native config introspection resolves expo-libvlc-player; this checks configuration, not CocoaPods resolution/Xcode compilation.
- EAS whoami reports Not logged in in this workspace. No signed build was produced or submitted.
- expo-libvlc-player currently references VLCKit 4.0.0a25 on iOS. Native dependency compilation, actual in-app VLC decoding, track controls, interruptions and stream release remain unverified until a custom iPhone build is tested.
- User confirmed external VLC plays the provider; the supplied log showed HTTP 405 and byte-range/content-length incompatibility in Apple's player. No credentials, real URLs or pasted logs are included in this repository.
- Browser fallback regression passes, including disabled built-in VLC when the module is absent, clear rebuild guidance, Back/Close, search, format persistence, alternate URL mechanics and narrow layout. See compatibility-engine-ui.json. Four expected SDK web media rejections came from intentionally failed streams; no unexpected page errors. This does not test native VLC.

## 0.2.4 design audit and polish

- TypeScript and all 65 existing behavior tests pass. Actual browser review covers 390×844 and 320×568, long names/IPv6, field focus, current player selection, saved live format, unavailable native engine, advanced options and release expansion. See design-polish/checks.json. No browser page errors.
- Captures in design-polish use simulated provider/profile data and documentation-only IPs. See docs/DESIGN-REVIEW.md for the findings, implemented fixes, selected contrast pairs and screenshot gallery.
- No real-iPhone keyboard, Dynamic Type, VoiceOver or native VLC validation is established by these screenshots. Standalone IPA work remains separate.
- Final web and iOS Metro exports pass. These validate JavaScript packaging, not an IPA or native compilation.
