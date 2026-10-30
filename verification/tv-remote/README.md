# Android TV remote audit — 0.6.5

The previous smoke test used taps for most controls and D-pad only for Next episode. It did not prove the rest of the application was usable with a remote.

## Issues and corrections

- Hidden library/player controls remained candidates for native focus. The TV-only Android controller now respects hidden descendants and active player/menu/track/PIN focus boundaries.
- Multiple preferred-focus controls competed; disabled buttons remained focusable. Disabled controls leave the focus path; one playback toggle receives initial focus, with a distinct focus outline.
- Closing a sheet discarded the previous focus position. Stable control IDs and page/profile scope keys restore the prior action and scroll it into view.
- Native scrolling and virtualized grids could strand focus. D-pad directions select spatial neighbours, reveal offscreen actions and scroll long lists. TV retains rendered grid rows near the viewport.
- Tiny switches had no consistent focus treatment. TV uses full-size On/Off controls toggled with Select, keeping the mobile switches unchanged.
- Player audio/subtitle and settings panels could send focus behind the video. Explicit traps isolate the active panel; remote media keys control playback and seeking.
- Phone rotation was offered on TV. TV playback now offers Back to library and keeps landscape.
- Shared network controls lacked focus highlighting; search and provider fields lacked consistent focus styling. They now use the same focus treatment.

The installed iPhone and Android mobile downloads remain 0.6.4. The native controller is added only when NODECAST_TARGET=tv; no new dependencies are introduced.

## Verification

`android-smoke.yml` now runs the TV script with NODECAST_REMOTE_ONLY=1. The driver navigates actual native focus using D-pad/Select/Back. Field contents use keyboard text input. Touch taps and swipes are rejected by the driver. The test covers connection, library/favorites, player options, next episode, guide/PIN, appearance, engine/format choices, sorting/refresh/search scope, category and backup toggles, version history, storage and home-IP setup. Native audit results and screenshots are recorded after the exact release APK passes.

Physical remote models and vendor IMEs still need hardware confirmation.
