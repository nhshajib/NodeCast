# GlowTV — rules for every screen

Use the system's navigation, native stack, native tabs, native sheets, nothing custom unless I ask. Every button reacts when a finger lands, not when it lifts. Anything you drag follows your finger. Buttons at least 44 points. Haptics only when something actually happens.

The shared app lives in `apps/player/`; run app commands from that directory.

## How that maps to this codebase

- **Native stack:** phone pages are Expo Router `Stack` routes (`app/page/[type].tsx`). Swipe-back from the left edge on iOS and predictive back on Android come from the system; never add a hand-built Back header.
- **Native tabs:** the phone tab bar is `NativeTabs` (`app/(tabs)/_layout.tsx`). Re-tapping the active tab scrolls its list to the top. On iOS the system does this for the first scroll view; on Android and web, `src/navigation/scrollToTop.ts` does it. Put each tab's main list first and register it with `useTabScrollToTop`.
- **Native sheets:** short tasks (playlist form, player choice, confirmations, programme details) are `presentation: 'formSheet'` routes with `sheetAllowedDetents` (`app/sheet/[type].tsx`).
- **Press feedback:** use `src/FocusPressable.tsx` (or `Button` / `IconButton` from `src/ui.tsx`), never React Native's `Pressable` directly. It enforces a 44×44 minimum, shows a pressed state as soon as the finger lands, and can fire a haptic on press-in.
- **Haptics:** use `src/haptics.ts` only for real state changes: favourite toggled, setting switched, seek committed, playlist saved, profile removed. It does nothing on web and TV.
- **Text inputs:** keep the font size at 16 or more so iOS never zooms.

## Deliberate exceptions

- **The video player** (`src/BuiltInPlayer.tsx`, `src/Player.tsx`, `src/CompatibilityPlayer.tsx`) keeps a custom chrome over a persistent playback surface, so video survives navigation and the mini player.
- **Fire TV / Android TV** (`android-tv/`) is driven by the D-pad. It keeps its rail, native focus ring (`plugins/tv/TVRemoteController.kt`) and `PageTransition`. Touch rules apply there only as visible pressed/select feedback; there are no haptics.

## Design skills

`.claude/skills/` holds the ui-ux-pro-max bundle (MIT, from nextlevelbuilder/ui-ux-pro-max-skill): ui-ux-pro-max, design, design-system, brand, ui-styling, banner-design and slides. Use them for visual guidance such as palettes, typography and style references. The rules above still take precedence: native navigation, the 44-point minimum, press feedback and the leaf-green theme in `apps/player/src/theme.tsx`. Ignore their web-only advice (Tailwind, shadcn/ui) for the React Native app, and don't run their Gemini image generators without asking.

## Checks before committing

```bash
npm run typecheck
npm test
npx expo export --platform web --output-dir /tmp/nodecast-web
EXPO_PUBLIC_APP_VARIANT=tv npx expo export --platform web --output-dir /tmp/nodecast-tv-web
```

The six feel tests (swipe-back, text box, tab re-tap, sheet drag, fast scroll in a release build, press-and-hold) must still be done on a real iPhone and Android phone. See `docs/NATIVE-AUDIT.md`.
