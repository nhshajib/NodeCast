# GlowTV 1.0.0: release record and phase gates

1.0.0 is free and account-free on iPhone/iPad, Android phone and Android TV/Fire TV. It ships the 0.7.4 design audit fixes (`docs/CODEX-APP-AUDIT-0.7.4.md`) and the research-led features below. Recording, timeshift, multiview, cloud sync, QR pairing, new provider protocols and external metadata services are out of scope.

## Phase 0: frozen baseline

| Item | Value |
|---|---|
| Stable source | `glowtv-v0.7.4` → `ac9bf14618c6348b5c9a7993ce10f2dc6de01cfb` |
| iOS bundle ID | `com.nhshajib.nodecast` |
| Android package IDs | `com.nhshajib.nodecast` (phone), `com.nhshajib.nodecast.tv` (TV) |
| Android signing | Private key in repository secrets; certificate pinned by `GLOWTV_ANDROID_SIGNING_CERT_SHA256` (`apps/player/scripts/android_release_signing.py`) |
| Baseline checks | `npm run typecheck` clean; `npm test` 139 passing; `check-ui-grid` and `check-ui-scope` passing |
| Build numbers | 0.7.4 = 704. Previews use 9900–9999; **10000 is reserved for the stable 1.0.0 build**. |

- **Fixtures:** `apps/player/tests/fixtures/library.mjs` covers Xtream, remote M3U, local file, multiple profiles, protected categories and a version-1 backup.
- **Flags:** `apps/player/src/featureFlags.ts` holds compile-time internal flags, one per phase. A flag turns on only after its phase passes its gate. Users never see these switches.
- **Scope check:** `verification/glowtv/check-ui-scope.cjs` now allows the model changes this plan needs. The playback policy, recovery, native playback and backup transaction journal stay frozen, together with the native engine patches and the player lifecycle effects.

## Phases

Each phase lands as its own commit. The 139 original tests must still pass, and each phase adds its own tests.

| Phase | Scope | Flag |
|---|---|---|
| 1 | Shared `CatalogRepository` with paged queries (items, total, snapshot ID, cursor), stored in native SQLite with FTS and a memory adapter for web and tests. Legacy JSON is migrated after verification and kept as a fallback. Stream URLs and credentials stay out of the catalogue. | `catalogRepository` |
| 2 | Refresh runs: capture → fetch → validate → stage → compare → commit. Older generations and other profiles never win. Ranked search (exact, then prefix, then broader) with no lost matches. Newest-first sorting only from real provider timestamps. | `rankedSearch` |
| 3 | Named lists (references only), hiding individual items, unavailable saved items, latest-first series display, unwatched filter, jump to continuation, and an optional cancellable 10-second next-episode countdown (off by default). | `organization` |
| 4 | Guide matching order: manual mapping, then exact EPG ID, then a unique exact normalized name. Fuzzy matches are suggestions only. Guide health counts, saved time offsets applied once, history kept within the archive window, and distinct failure states. | `guideRepair` |
| 5 | Buffering watchdog driven by real status events, previous channel, return to live (controlled reopen), exact language-variant matching, and allowlisted playback help. | `playbackAssist` |
| 6 | Paste-and-preview provider setup (masked) and backup payload v2 with lists and new preferences. v1 backups still import. Import preview offers Add or Update, with the encryption envelope unchanged. | `transferPreview` |

## Release gates

- **Native UI:** iPhone/iPad rotation and multitasking, Android Back, TV remote-only navigation, focus restoration, large text and screen readers.
- **Performance targets** (measured against 0.7.4 on the same devices):
  - warmed search p95 under 250 ms after debounce;
  - cached first content within 1.5 s;
  - no unexplained regression above 10% in first-frame time or memory.
- **Stable publication:** only after the emulator and simulator checks pass. *Owner decision, 2026-11-23: physical-device checks (including the Hisense Fire TV) are skipped for 1.0.0; the release is gated on emulator and simulator CI only.*
  - The stable build is 10000.
  - Sizes, checksums and OS requirements come from the real packages.

