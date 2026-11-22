# GlowTV 0.7.4: native app design audit and fix brief

> **Status: fixed in 1.0.0** (see `CHANGELOG.md`). Deferred:
> - **4.5 per-ABI APKs.** Splitting changes the signed release outputs, the x86_64 emulator smoke test, checksums, the publish workflow and the Downloader code's target, so it ships after 1.0 as its own change.
> - **3.2 iPad sidebar tabs.** iPad gets full-width layouts in 1.0.0; the adaptive sidebar needs a NativeTabs change verified on device.
> - **1.6 Audio inside More (VLC player).** The phone top bar now has icon-only Back, so the title has room; the Audio button stays as a labelled icon.
> - **5.7 Remove inside Edit (TV).** Remove now sits at the far end of the row, away from Edit, and still asks first.

You are fixing the GlowTV apps in `apps/player/` (iPhone and iPad IPA, Android phone APK, Android TV / Fire TV APK). This brief comes from a design review of the **real native 0.7.4 captures** taken from the published builds:

- iPhone and iPad: CI run 44861113578
- Android phone and TV: CI run 44907960076

Every issue below cites the capture that shows it, in `verification/glowtv/native/<platform>-<screen>.png`. Platforms: `ios`, `ipad`, `android`, `tv`. Screens: `home`, `guide`, `player`, `movies`, `series`, `playlists`, `search`, `settings`.

The review used two design skills in `.claude/skills/`:

- **ui-ux-pro-max**: accessibility, touch, layout, navigation and forms.
- **unslop**: removing template and "AI-looking" signs. Its core idea is **quiet chrome and one bright element per screen**.

## Ground rules

These come from `CLAUDE.md` and take priority over anything below.

- Use the native stack, native tabs and native sheets; nothing custom unless the brief says so. Use `FocusPressable`, `Button` or `IconButton`, never React Native's `Pressable` directly.
- Targets are 44pt minimum. Haptics fire only on real state changes. Text inputs are at least 16pt.
- **Deliberate exceptions:**
  - The video player keeps its custom chrome.
  - Android TV / Fire TV keeps its rail, native focus ring and `PageTransition`, and stays D-pad first.
- Keep the leaf-green theme in `src/theme.tsx`. The accent is used only for the primary action, the selection and live state.
- **Do not change:**
  - provider, storage, guide or backup models
  - player engine patches
  - playback lifecycle effects
  - navigation and animation definitions

  `verification/glowtv/check-ui-scope.cjs` enforces this.
- Keep the 8px grid (`verification/glowtv/check-ui-grid.cjs`).
- Run all checks before committing: `npm run typecheck`, `npm test`, both web exports, and the grid and scope checks.
- After the fixes, re-run the native design audits so the 32 captures are regenerated and re-imported. Use `verification/glowtv/import-native-captures.py`, then `package-screenshots.py`. The website gallery and store assets must show the fixed app.

---

## 1. Problems that appear on every platform

**1.1 Greeting plus a second header on Home** (`ios-home`, `ipad-home`, `android-home`)

- iPhone stacks a centred GlowTV logo and "+" bar, then a second header ("Good morning / Watch" plus a profile button).
- "Good morning" is a greeting headline, an unslop sign.

Fix:

- Use one header per screen.
- **iOS and iPadOS:** a native large title "Watch" in the navigation bar, with "+" (Add playlist) and Profile as bar buttons. No logo in the bar; the tab already says where you are.
- **Android:** a Material 3 top app bar titled "Watch", with the same two actions.
- Remove "Good morning" everywhere.

**1.2 Uppercase, letter-spaced labels everywhere**

Examples:

- "FROM YOUR LIVE PLAYLIST", "LIVE CHANNEL", "YOUR LIBRARY", "ACTIVE PROFILE" on all platforms
- "MAKE IT YOURS" and "ON THIS DEVICE" (Settings)
- the small uppercase programme name above the title in guide sheets

The source is `u.eyebrow` in `src/ui.tsx`: 12pt, weight 700, letter-spacing 1.2.

Fix:

- Change `eyebrow` to sentence case, weight 600, letter-spacing 0, 13pt, colour `secondary`.
- **Grouped-list section headers:** iOS keeps the system style (UIKit uppercases them itself). Android uses Material 3 sentence-case headers.
- **Remove the redundant label** wherever it repeats the title just below it, e.g. the "Evening studio" label above "Evening studio" in every programme sheet.

