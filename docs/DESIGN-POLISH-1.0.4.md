# GlowTV design polish — 1.0.4

Direction: a quiet streaming library. Warm iPhone/iPad surfaces, dark Android
and TV surfaces, restrained navigation, artwork-led browsing and a small live
dot. Newsreader and Instrument Sans remain the established brand typefaces.

## Changes

| Area | Finding | Change |
| --- | --- | --- |
| Shared typography | Large headings and equal-weight labels competed with content | 28-point content headings, 18-point sections, 15-point labels/body, 13-point secondary text; existing TV type scale retained |
| Phone/iPad layout | Inconsistent gutters and oversized Settings rows | 16-point phone gutters, 24-point tablet gutters, compact grouped Settings and flat 72-point channel rows |
| Home | Oversized favorite artwork and empty vertical spacing | Smaller favorite composition, understated no-favorite greeting and aligned channel rows |
| Movies | Favorite controls covered poster artwork | Actions below artwork, consistent poster radii and a readable row layout at large text sizes |
| Series | Repeated title, indistinct toggle states and heavy episode cards | Native title only on pushed pages, visible selection indicators, compact thumbnails and divided episode rows |
| Guide | Channel and programme rows had different heights; every current cell had a strong outline | Shared row geometry, quieter cell borders, selected day treatment and explicit “On now” text |
| Player | White controls disappeared over bright frames; portrait tools filled four large rows | Neutral contrast surfaces around transport/header controls, measured VLC placement and a two-column phone tools layout |
| TV | Favorite hero actions wrapped; Settings rings lacked clearance | Full-width hero action row, shorter hero, inset grouped Settings, compact profile actions and no inactive “Use profile” stop |
| TV Guide | Opening from Settings passed an empty page catalogue | Bind the Guide to the active playlist's cached catalogue, retaining hidden-group and family access checks |
| Welcome/forms | Oversized headline and heavy source selectors | Shorter copy, smaller headline and quieter selected source tabs; credential warnings and every input retained |

No engine, provider/storage/backup models, signing configuration, app identifier,
native navigation flow, animation curve or install instructions changed. The
TV Guide correction changes only the catalogue supplied by its screen binding.
The supplied launch films remain unchanged.

## Verification

- TypeScript, all 192 app tests, the 8-point grid guard and protected-scope guard pass.
- iOS-style, Android-style and TV browser exports pass.
- Browser capture harness: `verification/glowtv/design-polish-capture.py`.
- Contrast calculations: [contrast.json](../verification/glowtv/design-polish-1.0.4/contrast.json).
- Browser screenshots are previews, not native-device captures. Font-scale
  fixtures temporarily instrument the installed RN Web Dimensions module and
  restore it immediately; no test hook is shipped in the app.
- Passing browser scenarios: iPhone 393×852/light, Android 412×915/dark,
  iPad 1032×1376/light plus landscape Home, small iPhone 360×740/light,
  iPhone/dark at 2× text, Android 360×740/light at 2× text, and TV
  960×540 logical at 2×/4× pixel density (1080p/4K output).
- Each walkthrough exercises favorite/no-favorite Home, category pin ordering,
  Guide import, series episodes, all seven Settings destinations, live
  Next/Previous, VOD transport geometry, decoded fixture video, and chrome
  hide/reveal. No browser page errors or public-IP requests were observed.
- Changed text pairs measure 5.05:1–15.32:1, including player controls
  composited over a pure-white video frame.
- Native verification and publication are pending for build 10005. Existing
  public downloads remain untouched until the relevant native gate passes.

### Review screenshots

| Layout | Before | Updated |
| --- | --- | --- |
| iPhone Home | [1.0.3 preview](../verification/glowtv/player-polish-1.0.3/iphone-home.png) | [Home](../verification/glowtv/design-polish-1.0.4/default/iphone-home.png), [Guide](../verification/glowtv/design-polish-1.0.4/default/iphone-guide.png), [Series](../verification/glowtv/design-polish-1.0.4/default/iphone-series.png) |
| Android player | [1.0.3 preview](../verification/glowtv/player-polish-1.0.3/android-live-player.png) | [Live player](../verification/glowtv/design-polish-1.0.4/default/android-live-player.png), [Settings](../verification/glowtv/design-polish-1.0.4/default/android-settings.png) |
| iPad | [1.0.3 Home](../verification/glowtv/player-polish-1.0.3/ipad-home.png) | [Movies](../verification/glowtv/design-polish-1.0.4/default/ipad-movies.png), [Landscape Home](../verification/glowtv/design-polish-1.0.4/default/ipad-landscape-home.png) |
| TV | [1.0.3 Home](../verification/glowtv/player-polish-1.0.3/tv-home.png) | [Home](../verification/glowtv/design-polish-1.0.4/tv-4k/tv-home.png), [Guide](../verification/glowtv/design-polish-1.0.4/tv-4k/tv-guide.png) |
| Large text | — | [Dark iPhone Guide](../verification/glowtv/design-polish-1.0.4/iphone-dark-large-text/iphone-guide.png), [Light Android Live](../verification/glowtv/design-polish-1.0.4/android-light-large-text/android-live.png) |

Build source: `792bd9c9fc55e6a0fc3b32f953600634c448f340`.
[Android build](https://github.com/nhshajib/NodeCast/actions/runs/45828787534).
[iPhone/iPad build](https://github.com/nhshajib/NodeCast/actions/runs/45828793220).

Capture maintenance: the Android importer accepts the verified package version
to place its scene-color probe below 1.0.4's wider transport controls. The
original color ranges and >50% scene threshold are unchanged (the new clear
probe measures 100%; a black surface still fails). TV capture setup now sets
logos explicitly On instead of blindly toggling the current default Off.

The preceding iPhone run 45726368221 passed its cold-start/background-resume
test. Its design test failed because XCUITest spent longer than the four-second
chrome timeout re-resolving a Back tap after restoring the mini player. The test
now verifies the visible Back control and taps its coordinates immediately,
restoring controls first if hidden. Assertions and production chrome timing
remain unchanged; a fresh simulator run must confirm it.

Physical-device checks are skipped by owner decision. Native focus rings,
D-pad navigation, VoiceOver/TalkBack, Dynamic Type and iPad orientation cannot
be certified from browser previews.

Design guidance: [unslop](../.claude/skills/unslop/SKILL.md), by
[Damir Sokolovsky](https://heydamir.design/unslop), CC BY 4.0.
