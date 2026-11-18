# GlowTV UI audit — 0.7.1

Baseline: the published 0.7.0 source, commit `5c1ce75`. Scope: existing iPhone/iPad, Android phone and Android TV/Fire TV UI. Native navigation, animation timings, remote implementation, provider/data models and player lifecycle effects are retained. Apple TV is not an existing target.

## Findings and fixes

| Requested check | Screen / component | Finding and change |
| --- | --- | --- |
| Decorative stripes on cards | Home, library, settings, guide and version cards | No purely decorative card stripes found. Keep actual playback progress, the guide's current-time indicator, focus rings and dividers: these communicate state. No invented issue or cosmetic replacement. |
| Colored circles behind icons | All empty states (`ui.Empty`); Settings (`SettingsRow`, profile and support rows); Home avatar/favorite; Home IP intro; Playback defaults | Removed generic icon backplates and the extra empty-state tile. Use bare Lucide icons aligned to a stable column. Keep the supplied brand logo, provider artwork and contrast scrims on artwork/video controls. |
| Emojis / text standing in for icons | TV library favorites; Appearance, Library options, provider tabs, guide filters, series seasons, backup tabs and player menus | No emoji headers found. Unicode heart/check/radio glyphs and mixed icon families were present in controls. Replaced them with Lucide icons. Selected favorites use a filled heart, preserving a visible saved/unsaved distinction. OS-native tab bars use local 1×/2×/3× Lucide images rather than SF/Material glyphs; system back gestures and navigation remain native. |
| Passive content wrapped in cards | Welcome hero, disconnected Home, Privacy sections, Home IP instructions, Network details, movie poster surround | Removed passive promotional/information card treatments. `PlainSection` (styled-components) or the neutral `u.section` expresses information through headings and spacing. Keep actionable settings groups, playable media, confirmation tasks and editable forms. |
| Weak hierarchy | Home, Settings, Backup & transfer | Home's featured title and Play/Resume are the primary focus. Removed duplicate Browse/playlists/playback navigation beneath the library; native tabs, header and Settings retain those destinations. Settings has one active-profile entry instead of two links to the same profile destination. Backup's mode controls and optional support use secondary styling so the task's commit action is dominant. |
| Non-semantic color | Settings support/profile, Network warnings, TV connection, Version history, default-player and library icons | Removed leftover purple, cream and brown UI accents and hard-coded light panels in dark mode. Memoized movie/poster and media-row components now subscribe to appearance changes, fixing retained light text colors after a dark-mode switch without remounting lists. Three color families: primary green, neutral, semantic red. Dark/light surface and contrast tones belong to those families. Green marks action/selection/focus/progress; red marks LIVE/errors/destructive actions. |
| Off-grid spacing | Shared primitives; Home; Guide/Now & next/program sheet; playlists; movies/episodes; all settings; TV Home, connection, library and shell | Moved visual padding/margins/gaps to 8px multiples. The design token file defines 8/16/24/32/40/48/64. Type sizes, optical icon strokes, borders, safe-area values, video aspect ratios and system bar dimensions are not spacing tokens. TV list/grid measurements were updated with the changed visual row sizes so virtualization remains accurate. |
| Clutter | Home, Welcome, Settings support, IP help, movie details | Removed duplicate navigation, decorative onboarding framing, duplicated settings entry, excess support copy and the movie poster's outer card. Kept provider error messages, privacy/credential disclosures, IP/VPN limitations and destructive-action confirmations. |

## Before / after examples

These show the recurring fix per category. The complete per-file, before/after implementation is in [UI-UX-0.7.1.patch](UI-UX-0.7.1.patch).

Bare settings icons:

```diff
- rowIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.pale }
- <View style={s.rowIcon}><Icon name={icon} size={21} /></View>
+ <IconSlot><Icon name={icon} size={21} /></IconSlot>
```

Real icons in controls:

```diff
- <Text>{favoriteIds.has(item.id) ? '♥' : '♡'}</Text>
+ <Icon name={favoriteIds.has(item.id) ? 'heart' : 'heart-outline'} />
- <Text>{choice === value ? '● ' : '○ '}{label}</Text>
+ <Icon name={choice === value ? 'radio-button-on' : 'radio-button-off'} />
+ <Text>{label}</Text>
```

Passive information:

```diff
- <View style={u.card}><Text style={u.h2}>On this device</Text>…</View>
+ <View style={u.section}><Text style={u.h2}>On this device</Text>…</View>
- <View style={h.emptyFeature}>…</View>
+ <PlainSection>…<Button title="Connect playlist" … /></PlainSection>
```

Hierarchy and clutter:

```diff
- <SectionHeading title="Browse" />  // repeated native destinations
- <SettingsRow title="Saved profiles" onPress={openProfiles} />
+ // Browse remains in tabs / See all. Profiles remain in the active-profile entry.
- <Button title="Buy me a coffee" variant="mint" … />
+ <Button title="Buy me a coffee" variant="secondary" … />
```

Semantic, theme-safe color:

```diff
- { backgroundColor: '#EEEEE7', borderColor: '#EED9B7' }
- { color: '#65523E' }
+ { backgroundColor: colors.panel, borderColor: colors.line }
+ { color: colors.secondary }
- { borderColor: '#DED9F3' } // latest-version decoration
+ // Standard neutral card border; CURRENT text conveys version state.
```

Grid and virtualization:

```diff
- content: { paddingHorizontal: 20, paddingTop: 12, gap: 24 }
+ content: { paddingHorizontal: space.md, paddingTop: space.sm, gap: 24 }
- gap: 10, padding: 18
+ gap: 8, padding: 16
- CHANNEL_ROW_HEIGHT=54; CHANNEL_ROW_GAP=6;
+ CHANNEL_ROW_HEIGHT=56; CHANNEL_ROW_GAP=8;
- { length:228, offset:5+index*228 }
+ { length:232, offset:8+index*232 }
```

## Updated code and tokens

- [Design tokens](../apps/player/src/designTokens.ts): grid, controls, radii and the three-family palette.
- [Styled-components primitives](../apps/player/src/AuditPrimitives.tsx): `PlainSection` and `IconSlot`.
- [Lucide adapter](../apps/player/src/icons.tsx): existing semantic call sites retained; direct subpath imports avoid importing the entire icon library.
- [Shared React Native UI](../apps/player/src/ui.tsx), [theme](../apps/player/src/theme.tsx), [Home](../apps/player/src/HomeScreen.tsx), [settings rows](../apps/player/src/navigation/shared.tsx).
- [Native tab icon generation](../verification/glowtv/generate-tab-icons.cjs). Native tab images include density variants and Lucide's license.

Use `npm ci` in `apps/player` for the locked dependencies. If reproducing the original dependency addition: `npx expo install react-native-svg`, then `npm install lucide-react-native styled-components`. SVG is the only added native visual dependency; a new native build is required. No player engine/API/data migration is involved. Existing styles are retained outside audited components rather than introducing a global styling rewrite.

## Verification

Run `node verification/glowtv/check-ui-scope.cjs` from the repo root: it confirms provider/storage/guide/backup/playback models, engine lifecycle effects, animation calls and the TV remote implementation match 0.7.0. TypeScript and all 130 existing app tests pass. Browser screen/settings checks passed for iPhone, iPad, Android and TV, exercising both themes and small/large phone and TV viewports. Movie/settings screenshots require loaded content rather than a fixed-delay empty frame; these do not replace native device tests. Release build, native audit and download provenance are recorded in `verification/glowtv/release-0.7.1.json` when publication finishes. Real-device/provider playback remains a separate check.
