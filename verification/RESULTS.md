# 0.6.7 verification

TV gets a text-first channel list and revised library organization; phone library layouts stay unchanged. All editions include compact translucent playback overlays. TypeScript and 125 pure tests pass on the final TV source; iPhone/mobile were compiled from the shared-overlay source with 123 tests. Browser checks cover 3,000-channel bounded rendering/lazy requests and playing-video menu continuity, touch seeking, orientation, idle dismissal and wake.

All three standalone Release binaries compiled and passed archive/package/version checks. The iPhone Release simulator stayed open before arm64 IPA packaging. Exact Android binaries passed the native suites recorded in the per-edition build records: mobile includes encrypted export and fresh-device restore; TV includes remote library organization/restart persistence, core playback/guide/catch-up/PIN/history and continuous-video settings/idle behavior. Tested APK SHA-256 values match the release assets.

[Exact build provenance](android/native-0.6.7-builds.json) · [TV library checks and screenshots](tv-library/README.md) · [Playback overlay checks](playback-overlay/README.md)

Physical Hisense/Fire TV speed, iPhone/Android hardware playback, real-provider codecs, PiP/AirPlay and physical file-picker behavior remain unverified. Emulator key-dispatch timing is not a physical-TV frame-rate benchmark. APK size still includes VLC and three processor architectures. The records below describe historical versions.

# Current downloads — TV 0.6.6; iPhone and Android mobile 0.6.4

TypeScript and **116 automated tests** pass. The exact TV APK passed native core, settings and stability audits on Android 11/API 30. The continuous synthetic live stream retained one HTTP session, remained visible and advanced after all player panels; initial panel focus, track Back and media keys passed. IP details passed Refresh, Save/Cancel and actual reference saving/removal. Search, per-channel options, guide/catch-up, PIN protection and watched-state checks passed.

A 3,000-channel/300-category fixture retained at most 103 native focus candidates; native key handling measured 1.077 ms p95 across 41 samples. This does not establish physical TV frame rates. API 35 emulator video produced a black texture before settings and is not marked passed. Physical Hisense/Fire TV and real-provider codecs remain unverified.

[Exact build provenance](android/native-0.6.6-builds.json) · [Audit, results and screenshots](tv-stability/README.md)

The working iPhone and Android mobile downloads remain unchanged at 0.6.4. The following records are historical verification.

# 0.6.5 baseline verification

TypeScript and **116 automated tests** pass. The exact TV 0.6.5 APK passed separate native remote playback/catch-up and settings/search suites, using D-pad/Select/Back and keyboard text without taps or swipes. Checks cover repeated cold starts, synthetic VLC and native video, Next episode, mini-player continuity, SQLite guide persistence, PIN protection, Clear recents, playlist switching, switches/radios, search, per-channel choices, provider-supported catch-up decoding, guide return, Fire TV Menu and long Select. The compact TV guide was visually reviewed from native captures. Signature, offline bundle and ARM32/64/x86-64 checks passed; the signing certificate matches 0.6.4.

[Current build provenance](android/native-0.6.5-builds.json) · [TV audit and screenshots](tv-remote/README.md) · [Feature comparison and plan](tv-remote/FEATURE-COMPARISON.md)

Physical Hisense/Fire TV behavior and real-provider archives still require device confirmation. iPhone and Android mobile binaries remain unchanged at 0.6.4; their verification records below describe that baseline.

# 0.6.4 baseline verification

TypeScript and 110 automated tests pass. Encrypted transfer UI checks passed for mobile and TV, including wrong-password rejection, import preview and keeping existing profiles. Android native checks cover cold starts, SQLite persistence and family protection; mobile additionally saves an encrypted file through DocumentsUI and restores into a fresh emulator app. TV additionally checks VLC, remote Next episode, mini-player continuity and Clear recents. The iPhone Release simulator stayed open before arm64 device compilation and IPA archive verification. Physical iPhone sharing, PiP/AirPlay and real-provider compatibility need device confirmation.

[Build provenance](android/native-0.6.4-builds.json) · [Transfer checks](transfer/README.md)

## Historical verification — NodeCast 0.6.3 iPhone

