# Native-feel audit

The audit follows the "Does it feel native?" checklist: list custom headers, custom tabs, buttons under 44 points and buttons with no pressed state, by file and line. Line numbers refer to the code **before** this pass (commit `f09e5af`). The last column records what changed.

## Six tests, before this pass

| Test | Before | Why |
| --- | --- | --- |
| Swipe (edge swipe-back) | Fail | Pages were one `sheet` state inside a full-screen RN `<Modal>` with no gesture (App.tsx:529). |
| Text box (no zoom) | Pass | Library, guide and `Field` inputs use 16 px text (App.tsx:496, src/ui.tsx:49, src/GuideScreen.tsx:41). |
| Tab (re-tap scrolls to top) | Fail | `setTab` returned early when the tab was already active (App.tsx:119). |
| Sheet (follows finger) | Fail | Only the iOS provider pageSheet could be dragged. The guide programme sheet had a grabber that did nothing (src/FullGuide.tsx:72). |
| Scroll (no blank rows) | Risk | The library list had no `getItemLayout`, an inline `renderItem`, and remounted on every search keystroke (App.tsx:501–504). The guide filtered every programme per row (src/FullGuide.tsx:66). |
| Press (reacts before release) | Fail | 6 of about 124 pressables showed a pressed state. All actions fired on release. There were no haptics. |

## Custom headers

| Location | What | Resolution |
| --- | --- | --- |
| App.tsx:513 | Root header: wordmark plus search, profiles, favourites, settings and add icons | Native Stack header in each tab, with the icons as `headerRight` |
| App.tsx:530 | Shared "‹ Back · title · Close" header for every page | Removed. Pages are native stack screens with system titles and back. |
| App.tsx:492, App.tsx:484 | In-content page titles | Kept as content headings below the native header |
| src/FullGuide.tsx:45 | "Back to guide" button | Kept (an in-page mode toggle, not navigation) |
| src/BuiltInPlayer.tsx:94 | "Back to video" bar in the player panel | Kept (player exception) |
| android-tv/TVApp.tsx:325, :344 | TV sheet header and page heading | Kept (TV is D-pad navigation) |

## Custom tabs

| Location | What | Resolution |
| --- | --- | --- |
| src/NavigationMotion.tsx:65–93, App.tsx:523 | `MovingTabBar` phone tab bar | Replaced by `NativeTabs`. Re-tap scrolls to top. |
| src/NavigationMotion.tsx:31, App.tsx:516–521 | `TabScene` absolute-fill tab pages | Replaced by native tab screens |
| App.tsx:495 | Live/Movies/Series segmented control | Kept as an in-page filter, with a pressed state and haptic |
| App.tsx:493 | Android Favorites/Movies/Series chips | Kept as an in-page filter, with a pressed state |
| src/ProviderSheet.tsx:27, src/FullGuide.tsx:57, src/SeriesEpisodes.tsx:16, src/SearchScope.tsx:8 | Segments and pills | Kept as filters, with pressed states |
| android-tv/TVApp.tsx:357–359 | TV rail | Kept. Reselecting the active item scrolls to the top. |

## Buttons under 44 points

| Location | Control | Size | Resolution |
| --- | --- | --- | --- |
| App.tsx:496 | Clear search (×) | about 19×19 | 44×44 |
| App.tsx:496 | Library options | about 36×36 | 44×44 |
| App.tsx:500 | "TV guide" link | about 18 tall | 44 tall |
| App.tsx:500 | Refresh | 27×27 (hitSlop 10) | 44×44 |
| App.tsx:514 | Dismiss message | about 33 tall | 44 tall |
| App.tsx:541 | "Edit details" and "Remove" | about 17 tall | 44 tall |
| App.tsx:547 | "Start over" | about 33 tall | 44 tall |
| src/LibraryOptions.tsx:22, src/BackupSettings.tsx:20, src/HomeIPSetup.tsx:38 | iOS `Switch` | 51×31 | The whole labelled row toggles |
| src/GuideTimeline.tsx:12 | Programme cells | min-width forced to 44, overlapping neighbours | Phones: a cell keeps its true width (still 56 pt tall), so short programmes no longer cover the next one. TV keeps 44 for focus. |

## Buttons with no pressed state

Before this pass, only `Button` and `IconButton` (src/ui.tsx), `SettingsRow` (App.tsx:93), the support card (App.tsx:487), the tab bar (src/NavigationMotion.tsx:89) and player settings rows (src/PlaybackSettings.tsx:21) had one. Every other control, including `GlassButton` (src/PlaybackGlass.tsx:14), `SectionHeading` links (src/ui.tsx:36), the TV `RemoteSwitch` (src/RemoteSwitch.tsx:9), player chrome (src/Player.tsx, src/CompatibilityPlayer.tsx), chips, list rows and favourite buttons, had none.

**Resolution:** `FocusPressable` now draws a default pressed state on press-in for every control that does not style `pressed` itself: opacity on iOS and web, a ripple on Android phones, and a scale on TV. All raw RN `Pressable` uses in App.tsx, src/HomeScreen.tsx and src/NavigationMotion.tsx were replaced with it.

## Also found

- src/VideoSeekBar.tsx:18 sought twice when a drag ended inside the bar (`onTouchEnd` and `onPress`). Fixed.
- android-tv/TVApp.tsx:352: `windowSize` of 3 on the channel list risked blank rows when scrolling fast. Raised.

## After this pass

| Test | iPhone | Android phone | TV (D-pad equivalent) | How it was checked |
| --- | --- | --- | --- | --- |
| Swipe | Native stack edge swipe | System back and predictive back | Back key (unchanged) | Native behaviour; needs a device build |
| Text box | 16 px inputs, no zoom | Same | Same | Source and web preview |
| Tab | `NativeTabs` scroll to top plus JS fallback | JS fallback via `tabPress` | Reselecting a rail item scrolls to top | Web check passes (600 → 0) |
| Sheet | `formSheet` with detents | `formSheet` bottom sheet | Unchanged overlay panels | Web opens and closes sheets; drag needs a device |
| Scroll | Memoised rows, no remount per keystroke, virtualised chips | Same, plus clipped subviews | `windowSize` 3 → 7 | Needs a release build on a device |
| Press | Opacity on press-in, haptics on real changes | Ripple on press-in, haptics | Scale on Select | Web check: opacity 1 → 0.6 before release |

The web results and screenshots are in [verification/native-feel](../verification/native-feel/checks.json). The check script is `scripts/native-feel-web-check.cjs`.

**Still to do by hand:** the PDF's six tests on a real iPhone and a real Android phone with a new native build (Expo Router, react-native-screens and expo-haptics are native modules), then the stranger's-thumb test.