## Status

| Phase | State |
|---|---|
| Design audit fixes | Done (`3efbbca`) |
| 0 | Done (`6b7452a`) |
| 1 Catalogue repository | Done (`cb65489`) |
| 2 Refresh and search | Done (`8e4ec8d`) |
| 3 Organization and series | Done (`27b8b9a`) |
| 4 Guide repair | Done (`c88f6d9`) |
| 5 Playback assistance | Done (`144a8ba`) |
| 6 Setup and transfer | Done (this commit) |
| Native feature tests (emulator/simulator) | Passed: Android full `45136394577`, design `45132775093`; iPhone/iPad `45101665000` |
| Device benchmarks, Hisense Fire TV check | Skipped by owner decision |

### Preview check investigation — 2026-11-22

- Android build `45023643502` (9901) compiled both editions successfully. The design check `45025464120` and full check `45025466998` failed; they are not release approval.
- The phone full-check screenshot shows the saved PhoneTest playlist on Home, and the TV full-check screenshot shows Native Guide Match in the guide. The input helper had already sent Go, then tried to press a form button after submission. Explicit-submit checks now dismiss the visible keyboard once without Go, then activate the real Connect / Save / PIN / backup action. Go submission remains available to other checks.
- The TV design driver was looping between the scrolling sheet and rail while seeking the fixed Back header. It now keeps sending Up toward that header, allowing Android to finish scrolling the body before leaving it. The check must still acquire actual Back focus and activate it using Select; touch input remains forbidden.
- The next full rerun exposed Android's stale `mInputShown` flag after the keyboard disappeared (confirmed by both failure screenshots). The helper now sends at most one Back after editing and waits for the next real control, rather than polling that stale flag. On phones, Connect targets the foreground form action and ignores Home's covered tab bar.
- The next TV design check passed Back, Home, initial playback, INFO/channel keys and guide preview. It then selected during a scope transition and reached the player while seeking Home. Before sending Select, the driver now waits for native focus repair and rechecks the focused label; it never selects a different control to continue. The phone design job passed.
- The phone full check then connected and loaded XMLTV successfully, but searched for the obsolete label `dark appearance`. Appearance's visible and accessible labels are now `Dark` and `Light`. Native and browser check selectors now use those labels, and the phone check also requires Dark's checked state.
- iPhone run `45025254996`: `testColdStartsAndBackgroundResumeKeepHomeVisible` passed (257.631 s). The design test reached Search, then tried to open Settings from that tab although Settings is intentionally a Home-only header action. The test now returns through the real Home tab before opening Settings. The run as a whole failed and iPad/device-build steps still need a successful full rerun.
- TV design run `45028421958` passed the previously failing guide-to-Home transition, full player and Movies. Its series screenshot assertion incorrectly expected the phone-only Start series hero; TV's wide sheet exposes episodes directly. The TV assertion now requires both named fixture episodes and native focus on the first episode before capture. Phone still requires Start series.
- A source comparison of the remaining TV settings walkthrough found obsolete routes too: Connection details now opens from Home, Home IP reference from Settings, and the playlist picker names the profile without a text checkmark. The walkthrough follows those real routes and confirms the destructive Remove reference IP alert instead of assuming one-tap deletion.
- Android design run `45029279860` passed on both editions. Full TV run `45029461100` exposed UIAutomator's idle wait exceeding the unchanged 4-second control timer while live video updates. Full TV now uses the same immediate native accessibility reader as the green design suite. The smoke workflow builds that existing Java reader for TV suites too; publication gates, app timers and player code are unchanged.
- That full run's phone job rejected the deliberately wrong PIN, then timed out during the correct unlock. The failure screenshot shows Unlock busy; the immediately following UI tree contains the unlocked category controls. PIN UI waits are now bounded at 180 s, with phone wait timings printed. The 100,000-round derivation and both wrong-PIN/correct-PIN assertions are unchanged. This is CI tolerance, not evidence of acceptable physical-device unlock performance.
- Full run `45030614033` phone startup was covered by an Android `Pixel Launcher isn't responding` dialog. The full startup check now applies the same exact launcher-only recovery as design capture, guarded by the emulator property and retaining the ANR screenshot/XML. GlowTV ANRs/crashes are never dismissed. All app startup and feature assertions remain required.
- Its full TV job passed live playback, miniplayer, next-episode playback, PIN/category protection, guide persistence and clear recents, then looked for Backup's hidden in-page H1. Native sheet headers intentionally suppress those duplicate H1s. Backup checks now require the visible Export backup control; final channel-options checks require Save playback options instead of their similarly hidden H1.
- TV run `45031770236` hit the intermittent menu-close race again. Normal Select was rechecked, but the special reveal-controls wake path still pressed Select from a stale snapshot, potentially selecting a newly mounted menu's preferred Back. All wake paths now recheck the real focused label before Select, with regression tests requiring zero presses after focus changes and exactly one press while reveal remains focused.
- That run's phone job completed encrypted export, but fresh-device restore selected Home's covered Explore demo button instead of the welcome screen's identically labelled button. Welcome actions now target the last foreground match, ignore the covered tab bar, and require the welcome screen to close before navigating to Settings. The rest of encrypted restore assertions remain unchanged.
- A genuine native TV focus defect was isolated from run `45032772567`: after clearing recents, Down from the left toolbar chose the rail over the wide first channel row. The row overlapped the directional beam but its centre incurred a greater cross-axis distance penalty than the sidebar. Native focus now prefers beam-aligned candidates before distance; the driver uses the same directional policy. A remote-only regression requires Down from Recently watched to focus Play Example Live Test before the settings walkthrough. Horizontal category selection also rechecks settled focus before Select.
- This native TV change requires fresh APKs. Both preview build counters are now **9902**, with stable 10000 still reserved; iOS UI code, package IDs and signing remain unchanged. Build 9901 (`45023643502`) must not be used to verify the new TV navigation assertion. Build fresh Android phone/TV APKs, then run design and full against that new build ID. A full iPhone 9902 build is also required for matching preview artifacts; the 9901 workflow passed both iPhone and iPad UI audits before device compilation.
- Seventeen Python regression tests cover the driver, foreground welcome actions, real XML parsing, hard failures on native-reader timeout/EOF, and the captured toolbar/list/rail geometry. Playback, transaction and navigation-animation scope guards remain required; no player engine or security parameters changed.
- Fresh restore in phone run `45034094834` completed the import but exposed a real shared-phone navigation bug: reloading the provider tree erased in-memory page keys while Expo Router retained the Backup route, showing This page has closed. The existing family data-reload counter is now exposed as a UI revision. Phone navigation waits for the reloaded vault/protection state, returns Home once per revision, and covers/hides expired content until Home is active. Cold deep links and ordinary Back navigation do not trigger this recovery. Import/encryption/storage transaction code is unchanged. The restore smoke test explicitly rejects the expired-page state.
- This shared iPhone/Android UI fix advances both preview counters to **9903**. Fresh 9903 builds supersede 9902 for final gates; no module, package ID, signing, player lifecycle or animation changes were added. The navigation policy has regression coverage for cold start, loading/protection waits, and once-per-reload acknowledgement.
- Physical-device upgrade, performance, iPad and Hisense Fire TV checks remain pending. Do not set stable build 10000 or publish on the strength of emulator tests alone.

