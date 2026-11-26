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
- Native verification and publication are pending for build 10005. Existing
  public downloads remain untouched until the relevant native gate passes.

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
