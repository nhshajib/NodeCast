# GlowTV screenshot and icon assets

The original platform icons are in `brand/icons/`, unchanged. Copies are bundled inside the self-contained app project at `apps/player/assets/launchers/` for native packaging. Supplied Apple TV assets are preparation only: there is no tvOS target yet.

`ios/`, `android/` and `tv/` contain fresh **browser-rendered screenshot candidates** from the real shared app, not mockup reconstructions. They exercise normal screens with a synthetic Xtream provider, an original abstract video, generated landscape artwork and invented channel names. They are not native-device screenshots and should not be submitted as final store screenshots before native validation.

- iPhone: 1320×2868, eight screens.
- iPad: 2064×2752, eight screens (tablet support is enabled).
- Android phone: 1080×2340, eight screens.
- Android TV / Fire TV: 1920×1080, eight screens.
- Apple TV: no screenshots; a tvOS implementation is required.

The independent website has local optimized copies; it imports nothing from `apps/`. `verification/glowtv/capture.py` exercises the flows and writes provenance in `browser-audit.json`. Native iOS resume tests and Android emulator scripts remain in the app project and must pass on the compiled release. A browser pass does not validate native decoding, launcher masking or physical remote behavior.
