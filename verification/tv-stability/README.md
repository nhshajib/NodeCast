# TV 0.6.6 stability audit

This work follows physical-device reports that returning from the live player settings blanked the video, connection details did not accept remote input, and navigation felt slow. The 0.6.5 emulator smoke checks did not exercise every player-menu return or the connection-details window.

## Corrections

| Area | Finding | Correction |
| --- | --- | --- |
| Live player settings | An opaque full-screen panel changed the accessibility/native host structure around the video; native props could also trigger decoder initialization again | TV opens a side panel, keeps explicit persistent native video hosts and a memoized VLC surface, and ignores identical VLC source/options updates |
| Connection details | The mobile native Modal uses a separate Android window, outside the activity's remote controller | TV uses its normal navigation window and a compact two-column connection page |
| Panel opening | Fabric can change native view hierarchy without a global layout event, leaving focus on an old control | Invalid/hidden focus is repaired before drawing; the native test checks initial report-panel focus |
| Focus movement | React focus styling and repeated whole-tree scans ran during navigation | Android draws its focus indicator natively; traversal is pruned and cached, and layout repair is coalesced |
| Focused library tile | A tile-level onFocus callback updated the entire browsing state for every move | Focus stays in the native controller; selecting a title still saves its browsing context |
| Long catalogues | Every category was mounted and the grid retained more offscreen rows than needed | Category, media, guide and episode lists use bounded virtualization; large organization lists are searched/paged |
| Playback history | Live updates repeatedly persisted history; fullscreen progress rebuilt hidden library state | TV records live recents at session boundaries and updates visible library history when returning/minimizing |
| Design | Connection summary and version badge lost contrast in Dark appearance | Theme-aware contrasting foreground/background combinations |
| Input correctness | A delayed scroll repair could jump after subsequent input | Delayed repair checks that focus still belongs to its original control; Select rejects disabled/offscreen targets |

## Native regression suites

- **Core:** connection, live/VOD playback, next episode across seasons, mini-player continuity, guide persistence, PIN/category protection, Clear recents, catch-up, context keys and return navigation.
- **Settings:** appearance, player/engine choices, sorting/search/refresh, category toggles, backup modes, playlist forms, history/storage, IP details through both entry points, home-IP setup, search clearing and per-channel preferences.
- **Stability:** a real-time continuous synthetic MPEG-TS stream stays visible and advances after the player menu, channel options/save, display/sleep tools, playback report and track selection. Pixel checks inspect the video area; a playing label alone is insufficient. The test checks one live HTTP session, media Play/Pause, 3,000 channels/300 categories, bounded native focus candidates and D-pad dispatch timing. Frame statistics are retained for inspection.

The profiling flag is an explicit Android launch-intent extra used by the emulator checks; normal app launches do not log input timing. Timings do not establish physical Hisense/Fire TV frame rates. Provider compatibility and vendor keyboards still require device checks.

The exact APK passed the native suites below. The working iPhone and Android mobile downloads remain unchanged at 0.6.4.

## Android 15 emulator limitation

The API 35 goldfish virtual decoder produced a black texture before any settings panel opened, with graphics-buffer errors. This occurred with both the old indirect graphics backend and the current ANGLE/SwiftShader backend. API 30 rendered and advanced the same continuous feed through the panel transitions. API 35 video verification is therefore not marked passed. These emulator observations do not establish behavior on a physical Android 15 TV.

The runner now uses a current graphics backend; [Android's emulator acceleration documentation](https://developer.android.com/studio/run/emulator-acceleration) lists `swiftshader_indirect` as deprecated. No production codec settings were weakened or replaced to make a failing video test pass.

## Verified release

[Build and exact APK record](build.json) · [Core results](core-results.json) · [Core actions](core-actions.json) · [Settings results](settings-results.json) · [Settings actions](settings-actions.json) · [Stability and timing](stability-results.json) · [Frame statistics](focus-framestats.txt)

All three jobs used the APK from [build 41059308561](https://github.com/nhshajib/NodeCast/actions/runs/41059308561), source `a23eb4da25fa921bad97911538c33dd96ed8d136`. TypeScript and **116 automated tests** passed. Its SHA-256 matches the uploaded release asset, and its signing certificate matches the previous TV release.

- [Core audit](https://github.com/nhshajib/NodeCast/actions/runs/41060763266): passed, including watched/unwatched toggles, PIN persistence, native video, next episode, guide/catch-up and return navigation.
- [Settings audit](https://github.com/nhshajib/NodeCast/actions/runs/41060767869): passed, including both IP entry points, Refresh, Save confirmation, Cancel, actual reference save/removal, search and per-channel options.
- [Stability audit](https://github.com/nhshajib/NodeCast/actions/runs/41060772252): passed all frame, live-session, media-key and initial-focus assertions. A 3,000-channel/300-category fixture produced at most 103 native focus candidates; native key handling measured **1.077 ms p95 across 41 samples**. This is emulator dispatch timing, not a physical-device FPS claim.

These native tests used Android 11/API 30 and test scripts at `05cc39f26b6594ff355c4708f640d7aa5923de49`. Physical Hisense/Fire TV and real-provider confirmation remain necessary.

## Native captures

[Player side panel](player-report-panel.png) · [Display/sleep tools](player-tools-panel.png) · [Video after settings](video-after-settings.png) · [Connection details](connection-details.png) · [Library](library.png) · [Guide](guide.png)

Colour bars, channel titles and guide entries are synthetic fixtures. The IP capture shows the disposable GitHub-hosted runner's public IP, not the user's IP. No IPTV credentials or provider content are included.
