# Codex task: fix the GlowTV app UI/UX audit findings (iPhone/iPad, Android phone, Android TV/Fire TV)

## Your role and the goal

You are working in the GlowTV repository. Fix the UI/UX problems listed below in the **app** (`apps/player/`) for all three editions:

1. iPhone and iPad, from the shared phone UI.
2. Android phone, also from the shared phone UI.
3. Android TV and Fire TV, from the D-pad UI.

Each finding has a location, the problem and the required fix. Work through them in the order given (Critical → High → Medium → Low). After each phase, run the checks under **Verification**.

The findings come from a UI/UX Pro Max audit. That audit used two inputs:
- **Native screenshots** of every edition: `store-assets/ios/ios-*.png`, `store-assets/ios/ipad-*.png`, `store-assets/android/android-*.png` and `store-assets/tv/tv-*.png`.
- **A code audit** of `apps/player`.

The audit excluded everything already fixed in `docs/UI-UX-AUDIT-0.7.2.md`: icon backplates, emoji icons, passive cards, the 8 px grid and the three colour families. Don't undo any of that work.

## Repository facts you need

- The app is Expo SDK 58, React Native 0.88 and React 19. Run every app command from `apps/player/`.
- **Phone UI.** Expo Router routes live in `apps/player/app/`. Screens and state live in `apps/player/src/navigation/`:
  - `NodeCastProvider.tsx` holds app state and page rendering.
  - `navigation.tsx` holds the stacks, tabs, sheets, headers and message banner.
  - `LibraryScreen.tsx`, `shared.tsx` and `types.ts` complete the folder.
  - Shared components are in `apps/player/src/`, for example `ui.tsx`, `FocusPressable.tsx`, `HomeScreen.tsx`, `FullGuide.tsx`, `GuideTimeline.tsx`, `Player.tsx`, `BuiltInPlayer.tsx`, `CompatibilityPlayer.tsx`, `ProviderSheet.tsx`, `SeriesEpisodes.tsx`, `LibraryOptions.tsx`, `BackupSettings.tsx`, `FamilyControls.tsx` and `NetworkCard.tsx`.
- **TV UI.** It lives in `apps/player/android-tv/`: `TVApp.tsx`, `TVHome.tsx`, `TVChannelRow.tsx`, `TVConnection.tsx` and `TVLibraryOptions.tsx`.
  - The native focus ring and key handling are in `apps/player/plugins/tv/TVRemoteController.kt`.
  - TV builds set `EXPO_PUBLIC_APP_VARIANT=tv`. Use `isTVBuild` from `src/FocusPressable.tsx` and `tvDesign` from `src/theme.tsx` to branch.
- **Tokens.** The tokens are `src/designTokens.ts`, which holds the 8 px spacing, radii and three-family palette. The theme is `src/theme.tsx`. Colours must come from `colors.*` tokens. Never add raw hex values in components.
- **Source line numbers.** Source lines are often very long. Locate code with `grep -n`, and treat the line numbers below as approximate anchors.

## Hard rules (from `CLAUDE.md`; do not break these)

- **Navigation.** Keep the system navigation: the Expo Router native stack, `NativeTabs` and `formSheet` sheets. Don't add hand-built headers, tab bars or modals on phones.
- **Touchables.** Every touchable uses `src/FocusPressable.tsx`, or `Button`/`IconButton` from `src/ui.tsx`. Keep the 44×44 minimum and the pressed state on press-in. Never import React Native's `Pressable` directly.
- **Haptics.** Use `src/haptics.ts`, and only for real state changes.
- **Text inputs.** Keep text-input font size at 16 or more.
- **Player.** The video player keeps its custom chrome over the persistent playback surface. Don't change engine, lifecycle, decoding or provider/storage/guide/backup models. `node verification/glowtv/check-ui-scope.cjs` must still pass.
- **TV.** The TV app stays D-pad driven, with its rail and `PageTransition`, and has no haptics.
- **Grid.** Visual spacing stays on the 8 px grid. `node verification/glowtv/check-ui-grid.cjs` must still pass.
- **Keep what exists.** Don't remove features, settings or legal and safety copy: provider disclaimers, IP/VPN limitations and credential warnings.

---

## Phase 1: Critical

### C1. iPad is forced into portrait and can't multitask
- **Where:**
  - `apps/player/app.json` (`"requireFullScreen": true`, ~line 24).
  - `apps/player/app.config.js` (initial orientation `PORTRAIT_UP`).
  - `src/navigation/NodeCastProvider.tsx`: every `ScreenOrientation.lockAsync(PORTRAIT_UP)`.
  - `src/usePlayerOrientation.ts` (~lines 20, 29).