**1.3 Too many red LIVE badges** (`*-home`, `*-search`, `ios-movies`)

- Every channel row carries a filled red "LIVE" badge, so nothing stands out (unslop: "every element highlighted").
- Fix: in lists, use a small 8pt red dot before the channel's genre line, with the accessibility label "Live".
- Keep one filled LIVE badge only on the Home featured card and the player.

**1.4 Headings are weight 800 Inter, which doesn't match the new website**

- The website now uses Newsreader 500 (headings) and Instrument Sans (text), both OFL, self-hosted in `website/public/fonts/`.
- The app uses `Inter-800` headings (`src/ui.tsx` `h1`) and Inter text.
- Fix:
  1. Bundle Instrument Sans 400, 500 and 600 as the app's text face. Lower h1 and h2 to weight 600.
  2. Use Newsreader 500 only for the large title on Home and the series/movie detail title, so the app and site feel like one brand. Keep TV at its larger sizes.
  3. If adding fonts risks the native build, ship step 1 only and record step 2 as a follow-up.

**1.5 Guide grid** (`ios-guide`, `ipad-guide`, `android-guide`, `tv-guide`)

- **Each row repeats its own time ruler** ("3:30 AM … 4:00 AM"). Show one sticky ruler at the top that scrolls horizontally with the grid. Rows then shrink by the ruler's height, so more channels fit.
- **Programme cells clip their last line:** "On now" is cut at the bottom of every current cell on iPhone and Android.
  - Size cells from their content: time, title and status line.
  - Or drop the "On now" text, because the current cell is already highlighted and the time marker shows "now".
- **The "now" marker is a lone line in every row, and on TV a stray dot under the ruler.** Draw one vertical now-line across the whole grid from the sticky ruler, with a small dot on the ruler only.
- **Programme detail sheet:**
  - The title appears twice; see 1.2.
  - Dates are US numeric ("11/21/2026 · 3:37 AM – 4:17 AM"). Use relative, locale-aware dates: "Today, 3:37 – 4:17 AM" or "Sat 22 Nov, 3:37 – 4:17 AM" via `Intl.DateTimeFormat`.
- **Two settings-like icons (iPhone):** a gear in the navigation bar and a sliders icon in the day row. Keep one Guide options button with a clear label.

**1.6 Player info area** (`ios-player`, `ipad-player`, `android-player`)

- Below the video is a 2×2 grid of identical outlined boxes: Player options, Display & speed, Sleep timer, Playback info. Then a full-width "Back to library" button, with Exit already in the chrome.
- The boxes have no hierarchy, and Back duplicates Exit and the swipe-down gesture.
- Fix:
  - Replace the grid with one native grouped list: icon, label, current value on the right (e.g. "Sleep timer · Off"), and a chevron.
  - Remove "Back to library".
  - On iPhone, also make the title larger and add the programme now/next line from the guide, if available.
- **Top chrome is crowded:** Exit, More, Audio, the title and Fullscreen share one row, and on Android the title is cut to "Evening stu…".
  - Keep Exit and Fullscreen as icon-only, labelled buttons, and move Audio into the More menu.
  - Let the title use the freed space.

**1.7 Library and Search filters** (`ios-movies`, `android-movies`, `android-search`)

Library stacks a type row, a category row and an "Updated…" status row. Search on Android stacks a three-way segment, a search field with a filter icon, three scope chips (the third clipped at the screen edge with a stray `[`), and a "TV guide · Not refreshed yet" row.

Fix:

- **Type:** a native segmented control (iOS) or Material segmented buttons (Android) for Live, Movies and Series. No check marks inside chips.
- **Category:** one horizontally scrolling chip row.
- **Scope** ("This category / This media type / All media"): move into the filter sheet behind the sliders icon.
- **Freshness status:** show only when stale or failing, e.g. "Updated 2 h ago · Refresh". Not "Not refreshed yet" by default.

**1.8 Duplicate ways to reach the same place**

- **Android:** Settings is a tab *and* a gear on Library and Guide.
  - Remove the gear when Settings is a tab.
  - The Settings top bar shows "+" *and* a "+ Add playlist" button in the content; keep one, the content row.