Notes:
- **Buffering watchdog:** the native engine's existing status-driven loading timer (15 s in `loading`) plus the bounded retry policy remain the watchdog. They react only to real status events, never to an unchanged live position.
- **Autoplay countdown:** it fires from the native engine's `playToEnd`. The VLC engine reports no end event, so it offers the Next episode button instead.
- **Tests:** 139 → 177 app tests, all passing; 18 emulator input-driver regression tests also pass. Typecheck, both web exports, and the grid/scope guards pass for preview 9903.
- Preview 9902 design passed on TV, and iPhone full run `45034879844` passed. Phone design `45036747877` reached Settings but its downward-only search started at a retained bottom scroll position. The walkthrough now retaps the real Settings tab before each subsection. Full TV `45036754932` passed the toolbar-to-channel Down regression, then searched vertically for a horizontally offscreen category. It now enters a visible chip and uses Left to reveal All; signed clipped bounds are preserved and regression-tested. These are input-driver fixes, not app navigation changes. Fresh 9903 native runs remain required for the restore-routing change.
- Native TV screenshot review found another app issue in the 960×540 dp emulator viewport: a poster plus labels exceeded the space below the persistent filters, clipping the focused title. Preview **9904** measures the grid viewport and fits the 2:3 artwork above the unchanged readable metadata; columns, filters, focus IDs, options and transitions remain intact. Row measurements use the same fitted tile height. The layout policy covers short/tall viewports in a regression test. Fresh 9904 native builds are required; earlier runs are superseded.
- Preview 9904 local verification: typecheck, **178 app tests**, **18 input-driver tests**, grid/scope guards and phone/TV web exports pass. A browser geometry check at 960×540, 1280×720 and 1920×1080 confirms the entire TV movie card and title fit below the fixed controls. This is browser evidence, not native remote or physical-device approval. Superseded 9903 builds `45083389335` and `45083391784` were cancelled before starting their checks.

