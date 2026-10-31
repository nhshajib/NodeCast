# iPhone Home visibility · 0.6.8

The reported screen had a visible header and tab bar with no Home content. The navigation layer could start an active tab at zero opacity and leave it there when its native entrance animation was interrupted. There was no app-state recovery for the transition.

Active tab/page content no longer uses animated opacity. Initial mounts and Reduce Motion changes settle without replaying an entrance. Navigation, the tab indicator and settings pages settle when AppState changes, with a timeout fallback for missing completion callbacks. Mounted tab contents, search state and scroll positions are retained.

## Browser regression

The same 30,000-channel fixture and interruption check were run against the old navigation component from `c719b57` and the fixed component from `dd8c726`:

- The old component failed with `Accessibility preference resolution hid active Home` when preference resolution replayed its fade with animation callbacks withheld. It also failed `Interrupted entrance hid Home` when entering Home with frames withheld.
- The fixed component stayed opaque before animation completion, recovered after simulated visibility changes, retained its DOM instance and scroll, and settled stalled settings motion without an app-state event.
- Rapid navigation, separate Library/Favorites queries, settings return, retained closing contents and Reduce Motion passed. TypeScript and all 125 existing automated tests passed.

[Baseline blank screen](07-baseline-blank.png) · [Fixed preference handoff](06-preference-handoff-visible.png) · [Comparison](regression-comparison.json) · [Browser results](checks.json) · [Interrupted animation](04-stalled-animation-visible.png) · [After foreground recovery](05-foreground-recovered.png)

To repeat with Python Playwright and Chromium installed:

```sh
EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 npx expo export --platform web --output-dir build/resume-web
python3 verification/ios-resume/check.py
```

The harness starts its own local server and uses synthetic provider/IP details. It is a deterministic browser failure injection, not a reproduction of several hours of iOS suspension.

## Native release verification

The iPhone build workflow now includes a CI-only XCTest target. It checks visible Home controls after tab changes, background intervals of 1, 15 and 60 seconds, and three process relaunches. The test checks Home before touching navigation after resume, rather than only confirming the process remains alive. The test target is not included in the device IPA.

Final native results and exact IPA provenance will be recorded here and in `iphone/build.json` when the build finishes. A physical iPhone returning after several hours, memory pressure and device-specific behavior still require device confirmation.
