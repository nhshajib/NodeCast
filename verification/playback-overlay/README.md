# Playback overlays · 0.6.7

All three editions keep playback settings on top of the video in a bounded translucent panel. Short menus fit their contents; longer tools and per-channel choices scroll. The ordinary top/bottom controls fade away while a settings panel is open, so two sets of controls do not overlap.

- Playing controls hide after **4 seconds** without interaction. Tap the video, or press a TV navigation/Select/Back key, to reveal them. That first TV navigation key only wakes the controls.
- Open settings dismiss after **8 idle seconds**. Touching/scrolling, unsaved per-channel edits, saving, paused/loading/failed playback and an enabled screen reader prevent unwanted disappearance.
- Dedicated TV media buttons still pause/play, seek supported movies and stop playback. Back dismisses settings or track selection before leaving the video.
- Mobile movies use the same custom overlay in portrait and landscape, instead of opening a native fullscreen controller above the React interface. PiP remains available from Player options when the device/stream supports it and no sleep timer is active.
- Video views stay mounted. Menu changes do not create another live connection or replace a decoder.
- Opacity transitions respect Reduce Motion. The panel uses translucency; it does not require a blur package.

## Verification

Source checks: TypeScript and 116 tests. The shared React UI is also exercised with Chromium and a synthetic local H.264 fixture using `scripts/playback-overlay-web-smoke.py`. This checks menu playback continuity, Fit/Fill, sleep timer, tracks, portrait/landscape layout, idle dismissal, wake taps and paused controls.

For that web QA export only, React Native Web's `AccessibilityInfo.isScreenReaderEnabled` constant response is simulated as `false`. RN Web otherwise always returns `true`, deliberately preventing idle dismissal. The exported QA bundle is not distributed; native IPA/APK builds use the real device accessibility setting. The test restores the dependency file after export. Browser checks do not verify physical-device codecs, PiP or AirPlay.

Native APK and IPA run IDs, source commits, checksums and verification scope are recorded in each edition's `build.json`. TV checks use a real native APK in an Android 11/API 30 emulator, D-pad/Select/Back input and a local MPEG-TS stream. They include idle controls/settings, unsaved edits, video pixels and retained HTTP sessions. Physical Hisense/Fire TV and iPhone testing still require confirmation on those devices. Android 15 goldfish VLC texture limitations found in the previous audit are not evidence of physical-device failure or success.

To repeat the browser check, install Python Playwright, Chromium and ffmpeg, then run:

```sh
node scripts/build-playback-web-smoke.cjs build/playback-web
python3 scripts/playback-overlay-web-smoke.py
```

The preparation script restores RN Web's dependency file even if export fails. The browser harness creates a synthetic clip locally, does not use an IPTV subscription and writes screenshots plus `web-result.json` here. Generated video is ignored by Git. Native checks use `.github/workflows/android-smoke.yml` with `tv_suite=stability` and `api_level=30` on the exact release build run.
