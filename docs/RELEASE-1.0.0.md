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
- **Stable publication:** only after the native feature tests and the physical-device checks pass, including the Hisense Fire TV.
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
| Native feature tests, device benchmarks, Hisense Fire TV check | Pending (needs builds 99xx) |

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
- Thirteen Python regression tests cover these driver behaviours, including real XML parsing and hard failures on native-reader timeout/EOF. These are test-only changes: application code, signing, version 9901 and APKs are unchanged. Re-run the design and full emulator suites against build `45023643502` from the updated `main` before declaring native checks passed.
- Physical-device upgrade, performance, iPad and Hisense Fire TV checks remain pending. Do not set stable build 10000 or publish on the strength of emulator tests alone.

Notes:
- **Buffering watchdog:** the native engine's existing status-driven loading timer (15 s in `loading`) plus the bounded retry policy remain the watchdog. They react only to real status events, never to an unchanged live position.
- **Autoplay countdown:** it fires from the native engine's `playToEnd`. The VLC engine reports no end event, so it offers the Next episode button instead.
- **Tests:** 139 → 176, all passing.