- **Problem:** Split View, Slide Over and Stage Manager are disabled. Every time the player closes, the iPad rotates back to portrait. In `store-assets/ios/ipad-*.png` the iPad shows a stretched phone layout.
- **Fix:**
  - Remove `requireFullScreen`.
  - Lock to portrait only on phones (`expo-device` `deviceType === PHONE`, or the shortest window side < 600).
  - On tablets, call `ScreenOrientation.unlockAsync()` when the player closes.
  - Keep the player's own landscape behaviour.
- **Accept when:**
  - An iPad build allows all orientations and multitasking.
  - Phones behave exactly as today.

### C2. White text on green in dark mode (about 1.9:1 contrast)
- **Where:**
  - `src/Player.tsx`, the "Next episode" pill (~261–263): the background is `colors.primary` and the text, subtitle and icon use `colors.text`.
  - `src/LibraryOptions.tsx` (~22): the selected mode chip uses a hard-coded `'#1EC677'` with `colors.onAccent`.
- **Fix:**
  - Text, subtitle, icon and `ActivityIndicator` on a `colors.primary` background use `colors.primaryText`.
  - Selected chips use `colors.selected` with `colors.selectedText`.
  - Grep the whole app for other `colors.primary` backgrounds paired with `colors.text`, `#fff` or `colors.onAccent`, and fix every one.
- **Accept when:** every text and icon on a green fill is at least 4.5:1 in both themes.

### C3. TV focus can't be seen on green buttons, including the default focus
- **Where:**
  - `plugins/tv/TVRemoteController.kt` (~40–41). It draws a single 3 dp `#1EC677` ring with a fixed 12 dp radius and a 1.02 scale.
  - Primary buttons are the same `#1EC677`. The initial focus is on `tv-preferred:home-watch-live` (`android-tv/TVHome.tsx`) and `tv-preferred:playback-toggle` (`src/Player.tsx`).
- **Fix:**
  - Draw a two-tone ring: an outer 3 dp `#FFFFFF` and an inner 2 dp `#0A0E0C`.
  - Raise the focused scale to about 1.05 for buttons and cards.
  - Take the ring's corner radius from the view's outline or background where available. Pills should get a pill ring, not 12 dp corners.
  - Draw the ring on the row/tile container, so scaling isn't clipped by `overflow:'hidden'` parents (`TVChannelRow.tsx`, the tiles in `TVApp.tsx`).
  - Skip the native ring on `EditText`, which already gets a JS border (`ui.tsx` `Field`).
- **Accept when:**
  - Focus is clearly visible on green, dark and light surfaces.
  - The ring's shape matches the control.

### C4. TV focus jumps to the sidebar after almost every screen change
- **Where:**
  - `android-tv/TVApp.tsx`: the sidebar has no scope and is rendered first.
  - `TVRemoteController.kt` `ensureFocus()` (~140): it picks the first remembered match in tree order.
  - `browse.focused` is written but never read.
- **Problem:** Back from a sheet or the player, or opening "Browse channels", puts focus on a rail icon. The user loses their place in the list.
- **Fix:**
  - Wrap the rail in `nativeID="tv-scope:rail"`.
  - In `ensureFocus`, prefer the remembered view in the most recently mounted non-rail scope, then a `tv-preferred:*` inside it, and only then the rail.
  - Give every screen and sheet a `tv-preferred:*`:
    - library: the remembered row, otherwise the first category chip;
    - each sheet: its first actionable control;
    - programme details: "Watch live" or "Watch catch-up";
    - search: the search field.
  - Restore the remembered channel row after Back.
