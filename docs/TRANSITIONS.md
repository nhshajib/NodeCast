# Navigation transitions

## Phones (iPhone, Android phone, web preview)

Since 0.7.0 the phone editions use the system's own navigation through Expo Router:

- **Pages** (details, series, settings pages, profiles, guide) are pushed on a native stack (`app/page/[type].tsx`). iOS gives the edge swipe-back that follows your finger. Android gives the system back gesture, with predictive back enabled in `app.json`.
- **Tabs** are `NativeTabs` (`app/(tabs)/_layout.tsx`): a `UITabBarController` on iOS and Material bottom navigation on Android. Tabs switch immediately, and re-tapping the active tab scrolls its list to the top.
- **Short tasks** (playlist form, player choice, remove confirmation, channel playback, programme details) are native form sheets (`app/sheet/[type].tsx`) with `sheetAllowedDetents`. Drag them between detents or down to dismiss.
- **Reduce Motion** sets the stack's `animation` to `none` (`useHeaderOptions` in `src/navigation/navigation.tsx`).

The browser preview has no native tab bar, so it uses Expo Router's JavaScript bottom tabs with the same routes.

There is no hand-built transition on phones any more. `TabScene`, `MovingTabBar` and the single full-screen `Modal` were removed. The rules are in [CLAUDE.md](../CLAUDE.md), and the audit that led here is in [NATIVE-AUDIT.md](NATIVE-AUDIT.md).

## Android TV

The TV shell keeps its D-pad navigator and `PageTransition`: a 24-point, 210 ms ease-out slide between overlay pages. Configure it in `src/transitionConfig.ts`:

```ts
import { setTransition, resetTransition } from './src/transitionConfig';

setTransition('guide', 'none'); // Instant TV guide overlay.
resetTransition('guide');       // Restore the default.
```

Supported values are `slide` and `none`, and new route names default to `slide`. `PageTransition` subscribes with `useSyncExternalStore`, settles immediately when the app backgrounds, and respects Reduce Motion. Reselecting the active rail item scrolls its channel list to the top.

## Validation

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npx.cmd expo export --platform web
```

The GitHub "Navigation validation" workflow runs the same checks. Edge swipe-back, sheet detent dragging, native tab re-tap on iOS and haptics only run in native builds. Do the six feel tests from `docs/NATIVE-AUDIT.md` on a real iPhone and Android phone.
