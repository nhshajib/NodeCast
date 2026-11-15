# Navigation transitions

NodeCast uses one transition style: **Slide**. A 24-point, 210 ms ease-out slide
suggests moving into detail or settings without large motion. Root tabs switch
immediately; the selected-tab indicator moves independently. This keeps browsing
quick and avoids making peer tabs feel like nested pages.

## Configure a route

Edit `src/transitionConfig.ts` for permanent application defaults.
For a runtime override, call this outside render (for example, during startup):

```ts
import { setTransition, resetTransition } from './src/transitionConfig';

setTransition('details', 'slide'); // Movie grid → existing movie details page.
setTransition('series', 'slide');  // Series grid → episode list.
setTransition('players', 'none');  // Optional: instant playback-preferences page.
setTransition('home', 'none');     // Root tabs stay immediate.
resetTransition('players');       // Restore the configured application default.
```

Supported values are `slide` and `none`. New route names default to slide.
The names match the app's existing tab IDs and sheet types; no new navigation
container, product-demo route, or user-facing animation setting is needed.

`TabScene` and `PageTransition` subscribe to configuration with
`useSyncExternalStore`. `App.tsx` also reads the sheet configuration so
`none` disables its native Modal presentation. UIKit/Android Modal owns opening
and closing the full-screen sheet; its platform slide is vertical.
The short horizontal slide runs only between pages in an already open sheet,
avoiding a second animation on initial presentation. This is not an interactive
swipe-back stack; existing Back and Close controls retain their behavior.

## Accessibility and lifecycle

- Reduce Motion disables page movement and the animated tab indicator.
- Initial render is visible immediately. Active content opacity never animates.
- Background/foreground changes settle transforms immediately. A timeout also
  settles interrupted animations if their completion callback is lost.
- Switching tabs preserves their mounted content, scroll state and caches.
- Player pages bypass content transitions to preserve their playback surface.
- Changing a configuration value settles any in-flight transition without
  replaying the current page's entrance.

## Performance and platforms

Mobile transforms use React Native Animated with `useNativeDriver`, keeping
frames on the native UI thread. No React state is updated per animation frame.
Web uses the existing React Native Web Animated implementation with the same
timing and transform; its frames run in the browser, not a native driver.
60 fps depends on device load and must be measured on real devices.

The Android TV shell has separate remote navigation and is unchanged here.
These settings control the shared iOS, Android mobile and web application.

## Dependencies and validation

No packages to install. This deliberately keeps the existing animation and
navigation stack; React Navigation, Expo Router, Reanimated, MaskedView and
shared-element packages are not required for the approved single-style scope.

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npx.cmd expo export --platform web
```

Configuration tests run through `tests/run.mjs`. GitHub's Navigation validation
workflow runs the same source checks and a web bundle on changes. Device QA must
still cover: repeated tab switches; opening/closing details and settings;
switching pages while motion is running; Reduce Motion; foreground recovery;
and uninterrupted video playback. Source validation is not a frame-rate or
real-device UI test.