- **Accept when:** in a remote-only walkthrough (Home → Live → open a channel's options → Back → play → Back), focus returns to the element the user left.

---

## Phase 2: High

### H1. TV Back is inconsistent and exits the app from Live TV
- **Where:** `android-tv/TVApp.tsx` Back handler (~226–235). From Movies, Series, Favorites or Settings, Back goes to Live TV; from Live TV it returns `false` and the app exits.
- **Fix:**
  - Back from any library page returns to Home (`setLanding(true)`).
  - On Home, exit only on a second Back within 2 s, showing a "Press Back again to exit" toast.
  - Back on the first-run Home-IP prompt saves `homeIPSetup:'skipped'` (~158, 229).
  - Register Back for `FullGuide` settings and the filters view, so Back closes those sub-views instead of the whole guide.

### H2. The TV sidebar is icon-only
- **Where:** `android-tv/TVApp.tsx` (~360–362, `s.nav` 44×44). There are nine icons, with labels only in `accessibilityLabel`. The selected and focused states both look like a green ring on green.
- **Fix:**
  - While any rail item has focus, expand the rail to about 200 dp with text labels, collapsing it on blur.
  - Show the selected item as a fill plus label weight, keeping the ring for focus only.
  - Keep the rail within title-safe margins (see H7).

### H3. TV movies and series have no seek bar
- **Where:** `src/Player.tsx` (~254) renders `VideoSeekBar` only when `!television`. `TVRemoteController.kt` Left/Right only wakes the controls.
- **Fix:**
  - Add a focusable TV progress bar: a track at least 6 dp tall, times at 18 sp or more, and Left/Right moving ±10 s, speeding up on key repeat.
  - While the controls are hidden, Left/Right seeks and shows the bar.
  - Live streams keep no seek bar.

### H4. TV live channels: zapping and an info overlay
- **Where:** `TVRemoteController.kt` key dispatch (~229–238); the VLC overlay in `src/CompatibilityPlayer.tsx` (~161–163).
- **Fix:**
  - Map CH+/CH−, and Up/Down while the controls are hidden, to the next/previous channel in the current filtered list.
  - Map `KEYCODE_INFO` to a bottom overlay showing channel name, now/next programme and progress.
  - Map `KEYCODE_GUIDE` to the guide.

### H5. TV text is too small for 10-foot viewing
- **Where:** many TV paths use 10–15 sp. Examples:
  - 10 sp: `u.eyebrow` (`ui.tsx` ~45), the LIVE badge (`TVChannelRow.tsx` ~15), the "10s" and "30s" labels (`Player.tsx` ~256–257).
  - 11 sp: the channel group (`TVChannelRow.tsx` ~14), guide times (`GuideTimeline.tsx` ~12), "Updated" (`TVApp.tsx` ~347).
  - 13 sp: `u.small`, `u.link` and `u.errorText` (`ui.tsx`), toolbar actions (`TVApp.tsx` ~64), programme titles (`GuideTimeline.tsx` ~12), channel names in the guide (`FullGuide.tsx` ~69).
  - 14–15 sp: buttons, body text and all player menu items (`PlaybackGlass.tsx`).
- **Fix:**
  - Add a TV type scale in `themedStyles`, keyed on `tvDesign`: caption 14, small 16, body 18, label 18, button 18, h2 24, h1 36.
  - Remove per-call-site overrides, so nothing that identifies a row or control is below 14 sp on TV.
  - Re-measure TV `getItemLayout` row heights after the change. They must stay accurate and on the 8 px grid.

### H6. TV content runs into the overscan area
- **Where:**
  - the sidebar (icons 14 dp from the left, brand 16 dp from the top);
  - library and sheets (`padding:16`);
  - the guide Back button (`top:8, right:8`);
  - the mini player (right/bottom 24);
  - the player top/bottom bars (16–24);
  - programme details (flush at `top:0,right:0,bottom:0`).
- **Fix:**
  - Add a `tvSafe = { h: 48, v: 27 }` token (dp at 1080p). Apply it once at the TV root (`TVApp.tsx`) and in every player overlay root.
  - Video and background art stay full-bleed. Safe-area insets are 0 on TV, so the `Math.max(insets.x, 16)` pattern isn't enough.

### H7. The TV movie and series grid
- **Where:** `android-tv/TVApp.tsx` (~355, `s.art` 56 dp tall, `resizeMode="contain"` in a 216 dp tile, 3 columns). Each tile also has a separate favourite/options bar, so it takes two Down presses per row.
- **Fix:**
  - Use 2:3 poster cards (about 140×210 dp, 5 columns) with the title below.
  - Make each tile one focus stop. Move favourite and options to long-press/Menu (already wired up) and to the item's details screen.
  - Update `getItemLayout` to match.

### H8. Phone destructive actions need confirmation and the right styling
- **Where:** the app has a single `variant="danger"`. Clearing viewing history from Privacy, Disable family PIN, Remove reference IP, Clear cached guide and "Forgot PIN? Reset saved profiles" all happen in one tap.
  - The clear-history button in Privacy (`NodeCastProvider.tsx`) has no Alert, unlike the same action in `StorageSettings.tsx`.
  - Continue watching "Remove" (`HomeScreen.tsx` ~47) runs immediately and looks like grey caption text.
  - Other locations: `FamilyControls.tsx` ~32 and ~47, `NetworkCard.tsx` ~55 and ~69, `FullGuide.tsx` ~47, and the `StorageSettings.tsx` Alerts (no `style:'destructive'`).
  - The TV Settings "Remove" sits right next to "Edit" (`TVApp.tsx` ~349).
- **Fix:**
  - Add an `Alert.alert` with a `style:'destructive'` button.
  - Use `variant="danger"`, and separate destructive buttons from neutral ones with spacing or a divider.
  - For Continue watching "Remove", show a 5 s "Removed · Undo" message instead of a confirmation, with an accessible Undo.
  - Keep the reset path, but place it below a divider, away from "Cancel unlock".

### H9. The phone message banner is missing on pages and sheets, and is always red
- **Where:** `src/navigation/navigation.tsx`: `MessageBanner` (~132) renders only in `TabScreen`, and always as `Notice danger`. Errors raised from details pages, sheets or the player stay invisible, while progress text ("Refreshing your playlist…") shows as an error.
- **Fix:**
  - Render the banner once in `RootNavigator`, above the stack and below the status bar, respecting safe areas.
  - Change `setMessage` to accept `{ text, tone: 'info' | 'error' }` and update all call sites.
  - Info auto-dismisses after 4 s; errors stay until dismissed. Give the dismiss button a specific label ("Dismiss message").

### H10. Phone screen-reader announcements and headings
- **Where:**
  - `Notice` (`ui.tsx` ~35) has no role or live region.
  - `accessibilityLiveRegion` (`LibraryScreen.tsx` ~96) is Android-only.
  - "Updating library…", the player error overlay (`Player.tsx` ~246) and PIN errors (`FamilyControls.tsx` ~32) aren't announced.
  - No `u.h1`/`u.h2`, `SectionHeading`, `Empty` title or Settings group label uses `accessibilityRole="header"`.
- **Fix:**
  - `Notice danger` gets `accessibilityRole="alert"` and `accessibilityLiveRegion="assertive"`. Also call `AccessibilityInfo.announceForAccessibility(text)` in an effect when the text changes, because this is what reaches VoiceOver.
  - Do the same, politely, for the search result count and the refresh status.
  - Add `H1` and `H2` components in `ui.tsx` with `accessibilityRole="header"`. Replace `<Text style={u.h1|u.h2}>` everywhere, and set the role in `SectionHeading`, `Empty` and the Settings section labels.
  - In `BackupSettings.tsx`, scroll the result message into view (`scrollToEnd`) when it appears.

### H11. Phone accessibility labels drop the visible information
- **Where:**
  - `SettingsRow` (`navigation/shared.tsx` ~17) labels only the title.
  - The profile card reads "Manage active profile" (`NodeCastProvider.tsx` ~504).
  - The `NetworkCard` pill hides the status (~76).
  - `VersionHistory` (~11).
  - Media rows read "Open {name}" (`LibraryScreen.tsx` ~21, ~28) and "Watch {name}" (`HomeScreen.tsx` ~48).
  - Episodes read "Play {name}" (`SeriesEpisodes.tsx` ~18) with no watched/progress state.
  - Guide cells (`GuideTimeline.tsx` ~12) have no channel name and show "on now" by colour only.
- **Fix:**
  - Build each label from all the visible text: `${title}, ${subtitle}`, or `accessibilityValue={{ text }}`. Include LIVE, category, watched, progress percentage and "on now".
  - Also fix label/visible-text mismatches:
    - the sheet "Done"/"Cancel" button is labelled "Close" (`navigation.tsx` ~193);
    - "Follow device" (`appearanceSettings.tsx` ~10);
    - "Daily" versus "1440 minutes" (`LibraryOptions.tsx` ~22).
  - Add the profile name to "Edit details" and "Remove" on each profile card.

### H12. Phone Home shows "Connect playlist" while a connected library is loading
- **Where:** `HomeScreen.tsx` (~34, ~44). The `loading` prop is received but never read. The error (~45) has no retry.
- **Fix:**
  - While `loading` is true, show a skeleton featured card and rows.
  - Show the disconnected empty state only when no profile and no demo is active.
  - Add a "Try again" button that calls `refreshLibrary`.

### H13. Phone poster grid on iPad, and readable widths
- **Where:**
  - `LibraryScreen.tsx` (~20, ~103) uses `numColumns` 2 and `maxWidth:'50%'`, so posters are about 470 pt wide on iPad (see `store-assets/ios/ipad-movies.png`).
  - `u.content` (`ui.tsx` ~57) has no `maxWidth`, so Settings, Privacy, Backup and details text runs to 900 pt or more.
  - The mini player is fixed at `bottom:110` and 220×124 (`navigation.tsx` ~54).
  - Home cards have fixed widths (`HomeScreen.tsx` ~47, ~50).
- **Fix:**
  - Compute the column count with `numColumns = Math.max(2, Math.floor((width - 2*16 + 16) / (150 + 16)))` from `useWindowDimensions`, and include `numColumns` in the list `key`.
  - Give content containers `maxWidth: 720, alignSelf: 'center', width: '100%'`.
  - Position the mini player from the safe-area bottom inset plus the tab bar height.
  - Scale Home card widths by breakpoint on tablets.

### H14. Phone layouts clip at large Dynamic Type
- **Where:**
  - Guide cells are `height:56` with a `height:80` row (`GuideTimeline.tsx` ~12).
  - The guide channel column is `width:52` and shows the two-letter initials plus the **stream ID** at 10 pt instead of the channel name (`FullGuide.tsx` ~69). It appears as "EV 1 / WI 2 / QU 3" in `store-assets/ios/ios-guide.png`.
  - The `SearchScope` chip row is fixed at `height:60`.
  - Category chips are `maxWidth:220` with `numberOfLines={1}`.
  - The `NetworkCard` pill is `maxWidth:124`.
  - The series header sits outside the episode `FlatList` (`SeriesEpisodes.tsx` ~16).
  - The delete sheet has a single `[0.42]` detent (`navigation/types.ts` ~24).
- **Fix:**
  - Replace `height` with `minHeight`, and recompute any `getItemLayout` that assumes fixed text height, or drop it for that list.
  - Show the channel name, plus number when available, in the guide column; widen it to about 96 pt on phones and use 2 lines.
  - Move the series header into `ListHeaderComponent`.
  - Set the delete detents to `[0.42, 1]`.
  - Use `maxFontSizeMultiplier={1.4}` only on dense chrome (time labels, tags), never on body text.

---

## Phase 3: Medium

### M1. Text sizes below the minimum (phones: 12 pt; tags 11 pt bold)
- **8–9 pt:**
  - 8 pt LIVE tag (`LibraryScreen.tsx` ~28);
  - 9 pt LIVE (`HomeScreen.tsx` ~68);
  - 9 pt CURRENT (`VersionHistory.tsx` ~11);
  - 9 pt splash text (`StartupSplash.tsx` ~106).
- **10 pt:**
  - `u.eyebrow` (`ui.tsx` ~45);
  - the Home kicker (`HomeScreen.tsx` ~61);
  - "10s" / "30s" (`Player.tsx` ~256–257);
  - the guide channel ID (`FullGuide.tsx` ~69).
- **11 pt:**
  - guide times (`GuideTimeline.tsx`);
  - `Player.tsx` ~258 and ~263;
  - the `NetworkCard` pill.

Raise these. On TV, follow H5.

### M2. Light-mode contrast for green text and state icons
- **Where:**
  - Selected option text in `colors.accent` on white (`ChannelPlaybackOptions.tsx` ~21, 2.2:1).
  - Filled heart (`LibraryScreen.tsx` ~30).
  - Checks and radios (`PlaybackSettings.tsx` ~21, ~26).
  - Progress bars, where a `#FFFFFF40` track is invisible on light backgrounds (`HomeScreen.tsx` ~64, `GuideScreen.tsx` ~43).
  - The selected day tab, which differs only by white against `#EEEEE7` at 1.17:1 (`FullGuide.tsx` ~59).
- **Fix:**
  - Green text and state icons on light surfaces use `colors.link` (`#0B7A47`, about 5:1).
  - Progress tracks use `colors.line` and fills use `colors.link` in light mode.
  - The selected day tab gets the same treatment as other segments (`colors.selected` fill, `selectedText`, a check icon, `accessibilityState.selected`).

### M3. Missing control states
- **Where:**
  - Audio/subtitle rows show no current choice (`Player.tsx` ~251).
  - `IconButton` has no disabled look or state (`ui.tsx` ~21–22); the Move up/down buttons look tappable when they're not.
  - The mode chips in `LibraryOptions.tsx` and Export/Import in `BackupSettings.tsx` have no selected state.
  - The filters toggle (`FullGuide.tsx` ~58) and Advanced (`ProviderSheet.tsx` ~35) have no `expanded` state.
- **Fix:**
  - Use `role` radio or tab, with `checked`, `selected` and `expanded` states, plus a visible check icon.
  - `IconButton` gets `disabled` styling at 0.4 opacity and `accessibilityState.disabled`.

### M4. Forms
- **`Field` (`ui.tsx` ~29):**
  - It forces `autoCapitalize="none"` and `autoCorrect={false}` after `{...props}`. Move them before the spread so callers can override them; "Profile name" should capitalise.
  - Add an `error` prop that renders under the input and is announced.
  - Show provider, PIN and backup errors at the field.
- **Field chaining.** Chain the fields with `returnKeyType="next"`, ending with `"go"`, which submits:
  - provider form: name → address → username → password;
  - backup: password → confirm;
  - PIN → confirm.
- **Autofill.** Add `textContentType` and `autoComplete`:
  - URL: `textContentType="URL"`, `autoComplete="url"`.
  - Username: `textContentType="username"`, `autoComplete="username"`.
  - Passwords: `textContentType="password"`, or `"newPassword"` for the backup password.
  - PIN fields: `autoComplete="off"`, `importantForAutofill="no"`, `autoFocus`.
- **Android provider layout.** On Android phones narrower than 600 dp, stack the username and password fields instead of putting them side by side (`ProviderSheet.tsx` ~34).
- **Validation:**
  - Disable "Connect playlist" until the required fields are valid, and show why.
  - Show "N more characters" live for the 12-character backup password.
  - Add a Show toggle and `keyboardType="url"` to the XMLTV URL (`FullGuide.tsx` ~47).
- **Sheet button label.** In the "Add a profile" sheet, the top-right button reads "Done". This dismisses an unsaved form:
  - when the form has changes, label it "Cancel";
  - ask for confirmation before discarding entered values.
- **TV inputs.** Add `disableFullscreenUI` to the search field (`TVApp.tsx` ~347), the guide URL and the provider form, plus `returnKeyType` and `onSubmitEditing` to move focus onward. Hide or explain the File tab on TV when no document picker is available.

### M5. Loading and empty states
- **Spinners:**
  - Replace the full-screen spinners with poster/row skeletons (`LibraryScreen.tsx` ~102, episodes `NodeCastProvider.tsx` ~550).
  - The bare guide spinner (`FullGuide.tsx` ~67) gets text.
  - `GuideScreen.tsx` ~43 renders ten spinners, one per card; replace them with one.
- **Actions to add:**
  - "Try again" on the episodes error;
  - "Show all channels" or "Clear search" on the empty guide (`FullGuide.tsx` ~68);
  - "Clear search" and "Show all" focusable actions on the empty TV library (`TVApp.tsx` ~355);
  - "Try again" and "Manage playlists" on the TV Home error (`TVHome.tsx` ~23);
  - "Loading episodes…" text on the TV episodes loader (`TVApp.tsx` ~344).
- **`StorageSettings.tsx` ~10:** shows "Not measured" while it's still measuring. Show "Measuring…" instead.

### M6. Copy and data formatting seen in the native screenshots
- **Pluralisation.** It's wrong in several places: "1 titles" and "1 channels" (`LibraryScreen.tsx` ~106, `android-tv/TVApp.tsx` count ~342/353, `FullGuide.tsx` ~48, `NodeCastProvider.tsx` ~494, `LibraryOptions.tsx` ~22).
  - Add a `plural(count, 'title')` helper using `Intl.PluralRules`, and use it everywhere.
- **Date format.** The guide day tabs read "Sat 21" on iPhone but "21 Sat" on Android.
  - Use `toLocaleDateString([], { weekday: 'short', day: 'numeric' })` consistently, without hand-ordered parts.
- **Truncation.**
  - The player title truncates to "Evening stud.." with two dots on Android (see `store-assets/android/android-player.png`). Use `numberOfLines={1}` with `ellipsizeMode="tail"` and no manual slicing, and give the title the remaining flex space.
  - "Playback information" wraps to two lines in the player grid while the other labels don't. Allow two lines evenly, or shorten it to "Playback info".
- **Search results header.** It shows a lone refresh icon with no "Updated …" text when nothing is known (iPhone search screen). Hide the row, or show "Not refreshed yet".

### M7. Guide timeline readability (all editions)
- **Where:** `GuideTimeline.tsx` (~12) draws the current-time line across the programme cells and through their time and title text (see `ios-guide.png`, `android-guide.png` and `tv-guide.png`).
- **Fix:**
  - Draw the now-line behind the cells (lower `zIndex`), or as a marker in the time ruler with a thin line in the gaps.
  - Keep the "on now" state through text: an "On now" label, or a check plus bold text (not just colour).
- **TV.** The time ruler appears only on the first row (`showTimes={!isTVBuild||index===0}`, `FullGuide.tsx` ~70) and scrolls away. Make it a sticky ruler above the list, driven by `timelineGroup`. Update the header/preview from the focused programme cell's `onFocus`.

### M8. Phone navigation and duplicate titles
- **iPhone Live TV.** The iPhone tab bar has no Live TV (`navigation.tsx` ~69–75: Home, Guide, Movies, Series, Search), so Live TV is reachable only through Home "See all".
  - Make the tabs Home, Live, Guide, Library, Search. Library holds the Movies/Series segments and favourites, matching Android. Keep 5 tabs.
- **Repeated header actions.** Every tab header repeats three icon buttons (favourites, settings, add), so search and add crowd the header on small iPhones.
  - Keep "Add playlist" on Home and in Settings only, and keep one consistent action per tab.
- **Android Home chips.** "For you / Live TV / Movies / Series" duplicate the bottom tabs, and three of them navigate away while claiming `selected`.
  - Remove them, or turn them into real in-place filters.
- **Duplicate titles.** Remove in-page h1s that repeat or contradict the native header:
  - "Guide" under the header "Guide" (`FullGuide.tsx` ~58);
  - "Add playlist" under "Add a profile" (`ProviderSheet.tsx` ~27): pick one title, "Add a playlist";
  - "Choose a player" against "Choose your player" (`ExternalSheet.tsx` ~29);
  - the repeated h1 on the series and details pages.
  - On TV, use one sheet header (chevron "Back" plus a 28 sp title) and drop the inner h1.
- **Guide settings.** It's a mode inside `FullGuide` with its own "Back to guide" button (`FullGuide.tsx` ~47), so system Back leaves the whole guide. Push it as a native stack page.
- **Pushed page titles.** Pushed pages start with `title: ''` (`navigation.tsx` ~46). Set the title through route params, so it shows during the push animation.

### M9. TV player and overlays
- **Player controls:**
  - Icon-only player controls need visible labels, or a label under the focused control: "Player options", "Choose another player", "Audio and subtitles".
  - "Audio and subtitles" reuses the guide filter icon; give it a distinct icon.
- **Track sheet.** Use one shared TV track sheet (`Player.tsx` ~249–251 and `CompatibilityPlayer.tsx` ~148):
  - section headers, a checkmark and selected state, and 18 sp rows;
  - hold the controls open while it's open (`chrome.hold`).
- **Auto-close.** Don't auto-close player panels on TV after 8 s (`PlaybackChrome.tsx` ~21–22, `BuiltInPlayer.tsx` ~56). Back or "Back to video" closes them.
- **Readability.** Add a top gradient (`#000000B3` → transparent, about 160 dp) behind the player's top bar so text stays readable over video (`Player.tsx` ~244, `CompatibilityPlayer.tsx` ~161).
- **Mini player:**
  - Route media keys to the mini player (`tv-scope:mini`) as well.
  - Back with the mini player visible navigates first and doesn't kill playback (`TVApp.tsx` ~230).
- **Sheets.** Trap focus in form sheets (`tv-trap:sheet:provider`), or confirm before leaving with unsaved input. Today Left reaches the rail and drops a half-typed form.
- **Rail Search.** It always jumps to Live TV (`TVApp.tsx` ~362, `setPage('live')`). Keep the current section and focus its search field.

### M10. TV consistency
- **Back controls.** Use one Back control style: chevron "Back". Today there are five variants, including "Exit" with a contract icon (`CompatibilityPlayer.tsx` ~161), "Back to guide" and "Back to video".
- **Selected versus focused.** The selected state in `TVLibraryOptions.tsx` (~25, ~27), category chips and the rail uses an accent border that looks like focus. Use a fill plus a check for selected, and keep the ring for focus.
- **Long-press hint.** Show a hint in the library toolbar ("Hold OK for options"). Make long-press open item options for every item kind, not "Library options" as a fallback.
- **Library title.** It has a fixed `width:132` at 30 sp (`TVApp.tsx` ~347); "Favorites" wraps. Remove the fixed width.
- **Settings:**
  - Settings is one long column of full-width pill buttons with centred labels (`tv-settings.png`).
  - Use a two-column grouped list with descriptions, like the phone Settings.
  - Keep "Remove" visually separated and red.
  - Hide the light theme option on TV, or adapt the ring and gradients for it.

---

## Phase 4: Low

- **Seek bar.** `VideoSeekBar` is 32 pt tall; give it a 44 pt hit area (`VideoSeekBar.tsx` ~20).
- **Android storage copy.** Android tells users "Protected by iOS secure storage" (`NodeCastProvider.tsx` ~545). Use platform-correct copy.
- **Floating labels.** The Android floating label uses `colors.bg` as its background, which shows as a patch inside cards (`ui.tsx` ~28). Use the surface's own colour.
- **Splash.** It plays about 2 s of intro on every cold launch, even with data ready (`StartupSplash.tsx` ~66). Skip it, or shorten it to under 600 ms, when data is already loaded.
- **iPhone Home search.** The fake search field duplicates the Search tab (`HomeScreen.tsx` ~32). Use the native `headerSearchBarOptions` on library stacks instead.
- **Deep links.** They land on "This page has closed" because routes use in-memory keys (`navigation.tsx` ~162–174). Give details/series pages ID-based params that can be rebuilt from the cached catalogue.
- **Unstable TV focus IDs.** Some TV focusables use `useId()` fallbacks, so focus can't be restored after a remount (`SearchScope.tsx` ~8, `Player.tsx` ~251, `FullGuide.tsx` ~58, ~47). Give them a stable `nativeID` or `accessibilityLabel`.
- **TV focus stops that do nothing:**
  - "Use profile" on the already-active profile (`TVApp.tsx` ~349);
  - "Watch live" on a non-live featured item (`TVHome.tsx` ~21);
  - "Turn sleep timer off" when it's off (`BuiltInPlayer.tsx` ~63).

  Disable, hide or relabel them.
- **TV spacing.** Unify TV left edges, card radii (16 dp) and title sizes (`TVHome.tsx` ~18–24, `TVChannelRow.tsx` ~11, `TVApp.tsx` ~385).

---

## Verification (run after every phase; all must pass)

From `apps/player/`:

```bash
npm ci
npm run typecheck
npm test
npx expo export --platform web --output-dir /tmp/glowtv-web
EXPO_PUBLIC_APP_VARIANT=tv npx expo export --platform web --output-dir /tmp/glowtv-tv-web
EXPO_PUBLIC_DESIGN_PLATFORM=android npx expo export --platform web --output-dir /tmp/glowtv-android-web
```

From the repository root:

```bash
node verification/glowtv/check-ui-grid.cjs
node verification/glowtv/check-ui-scope.cjs
```

Then:

- **Unit tests.** Add or extend tests in `apps/player/tests/` for:
  - the `plural()` helper;
  - the tablet orientation decision (phone locks, tablet unlocks);
  - the message tone/auto-dismiss logic;
  - TV Back routing (library page → Home; Home requires a double Back).
- **Browser screenshots.** Serve each web export and capture Playwright screenshots:
  - iPhone 393×852, Android 412×915, iPad 1032×1376 and TV 1920×1080;
  - light and dark;
  - text scale 1.0 and 2.0 for phones (zoom the root font or use the RN web `fontScale`).

  Save them to `verification/glowtv/audit-0.7.3/` with a `checks.json` of what passed.
- **Contrast.** Check every changed colour pair with the WCAG formula (≥ 4.5:1 text, ≥ 3:1 icons and state). Record the ratios in `checks.json`.
- **Native-only follow-up.** List in the summary the behaviour that only a native build can confirm: TV focus ring, D-pad flows, CH+/− and INFO keys, iPad multitasking and rotation, VoiceOver/TalkBack announcements, and Dynamic Type at the largest size. Don't claim these as verified.

## Deliverables

1. One commit per phase on a branch named `codex/ui-ux-0.7.3`. Each message lists the finding IDs it closes (for example "Fix C1–C4: iPad orientation, contrast, TV focus").
2. `docs/UI-UX-AUDIT-0.7.3.md`. For every finding ID, state: fixed / partly fixed (why) / not fixed (why), plus the changed files and before/after screenshot links.
3. If any native module is added (for example `expo-device`), say that a new native build is required. Don't bump versions or publish downloads.
4. Don't touch `website/`, release workflows, provider/storage/guide/backup models, playback engines or signing.
