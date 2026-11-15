# Leaf design audit — upcoming 0.7.0

Native builds and download updates are deferred at the user's request. The current public downloads remain 0.6.7. These screenshots show the running React Native Web implementation with iPhone, Android and TV visual configurations; they are not represented as native-device screenshots.

## Implemented

- **Shared:** requested leaf/deep-green palette, flat surfaces, 12–16-point card radii, bundled static Inter weights, accessible link ink, neutral secondary controls and red LIVE badges.
- **iPhone:** warm light default; Home / Guide / Movies / Series / Search tabs; settings and favorites remain in the header; timeline guide, day selection and compact program details; full-width portrait video with working player actions. Existing AirPlay and PiP capabilities remain engine/device dependent.
- **Android:** dark default, top app bar, Home / Live / Guide / Library / Settings navigation, pill selection, checked chips, outlined floating-label fields, M3U / Xtream / File playlist sheet, series artwork and compact episodes. Library explicitly leads to favorites, movies and series.
- **TV:** slim icon rail, featured live-channel Home, Continue watching when there is saved progress, retained public-IP card, compact timeline grid and opt-in live preview. The preview reuses the existing player surface. Native focus styling is one 3-point green ring with a 1.02 scale; no new focus animation was added.
- **Motion:** original animation calls, durations, easing and lifecycle effects are unchanged. The existing `PageTransition` is reused around TV page changes; video remains outside the transition wrapper. New peer tabs use the same immediate-switch convention as existing root tabs.

## Checks completed

- TypeScript strict source check.
- All 130 existing regression tests.
- Source safety check compares animation calls and player lifecycle effects with commit `14641c9a0c79cadb01bb002f6a6fdf95ccf0d2c1`.
- Provider, vault, catalog, XMLTV, catch-up, playback-policy, recovery, guide store and backup model/transaction modules match that baseline byte for byte.
- Three production web bundles: iPhone-style, Android-style and TV.
- Browser integration: M3U link and file import, HTTP 404-to-Xtream recovery, Xtream connection, guide import and SQLite-backed display, program details, live playback, series navigation, seasons and every principal settings destination.
- Both light and dark themes at 320×568, 393×852, 430×932 and 768×1024 phone/tablet viewports; TV at 960×540, 1280×720 and 1920×1080 logical viewports. No document overflow or JavaScript exceptions in the recorded runs. TV Home and Guide gallery captures are 3840×2160 pixels. See [browser-audit.json](browser-audit.json) and [source-methods.json](source-methods.json).
- Website checked at 320, 393, 768 and 1440 pixels: all 13 images load, no document overflow or clipped headings. All local links, anchors, CSS/font resources resolve. Current public release asset names were checked against GitHub's published releases. See [website-audit.json](website-audit.json).

## Scope and visual exceptions

The original inline reference JPEGs were inspected before implementation. They were not available as local files in this fresh workspace; [design/mockups/README.md](../../design/mockups/README.md) records the reference source rather than substituting generated mockups.

Reference channel names, film names, user names, artwork and schedule text are not imported. Layouts display actual supplied provider fields, saved history and cached EPG. If a provider has no artwork or guide data, the interface uses a neutral placeholder or setup state instead of inventing content.

The exact specified LIVE red `#E5342B` with white text is 4.32:1. The badge uses `#DD3027` to exceed the requested 4.5:1 minimum. The other requested base colors are retained. Primary text `#0D4029` on leaf green is 5.27:1; secondary text `#646B67` on warm background is 5.05:1.

Two visual changes require small presentation-state adjustments: native Modal presentation is used for the playlist sheet, and TV's existing `open` handler accepts an optional preview presentation flag. Engine selection, request generation and stream handling remain unchanged. Appearance defaults are resolved by platform and included in preferences so a backup retains the actual default theme.

No tvOS target is configured in this repository. The TV application remains the dedicated Android TV / Fire TV APK target. Real iPhone, Android and Fire TV playback, frame-rate measurements, native AirPlay/PiP and final native focus behavior still require device validation when compilation resumes. Native test scripts have been updated for the new visual labels but were not run against the final design.

## Captures and reproduction

| Target | Screens |
| --- | --- |
| iPhone preview | [Home](ios-home.png), [Guide](ios-guide.png), [Player](ios-player.png), [Series](ios-series.png), [Settings](ios-settings.png) |
| Android preview | [Home](android-home.png), [Series](android-series.png), [Add playlist](android-playlists.png), [Guide](android-guide.png), [Player](android-player.png), [Settings](android-settings.png) |
| TV preview | [Home](tv-home.png), [Guide with preview](tv-guide.png), [Settings](tv-settings.png) |

Run `audit.py` with the three web exports served on ports 8151–8153. It uses a synthetic provider and dummy credentials only. Set `NODECAST_SCREENSHOT_CLIP` to a local public test clip for gallery captures; without it, the checked-in decoder test pattern is used. Player gallery frames use Big Buck Bunny, © Blender Foundation, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), from the [official Blender download archive](https://download.blender.org/peach/bigbuckbunny_movies/). No paid provider was contacted.

`node scripts/check-design.mjs` runs the source safety comparison with the baseline available in Git history. In a sandbox that blocks Node child processes, set `NODECAST_BASELINE_DIR` to an exported copy of the baseline `src/` directory.