- **iPhone and Android tab sets differ:** iOS has Search, Android has Settings.
  - Pick one structure: Home, Live, Guide, Library, Search, with Settings reached from the profile button.
  - Alternatively keep Settings on Android, but write the reason down and keep it consistent on tablets.

**1.9 Detail and title text that adds nothing**

- Settings has the subtitle "Your players, playlists, and preferences." Remove it.
- Library shows "Demo playlist" above the filters. That's the profile name; move it to the profile button or menu.

**1.10 Home shows the public IP address** (`ipad-home`)

- A "Your connection" card shows "13.105.117.205", Washington, "VPN unverified" on Home. It's sensitive, ends up in screenshots, and isn't what people open a TV app for.
- Move it to Settings → Home IP & connection.
- On Home, show at most a small status line when the check finds a problem ("Connected from your home IP"), and never the address itself.

---

## 2. iPhone (IPA)

1. **Featured card** (`ios-home`): the heart sits loose beside "Watch live". Group it with the primary action as a 44pt icon button with the label "Save to favourites". The art is cropped hard into the card corner; give it its own rounded frame inside the card padding.
2. **"Live now" list:** no chevrons, and the whole rows have no affordance. Add chevrons or play icons, and make each full row the 44pt target.
3. **Series** (`ios-series`):
   - "✓ Season 1" is a chip with a check mark acting as a picker. Use a native menu button "Season 1 ▾" (or a segmented control if there are only 2–4 seasons).
   - The episode check-circle icons are ambiguous between watched and selected. Use a filled check with the label "Watched", or a progress ring.
4. **Add a playlist sheet** (`ios-playlists`):
   - The top-right "Done" on an unsaved form is ambiguous. Use **Cancel** (left) and **Connect** (right, disabled until valid), as native forms do.
   - The segment uses a check mark inside the selected option; use a native segmented control.
5. **Search** (`ios-search`): opens on the full library list. Show recent searches and the category chips until the user types, then results. Add a 300 ms debounce. Results use the list style from 1.3.
6. **Settings** (`ios-settings`): "+ Add playlist" is a large outlined pill between grouped lists, breaking the iOS grouped style. Make it a row in the profile group ("Add playlist" with a plus icon, in tint colour).

## 3. iPad (IPA)

The iPad build is the phone layout either stranded in a narrow column or stretched across the full width.

1. **Home** (`ipad-home`):
   - Content sits in a column about 340pt wide on the left, with two-thirds of the screen empty.
   - Use the full width: the featured card as a wide hero (16:9 art beside the text), "Live now" as a 2–3 column grid of cards, and "From your playlist" as a wider shelf.
   - Use readable max widths (about 720pt) only for text blocks, never for the whole screen.
2. **Navigation:**
   - iPadOS 18+ tab bars can become a sidebar. Allow the sidebar on iPad, so Live, Guide and Library work as a source list with content beside it.
   - The tab bar and "+" float at the top with a separate GlowTV logo below; remove the logo (see 1.1).
3. **Player** (`ipad-player`):
   - The video spans the full width, with the 2×2 option grid stretched below it.
   - In landscape, use a theatre layout: video at 16:9 on the left (about two-thirds), the now/next and options list (1.6) in a right column.
   - In portrait, video on top and the list below, at a readable max width.
4. **Library** (`ipad-movies`): one small poster in the top-left corner. Use an adaptive grid with a minimum poster width of 160pt and comfortable gaps, so the shelf fills the width.
5. **Series** (`ipad-series`): the "Start series" button spans the whole screen (about 1,000pt). Cap primary buttons at about 360pt, or place it beside the poster in a two-column header (poster left; title, meta, Start and Season on the right).
6. **Settings** (`ipad-settings`): a 270pt column centred on a huge empty canvas. Use a split view: the settings list on the left (about 320pt) and the selected page on the right, the iPad Settings pattern.

## 4. Android phone (APK)

1. **Material 3 consistency:**
   - The tab bar's active pill and the chips follow Material, but headers are custom (see 1.1).
   - Use a top app bar that collapses on scroll for Home, Guide, Library and Settings.
   - Remove the uppercase labels from 1.2.