### Previews 9905–9906 and stable 10000 — 2026-11-23

- iPhone/iPad build `45092453658` (9905 code) passed its simulator UI audits and produced the IPA.
- Android 9906 build `45097190542` passed the design suite `45099553351` on phone and TV.
- Full run `45095118397` (9905) failed in two test drivers. Both were driver problems; the app behaved correctly in each:
  - On phone, after a restore, the native header's back button is announced as **"Navigate up"**, not "Go back". The backup smoke now uses a `back()` helper that tries the native label, then the older label, then the system Back key.
  - On TV, "Dark did not update" read the radio's checked state in the same frame as Select. The failure dump shows Dark `checked=true`. The check now polls for up to 3 s.
- Full run `45099555694` (9906) passed Light/Dark on TV and stopped at the refresh options. The driver looked for "Refresh after 60 minutes", but the app labels the option "Every 1 hours". That label was also ungrammatical on phone and TV. Both now read **"Every hour"**, through the shared `refreshInterval`, and the driver uses the real labels.
- Stable **10000** is rebuilt from the commit with this label fix. The earlier 10000 builds (`45101374785`, `45101377308`) are superseded. Physical-device checks were skipped by owner decision; the release is gated on emulator and simulator checks.
- Stable gate, Android build `45101660839`:
  - Design `45105396869` passed.
  - The full run `45105399008` passed on phone, including the backup restore with the native "Navigate up".
  - On TV the full run passed Light/Dark and the refresh and search options, then stopped on **Categories**. That page had no starting focus inside its list, so focus stayed in the left menu, where Down only moves between menu items. Categories below the fold, such as "Smoke test", could not be reached.
  - The first category row now has preferred focus, as Library preferences got in 9906. Android is rebuilt. The iPhone build `45101665000` is unaffected, because this file is TV-only.
- Build `45108425588`:
  - The full run on phone passed again.
  - The design run on phone failed on a truncated UI Automator dump (XML parse error, then broken pipe). That is an emulator transport fault, not an app or driver assertion.
  - On TV, focus still stayed in the left menu after choosing Categories. The native controller applies preferred focus only when a focus scope mounts or is renamed, and switching tabs did neither.
  - The Library organization view now has a scope named after its tab (`tv-scope:organize:<mode>`), so each tab switch moves focus into that tab's content.
