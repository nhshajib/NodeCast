# GlowTV screenshot and icon assets

The original platform icons are in `brand/icons/`, unchanged. Copies are bundled inside the self-contained app project at `apps/player/assets/launchers/` for native packaging. Store-ready PNG icon and banner copies also sit alongside each platform’s screenshots. Supplied Apple TV assets are preparation only: there is no tvOS target yet.

`ios/`, `android/` and `tv/` contain fresh captures from the real shared app, not mockup reconstructions. Native emulator/simulator captures replace browser candidates as their audits pass; the per-image source is recorded in [screenshot-provenance.json](../verification/glowtv/screenshot-provenance.json). They exercise normal screens with a synthetic Xtream provider, an original abstract video, generated landscape artwork and invented channel names. Browser candidates are explicitly marked and must not be submitted as native store screenshots. Native captures also need store and physical-device review before submission.

- iPhone: 1320×2868, eight screens.
- iPad: 2064×2752, eight screens (tablet support is enabled). The live-player capture passes a decoded-frame assertion.
- Android phone: 1080×1920, eight screens.
- Android TV / Fire TV: 1920×1080, eight screens.
- Apple TV: no screenshots; a tvOS implementation is required.

The independent website has local optimized copies; it imports nothing from `apps/`. `verification/glowtv/capture.py` exercises the flows and writes provenance in `browser-audit.json`. Native iOS/iPad resume and screen tests and the Android phone/TV emulator audits passed. The standalone iPhone device Release build also passed. A browser pass does not validate native decoding, launcher masking or physical remote behavior.
