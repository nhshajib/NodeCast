# Android TV remote audit — 0.6.5

The previous smoke test used taps for most controls and D-pad only for Next episode. It did not prove the rest of the application was usable with a remote.

## Issues and corrections

- Hidden library/player controls remained candidates for native focus. The TV-only Android controller now respects hidden descendants and active player/menu/track/PIN focus boundaries.
- Multiple preferred-focus controls competed; disabled buttons remained focusable. Disabled controls leave the focus path; one playback toggle receives initial focus, with a distinct focus outline.
- Closing a sheet discarded the previous focus position. Stable control IDs and page/profile scope keys restore the prior action and scroll it into view.
- The guide stacked channel controls over programmes and clipped the first programme beneath the footer. TV rows now place a channel rail beside compact timelines, use a smaller search header and align the initial view to half-hour ticks.
- Native scrolling and virtualized grids could strand focus. D-pad directions select spatial neighbours, reveal offscreen actions and scroll long lists. TV retains rendered grid rows near the viewport.
- Tiny switches had no consistent focus treatment. TV uses full-size On/Off controls toggled with Select, keeping the mobile switches unchanged.
- Player audio/subtitle and settings panels could send focus behind the video. Explicit traps isolate the active panel; remote media keys control playback and seeking.
- Phone rotation was offered on TV. TV playback now offers Back to library and keeps landscape.
- Shared network controls lacked focus highlighting; search and provider fields lacked consistent focus styling. They now use the same focus treatment.

The installed iPhone and Android mobile downloads remain 0.6.4. The native controller is added only when NODECAST_TARGET=tv; no new dependencies are introduced.

## Verification

`android-smoke.yml` now runs the TV script with NODECAST_REMOTE_ONLY=1. The driver navigates actual native focus using D-pad/Select/Back. Field contents use keyboard text input. Touch taps and swipes are rejected by the driver. The core and settings suites run against the same release APK in independent fresh emulators. The test covers connection, library/favorites, player options, next episode, guide/PIN, appearance, engine/format choices, sorting/refresh/search scope, category and backup toggles, version history, storage and home-IP setup. The core suite also checks an advertised Xtream archive endpoint, native catch-up decoding, return to the guide window, Fire TV Menu and long Select. Native audit results and screenshots are recorded after the exact release APK passes.

Physical remote models and vendor IMEs still need hardware confirmation.

## Published build verification

The exact 0.6.5 TV APK passed both native suites: [playback/catch-up](https://github.com/nhshajib/NodeCast/actions/runs/40994695133) and [settings/search](https://github.com/nhshajib/NodeCast/actions/runs/40994698827). Both used source `8ce1c7eb21f3ca7ea7c9aa2da02500d73e7db9d0` and the APK from [build 40993716335](https://github.com/nhshajib/NodeCast/actions/runs/40993716335). TypeScript and all **116 automated tests** passed in that build. The SHA-256 matches the published APK asset digest; its signing certificate matches 0.6.4.

[Build record](build.json) · [Core results](core-results.json) · [Core remote actions](core-actions.json) · [Settings results](settings-results.json) · [Settings remote actions](settings-actions.json)

The core workflow additionally asserts that the synthetic archive endpoint is requested, a native player decodes the clip, Back returns to the guide and Menu/long Select open the channel options. No real provider credentials or content were used. Physical Hisense/Fire TV performance, vendor keyboards and provider archive availability remain unverified.

### Native screenshots

[TV library](library.png) · [Compact guide](guide.png) · [Programme details](programme-details.png) · [Decoded catch-up fixture](catchup.png)

These captures come from the released APK in an API 35 emulator. The names and colour-bar video are test fixtures; they are not supplied channels or media. TiviMate screenshots/assets are not included.