- iPhone build `45101665000` passed its simulator audits. IPA SHA-256: `f06a445a6b23bac10eb089ecc55c5df38c96b7b6cbdcaa422e9277f09a99a011`. Published through `publish-iphone-download.yml`.
- Build `45113256759`:
  - Design `45115543850` passed on phone and TV.
  - The full run's TV job now passed Library organization and Categories.
  - It stopped on Home, looking for "Connection details". The audit fix had taken the IP/VPN card off Home without adding the Settings entry that the audit asked for, so TV had no route to connection details.
  - TV Settings now has a **Connection details** row ("Public IP and VPN check"), and the driver opens it from Settings.
- Build `45118058428`:
  - Design `45120400989` passed on phone and TV.
  - The full run `45120403351` passed on phone, the fourth full phone pass.
  - On TV it got through connection details, including refreshing, saving, cancelling and removing the home IP reference. After Back, focus landed on the rail's **Switch playlist** button and could not move.
  - When the rail expands to 200 dp, the nav items stretch to 184 dp, but Switch playlist stayed 48 dp and centred. That placed it outside the rail's visible area, so Up found nothing.
  - It now matches the other rail items: 184 dp wide when the rail is expanded, with a "Playlists" label.
- Build `45123306112`:
  - Design `45126027894` passed. Full run `45126030471` passed on phone; on TV it got through the rail fix and back to Settings.
  - It then looped between "Add playlist" and "Buy me a coffee" and never reached the tiles above.
  - When no control is ahead, the native controller scrolls half a page and then focuses a revealed control. After Up it picked the lowest visible control, so Up near the top of a page sent focus to the bottom.
  - It now picks the nearest revealed control beyond the origin in the pressed direction.
  - The emulator driver now reverses its scan only when focus stops moving, or when a wrapping list revisits the same control. The driver has a new regression test, for 19 in total.
- Build `45129931552`:
  - Design `45132775093` passed, and the paging fix compiled. Full run `45132778572` passed on phone.
  - On TV the full run passed Home IP reference, search and channel playback options, then reported that the "Saved…" confirmation was not found. The dump shows it is rendered, but below the fold.
  - The driver's `reveal()` returned as soon as the label existed anywhere in the tree, including offscreen nodes with inverted bounds, so it never paged. It now pages until the label is on screen; the regression test fails on the old driver. That makes 20 driver tests.
  - This is a driver-only fix, so the full run is repeated on the same build.

### Stable 1.0.0 published — 2026-11-23

- **Android phone and TV:** `glowtv-v1.0.0`, published 08:30 UTC.
  - Built by `45129931552` from `4e7d421`.
  - Design check `45132775093` and full check `45136394577` both passed on phone and TV.
  - `GlowTV.apk`: 241,669,688 bytes, SHA-256 `851578cefa47adecc5d4092768fc858009714a27b7cf8a54561c6efaac4290cb`.
  - `GlowTV-TV.apk`: 240,142,894 bytes, SHA-256 `b0862108274bc05e0e04f12b152eaede43fef778a731713f58681cb14b1d3f4c`.
  - Android API 24 or later.
- **iPhone/iPad:** `ios-v1.0.0`, published 04:40 UTC.
  - Built by `45101665000` from `37906a6`, with simulator UI audits passed.
  - `GlowTV-1.0.0-unsigned.ipa`: 32,540,598 bytes, SHA-256 `f06a445a6b23bac10eb089ecc55c5df38c96b7b6cbdcaa422e9277f09a99a011`.
  - iOS 16.4 or later.
- **Website:** download metadata for all three editions is updated. The build, tests and audit pass, with zero axe, HTML, runtime or request issues on every page.
- Physical-device checks were skipped by owner decision; the release was gated on emulator and simulator checks.
- **Follow-ups:**
  - On TV, saving channel playback options moves focus to Back, and the confirmation sits below the fold.
  - The TV Settings "Connection details" tile duplicates the network card's "VPN and IP details" button.