The current iPhone download is `NodeCast-0.6.3-unsigned.ipa` (35,715,277 bytes, SHA-256 `cad83b2aa80366ca49bd5c475f65b8d7e08c49046e555f44fbd6902643dbdfdd`). It passed arm64 device compilation, embedded JavaScript and VLC linkage, archive integrity and SHA-256. A Release iPhone simulator launch stayed open after the file-system library was built from the same modules as the rest of the app. The current Android TV download is `NodeCast-tv-0.6.1.apk` (223,655,215 bytes, SHA-256 `fd46cea42b169d81c117f2413b67a91c2ccc75544e2e306e6bd076113619fa74`), version code 601. Its release signature, bundle check, and emulator startup/remote smoke test passed. The Android phone download remains the 0.6.0 APK. Physical PiP/AirPlay and provider streams still need device confirmation.

# Verification — NodeCast 0.6.0

TypeScript and 95 tests pass. Mobile/TV browser integration covers local import, programme search, PIN/wrong-PIN/background locking, sleep expiry and the same video element through mini-player restore. Exact released APKs passed native startup, SQLite persistence and family controls; TV also passed VLC, mini-player continuity and D-pad episode navigation. The IPA passed native compilation, arm64/platform/bundle checks, ZIP integrity and SHA-256. Physical PiP/AirPlay and provider compatibility still need device confirmation.

[Scope and limits](roadmap/README.md) · [Build provenance](android/native-0.6.0-builds.json)

The following records describe historical versions.

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

## 0.2.7 — fullscreen, launch artwork and home IP

- TypeScript and 70 automated tests pass. Added cases for M3U HTTP 404 privacy and guidance, final redirect URLs, bounded VLC-agent retry, single-quoted metadata, stream-header isolation and equivalent IPv6 addresses.
- Metro exports succeeded for iOS, Android and web. Native configuration includes the splash-screen and screen-orientation plugins, portrait initial orientation and fullscreen iPad support for rotation locks.
- Browser checks (393 × 852) used a documentation-only public IP fixture. Confirmed setup requires explicit home Wi-Fi/VPN-off confirmation, saves the IP, proceeds to provider entry, shows a matching-home warning, supports skip and Settings re-entry, and displays 0.2.7 history. No page errors. Screenshots: `verification/home-ip`.
- Native VLC stays in the same keyed stage when fullscreen changes. Landscape controls include exit, rotate, pause and retry; movie fullscreen uses expo-video's native controller. Physical-device rotation and launch-screen appearance require verification with the new IPA.
- A provider's HTTP 404 means its playlist endpoint is unavailable. The app explains the error and offers user-selected Xtream connection when the M3U export link contains compatible details. No claim of a successful provider-specific M3U import without a working endpoint.
- IP comparisons never report a verified VPN state. Warnings are suppressed while refreshing, after a failed lookup or when the result is older than a minute.
- Additional browser check exercised the complete M3U-404 → explicit Xtream alternative → loaded profile flow against a fixture server. Recovery screenshot uses example-only login details.
- Isolated iOS prebuild confirmed `EXDefaultScreenOrientationMask=Portrait`, all landscape directions in supported orientations, `UIRequiresFullScreen=true`, and the generated 200-point branded launch storyboard.
- Native Release build succeeded in GitHub run 40428846265. Packager verified arm64 iPhoneOS, embedded JavaScript, linked VLC and IPA ZIP integrity. Artifact download succeeded through the GitHub connector. The 34,688,244-byte IPA is `NodeCast-0.2.7-unsigned.ipa`; metadata/checksum is in `verification/home-ip/iphone-build.json`.

## 0.2.8 — fullscreen clipping correction

- Live video now stays outside the ScrollView in a stable sibling stage. Fullscreen uses absolute bounds on all four edges, without retained scrolling or automatic content insets; controls are overlaid. The library's video wrapper receives explicit 100% width/height in both modes, with the inline 16:9 ratio applied only to its containing stage.
- TypeScript and 70 tests pass; iOS Metro export succeeded.
- Browser geometry regression fixture uses the actual `LivePlayerLayout` with a 16:9 test card, not a native VLC render. All picture corners remain inside the viewport at 1280×588, 844×390, 852×393 and 393×852. A retained details-scroll position does not shift fullscreen. Five repeated fullscreen cycles keep the test surface mounted once; no page errors. Reproducible fixture, script, screenshot and measurements are in `verification/fullscreen`.
- Physical iPhone playback/rotation still needs the updated IPA. Aspect-ratio fitting can leave side bars on a wider screen; the picture should remain complete.
- Native Release build and IPA validation succeeded in GitHub run 40431252010. The artifact download was verified through the GitHub connector. Build metadata and SHA-256: `verification/fullscreen/iphone-build.json`.