2. **Search / Live** (`android-search`): the screen is titled "Live" but behaves as search with three filter layers. Fix per 1.7. The third scope chip is clipped at the right edge with a stray `[`; this goes away once scope moves to the sheet.
3. **Truncation:** "Original de…" in result rows and "Evening stu…" in the player bar. Let secondary text wrap to two lines in rows, and free space in the player bar (1.6).
4. **Add a playlist** (`android-playlists`):
   - The footnotes ("Saved securely…", "Use HTTPS…") run behind the gesture bar at the end of the scroll.
   - Add bottom padding equal to the navigation-bar inset plus 24dp, so the last line can scroll clear of the gesture bar.
5. **Package size:**
   - The phone APK is 231 MB (`android-mobile/build.json`, 242,071,096 bytes) because it bundles three ABIs plus VLC.
   - Publish per-ABI APKs (arm64-v8a as the default download, plus armeabi-v7a and x86_64), or an AAB for stores. Most users then download under 100 MB.
   - Keep the same signing key and version code rules.
   - Update the website download metadata and checksums to list each file.

## 5. Android TV / Fire TV (TV APK)

TV keeps its rail, focus ring and D-pad model. These are layout and focus bugs.

1. **Search never opens** (`tv-search` is pixel-identical to `tv-home`):
   - Either selecting Search on the rail doesn't navigate, or the design audit captures before navigation finishes.
   - Reproduce with `scripts/tv-remote-driver.py` using D-pad only. Fix the cause in the app or the harness, and make the audit fail when two screen captures are identical.
2. **Home** (`tv-home`):
   - The "From your playlist" posters are cut off at the bottom: only the top halves are visible, with no titles.
   - Size the hero to about 55% of the safe area so the first shelf (posters plus titles) is fully visible on load, the standard 10-foot pattern.
   - Remove the "GlowTV" text beside the rail logo; the logo already identifies the app.
3. **Guide** (`tv-guide`):
   - The preview has both an × and a Back button; keep Back only (the remote's Back key does the same).
   - The ruler's last label is clipped ("2" at the right edge); end the ruler on a full label.
   - The stray dot under the ruler is the now-marker detached from its line; see 1.5.
   - Only two channel rows are visible because the preview takes about 40% of the height. Collapse the preview to a single line (channel · programme · time) when focus moves into the grid, and expand it again on focus up.
4. **Movies** (`tv-movies`): the category chip row is half-hidden under the top edge ("All", "Original demos" cut in half). The list scroll offset is wrong after restoring focus. The chip row must be fully visible when the screen opens, with focus restored without scrolling it off.
5. **Series** (`tv-series`):
   - The header says "Episodes" instead of the series name; use "Tidewater Stories".
   - The rail has scrolled so the Home icon is gone, and this happens on Settings too (`tv-settings`, where the rail starts at Guide).
   - The rail must never scroll its first items out of view. Give it a fixed height with all items visible (seven items fit at 1080p), or keep Home pinned.
6. **Add playlist with the on-screen keyboard** (`tv-playlists`):
   - The IME covers the whole form; only the profile name is visible.
   - Use the Android TV pattern instead: one field per step, full width at the top, with the IME below; or `adjustPan` so the focused field stays above the keyboard.
   - Show the field label and step ("Server address · 2 of 4") above the keyboard.
7. **Settings** (`tv-settings`):
   - "Remove" (red) sits right beside "Edit", so one D-pad press too far deletes a profile.
   - Move Remove into the Edit screen as the last item, with a confirmation dialog whose default focus is **Cancel**.
   - The two-column cards are cut off at the bottom; make sure the first focusable row of each section is fully visible when it gets focus.
8. **Player** (`tv-player`): the title is about 14px. At 10-foot distance, titles should be 24–28px and labels 18px or more. Show the channel name and the current programme; hide the chrome 4 s after the last key press.

---

## 6. Definition of done

1. Every item above is fixed, or recorded in `docs/UI-UX-AUDIT-0.7.4.md` with a one-line reason it was deferred.
2. `npm run typecheck`, `npm test`, both web exports, and `check-ui-grid` and `check-ui-scope` pass.
3. The native design audits pass on iPhone, iPad, Android API 35 and TV API 35:
   - all 32 captures regenerated;
   - no two screen captures pixel-identical;
   - the TV run D-pad only, using `tv-remote-driver.py`.
4. The new captures are imported and packaged, so `website/public/screenshots/` and `store-assets/` show the fixed app.
5. The website audit (`cd website && npm run build && npm run audit`) passes.
6. Bump to 0.7.5, add changelog entries per edition, and release through the existing tag flow.

Report what changed per platform with before and after capture paths.
