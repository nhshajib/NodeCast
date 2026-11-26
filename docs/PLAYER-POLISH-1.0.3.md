# GlowTV 1.0.3 — launch, live controls and browsing performance

The reported screenshot is the **native OS splash**, configured separately from `StartupSplash`. The previous release still supplied `glowtv-mark.png` to Expo's splash plugin. Live playback also normally chooses VLC, while the earlier transport redesign primarily changed the other engine. The phone did not supply a channel-step callback, and VLC only exposed Next on failure.

## Corrections

- Replaced the old native mark with a transparent drawable. Android still requires its system launch layer; it now contains no logo or second intro. The launcher icon stays unchanged. Generated Android resources were checked: all five density images have zero alpha.
- The supplied portrait/landscape films are unchanged. Native handoff happens when the film's first-frame poster is laid out, then playback starts, so its beginning is no longer hidden behind the OS layer. The final still is used for Reduce Motion, decoder failure and the end of the film. Fonts load in parallel with the film instead of delaying it behind the OS splash. The four-second film, short existing fade and bounded storage watchdog remain. System status text is hidden during the intro.
- Added shared, labelled Previous / Play-Pause / Next live controls on **both native and VLC engines**. Phone callbacks use the visible Live view when applicable, otherwise the authorized live catalogue. TV retains the filtered list and falls back to its cached authorized catalogue when launched from Home. Hidden and family rules apply before stepping; single-channel lists have no ineffective step buttons. Changes retain the existing controlled stop/open path.
- VLC now has a quiet title/header, centered transport and bottom audio/external/fullscreen actions. Controls fit the actual inline video bounds instead of positioning from the whole device. Settings, tracks, rotation, external players, remote keys and persistent playback are retained.
- Prepared catalogue rows and normalized strings are reused between search queries. Removed redundant legacy text indexes on the ranked-search path. Selected categories and hidden/list semantics are unchanged. Weak caches release retired row snapshots and invalidate normalized values after row edits.
- Recent channels now build one lookup and sort history once, instead of rebuilding the full catalogue for each of up to eight results.
- Stabilized the native video-view PiP callback so one-second clock updates do not defeat its memo boundary and send unchanged view props through the native bridge. Decoder effects and playback engines were not changed.

Nuvio reference: public `NuvioMobile` Kotlin player controls at `0d20af8`: a quiet top row, central transport and bottom timeline/actions. This is an original React Native adaptation, not copied source. Applied the repository's existing Unslop polish guidance (Damir Sokolovsky, CC BY 4.0, https://heydamir.design/unslop) and React best-practices review. Existing colors, fonts, navigation and animation definitions remain.

## Verification

- 192 app tests pass, including prepared-query ranking/access parity, cache reuse/invalidation, recent-channel access/deduplication and wrapped channel navigation.
- TypeScript, UI grid and protected playback/navigation scope guards pass.
- Browser walkthroughs pass at iPhone, Android phone, iPad and TV sizes: visible Next/Previous switch channels, native-engine transport/timeline positioning, hidden/revealed scrims, category pins and no public-IP requests. [Checks](../verification/glowtv/player-polish-1.0.3/checks.json).
- Browser launch checks pass for portrait, landscape, Reduce Motion and blocked decoder. [Timing](../verification/glowtv/player-polish-1.0.3/launch-checks.json). Total page startup includes font/asset loading; the supplied movie itself is four seconds.
- A synthetic 100,000-title Node benchmark measured 203–505 ms with reconstruction per query versus 24–40 ms with prepared rows. [Measurements](../verification/glowtv/player-polish-1.0.3/search-benchmark.json). This is not a physical-device FPS claim.
- Native Android capture now requires normal-playback Next and Previous using actual touch or D-pad, decoded fixture video and the same app process. iPhone/iPad UI tests also require these controls to change and restore the channel before taking the player screenshot.

Browser captures use Expo's native-engine web implementation; **they do not certify VLC**. Native builds and simulator/emulator checks must pass before replacing downloads. Physical-device checks remain skipped by the owner's prior decision. No new native module, provider model, backup format, signing identity or installation instruction changed.

Screenshots: [Android live](../verification/glowtv/player-polish-1.0.3/android-live-player.png), [iPhone live](../verification/glowtv/player-polish-1.0.3/iphone-live-player.png), [iPad live](../verification/glowtv/player-polish-1.0.3/ipad-live-player.png), [TV live](../verification/glowtv/player-polish-1.0.3/tv-live-player.png). Native screenshots will be added only after successful CI.

## Build status

**1.0.3 / 10004**, now published for Android mobile. TV and iPhone builds remain candidates pending their native checks. Existing public 1.0.2 Android downloads are not overwritten, and the iPhone download remains on its last verified release until the replacement passes CI. The superseded 1.0.2 iPhone attempt was cancelled because it does not include these corrections.


## Mobile-first publication

Android mobile build 10004 passed [native design/playback](https://github.com/nhshajib/NodeCast/actions/runs/45723583990) and [full features / encrypted backup](https://github.com/nhshajib/NodeCast/actions/runs/45722739853). [Publication](https://github.com/nhshajib/NodeCast/actions/runs/45725139671) passed on its second attempt; GitHub's workflow token could not create the new historical-source tag, so the connected repository owner account created the exact-source draft/tag before the workflow attached and verified the files. No verification was bypassed.

[Stable mobile APK release](https://github.com/nhshajib/NodeCast/releases/tag/android-v1.0.3), source `cff547e8884f2ce0abc93930c401eef56f5443c7`, 242,149,257 bytes, SHA-256 `2ef3ca5349b84c4b4a69676ac3e7a1add0121fc2ddc119e8579e98ce257bee49`. The actual compiled splash resource maps to five fully transparent PNGs; both original launch films and the previous private signing certificate are verified in the APK.

The first design attempt proved channel switching but started a second UiAutomation reader before pause/resume; the duplicate reader was removed without changing the app or weakening assertions. The replacement run verifies all eight screens, seven Settings destinations, decoded fixture video, Next/Previous and six pause/resume cycles in the same process.

Native evidence: [player](../verification/glowtv/native/android-player.png), [Home](../verification/glowtv/native/android-home.png), [native capture audit](../verification/glowtv/native/android-audit.json), [package](../verification/glowtv/player-polish-1.0.3/mobile-package.json), [full feature/backup checks](../verification/glowtv/player-polish-1.0.3/mobile-full-checks.json). Native screenshots now replace the Android gallery only. TV and iPhone remain pending their own checks; existing installation instructions and cumulative download baselines are retained.

The mobile website build and typecheck passed with zero diagnostics; all 27 pages passed the axe/HTML/runtime/request audit and all 10 website tests passed. The existing installation pages and signing script retain their exact hashes.