## 0.2.9 — animated startup

- Replaced the immediately dismissed static-only launch with a native-image → animated React Native intro → app handoff. The intro waits for its own image and layout before hiding the native splash, then lifts the brand mark, expands fine signal rings and reveals the serif wordmark and tagline. Native-driver opacity/transform animation runs once per app mount.
- Local profiles load behind the overlay; provider and IP requests do not block its completion. Setup modals and accessibility/touch access to the underlying app wait until the intro completes. Reduce Motion uses a brief still introduction.
- TypeScript and 70 tests pass. Final Metro exports succeed on iOS, Android and web.
- Actual App browser checks confirm the mark moves, the wordmark reveals, the intro completes with IP lookup unavailable, Welcome becomes usable, returning-user setup appears only afterward, and Reduce Motion keeps text stationary at compact 320×568. No page errors. Screenshots and a browser animation recording are in `verification/startup`; these are not recordings of native iPhone handoff.
- Native iOS initial status-bar style is light for the ink launch screen. Physical iPhone launch handoff still needs confirmation after installing the new IPA and fully closing/reopening the app.
- Standalone iPhone 0.2.9 Release build succeeded in run 40432821157. The package checks verified arm64 iPhoneOS, embedded JavaScript, linked VLC and ZIP integrity; GitHub connector artifact download succeeded. Checksum and build details: `verification/startup/iphone-build.json`.

## 0.3.0 — navigation motion and retained tabs

- Replaced conditional tab unmounting with lazy, persistent tab scenes. Hidden content freezes its last committed props, cannot receive touches/accessibility focus, and updates when reactivated. Scene identity resets when changing profiles/demo.
- Incoming content uses a 220 ms native-driver opacity/6-point transition. The outgoing scene stays visible until the incoming animation's completion callback; interrupted transitions stop and the final tap wins. The tab indicator moves on a stable native animated node, with immediate press feedback. Reduce Motion removes navigation movement.
- Cached independent Library/Favorites indexes, filtered results and category groups avoid rebuilding a large catalogue on tab changes. Library/Favorites retain independent queries/categories; Home and Settings retain scroll positions. Hidden Home stops IP-check timers/listeners and refreshes on return.
- Modal content remains mounted through iOS dismissal rather than clearing into an empty page. Internal route changes use a 190 ms transition; the playback surface is excluded. Web full-screen modals inherit window safe-area context instead of measuring insets inside a sliding portal, which produced a collapsed form during verification.
- TypeScript, 70 tests and iOS Metro export pass. Actual App browser verification used a synthetic 30,000-channel server. Checks cover independent queries, retained Home/Settings nodes and scroll positions (210/180 points), Playback → Settings return, retained closing content, 24 rapid tab changes, no empty sampled transition frame (minimum opacity sum 1), indicator alignment and compact Reduce Motion. No page errors or >50 ms long tasks were observed during that browser rapid-tap sample; this does not establish native device FPS.
- Screenshots, reproducible script and browser navigation clip: `verification/navigation`. Final UIKit transition feel and native frame timing require an iPhone check with the updated standalone build.
- Standalone iPhone 0.3.0 Release build succeeded in GitHub run 40437282300. The package checks verified arm64 iPhoneOS, embedded JavaScript, linked VLC and ZIP integrity; GitHub connector artifact download succeeded. Checksum and build metadata: `verification/navigation/iphone-build.json`.

## Android 0.4.0 mobile and TV

- Separate `android-mobile` and `android-tv` entry points, installation notes, download links and verified build metadata.
- Both APKs include embedded VLC and run without Expo Go, a PC server or weekly renewal.
- TV adds fullscreen movie/episode controls with a bottom-right Next episode action that follows provider episode ordering, crosses seasons and hides at the final episode. The previous stream is released before the following episode opens.
- Fixed a native Android VLC activity-initialization race; repeated cold starts passed on both editions.
- TypeScript, 76 tests, browser episode/retained UI checks and shared Metro exports pass. Exact signed APKs passed native emulator startup; TV also passed generated MPEG-TS / MP4 playback, remote Next selection and Back navigation.
- Source: a70e88a11cd85d5f8319b37a5935a8a978105928. Build: 40529764464. Native verification: 40532664044. See `verification/android/README.md` for evidence and scope. Physical hardware / customer provider streams remain untested.
