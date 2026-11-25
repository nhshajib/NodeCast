# GlowTV promo video: production prompt

Paste everything below the line into the video agent. Real screenshots exist and should be attached if the agent accepts images: `website/public/screenshots/` in this repo (iPhone, Android, TV: home, guide, player, playlists, search, movies, series, settings), also live on https://glowtv.app. The layout descriptions in section 4 match them.

---

## 1. Brief

Make a premium, calm, confident promo for **GlowTV**, a free personal TV player app for iPhone, iPad, Android phones, Android TV, Google TV and Amazon Fire TV. People bring their own playlist (Xtream Codes login, M3U link or playlist file). GlowTV turns it into a clean, fast, beautiful TV experience: live channels with logos, a TV guide, favorites, continue watching, profiles, family controls and a built-in player.

**The feeling:** the relief of a messy remote-control world becoming quiet and tidy. Evening, sofa, warm lamp, a screen that finally behaves. Not hype, not neon, not "free TV".

**Tagline:** "Your TV. Finally calm."
**Alternate lines:** "Bring your playlist. GlowTV does the rest." · "One player. Every screen."
**End card:** GlowTV logo, "Free download at glowtv.app", platform row: iPhone · iPad · Android · Android TV · Fire TV.

**Deliverables**
1. Master: 45 seconds, 16:9, 3840×2160 (also 1920×1080), 30 fps.
2. Social cut: 15 seconds, 9:16, 1080×1920, captions burned in.
3. Bumper: 6 seconds, 16:9 and 1:1 (1080×1080).
4. Silent-safe: every message must also be readable as on-screen text.

## 2. Hard rules (do not break)

- **GlowTV is a player only.** It provides no channels, playlists or subscriptions. Never say or imply "free channels", "free TV", "thousands of channels included", "no subscription needed for content" or show piracy cues.
- **Only original, made-up demo content.** No real TV networks, sports leagues, team kits, logos, film posters, celebrities or recognisable shows. Use these demo channels: **Evening studio**, **Wild North**, **Quiet studio**, **Harbour News**, **Morning Kitchen**, **Field Notes**. Thumbnails are simple, flat illustrated scenes: dusk hills with a pale moon, a pine coastline, a softly lit studio desk, a harbour at dawn, a kitchen window, a meadow. Muted palettes, no text inside the artwork.
- **No store badges** (App Store, Google Play, Amazon). The app is downloaded from glowtv.app. Do not show prices.
- No fake reviews, ratings, award laurels or download counts.
- No real people's faces in close-up; hands, silhouettes and over-the-shoulder shots are fine.

## 3. Brand system

**Colors (use exactly)**
| Role | Hex |
|---|---|
| Signature green (primary buttons, focus, accents) | `#1EC677` |
| Deep green (hero cards, featured panels) | `#0D4029` |
| Link green | `#0B7A47` |
| Soft mint (selected chips, guide "on now" blocks) | `#DDF4E7` |
| Mint on dark | `#C9F5DD` |
| Warm paper background (light mode) | `#F7F6F1` |
| Light surface / cards | `#FFFFFF`, `#EEEEE7` |
| Ink text | `#111613` |
| Muted text | `#646B67` |
| Night background (TV, dark mode, player) | `#0A0E0C` / `#0F1412` |
| Dark panel | `#1B2420` |
| Text on dark | `#E8EEEA` |
| LIVE badge red | `#B42320` with white text |

Mood: warm off-white paper plus deep forest green by day; near-black green-tinted night with a single green glow at night. Never pure saturated purple or blue gradients, no rainbow glows.

**Fonts**
- **Instrument Sans** (SemiBold 600 for headlines and UI titles, Medium 500 for labels, Regular 400 for body). Tight tracking on large titles (about −2%).
- **Newsreader** Medium 500 (an elegant serif) for one emotional headline per scene, such as "Your TV. Finally calm." Use sparingly.
- Sentence case everywhere. No ALL-CAPS headlines (the small "LIVE" badge is the only uppercase).

**Logo:** a rounded-square signature-green TV icon with a white play triangle and a small stand, next to the word "GlowTV" in Instrument Sans SemiBold, dark ink on light, near-white on dark.

**Shapes:** generous rounded corners (cards 16 px, buttons fully rounded pills, chips pill-shaped), hairline borders, soft long shadows, lots of breathing room on an 8-point grid.

## 4. App layouts (build the UI mockups from these)

### iPhone / Android phone (portrait, light mode)
1. **Home ("Watch")**
   - Top: centred GlowTV logo; round "+" button at top-right.
   - Small grey greeting "Good evening", then a big bold title "Watch", with a person icon on the right.
   - **Hero card:** deep green `#0D4029`, rounded. Kicker "FROM YOUR LIVE PLAYLIST" in mint, then the title "Evening studio" in white, the category "Documentary" and a big green pill button "▷ Watch live" with a heart icon beside it. On the right sits an illustrated dusk-hills thumbnail with a red "LIVE" badge.
   - Pill chips "All" (selected, black) and "Documentary".
   - "Live now" section with a "See all" link, then a white card listing channels: small thumbnail, name in bold, category in grey, red LIVE badge at the right.
   - "From your playlist" row below.
   - **Bottom tab bar** (floating, rounded): Home (selected, green), Live, Guide, Library, Search. Outline icons.
2. **Guide:** title "Guide", a settings cog. A segmented control "✓ Today / Tomorrow / Mon 23" with a filter icon. A timeline grid: channel tiles on the left, time ticks across the top (3:30 AM, 4:00 AM), and a thin green "now" line. Programme blocks are rounded; the one airing now is soft mint `#DDF4E7` with a green border and reads "3:37 AM–4:17 AM · Evening studio · On now". Tapping one raises a **native bottom sheet** with a grab handle, the title, time, description and a green "Done".
3. **Player:** full-bleed video, black letterbox. Thin top bar with channel logo, channel name, "2 of 120 · Documentary". Center: large translucent play/pause; bottom: LIVE badge, "Return to live", audio/subtitle buttons. Swipe down shrinks it into a **mini player** docked above the tab bar (thumbnail, title, play/pause, close) while the user keeps browsing.
4. **Add playlist sheet:** a native sheet titled "Add your playlist" with three segmented tabs "M3U link / Xtream Codes / File". Fields: Name (prefilled "My playlist"), link or server/username/password with show/hide eye, "Advanced connection settings". Big green "Connect" button. A progress line "Loading channels… 4,812 found" after connecting.
5. **Library / Search:** a search field ("Search channels and titles") with results ranked by exact name. Poster grid for movies and series, with progress bars for continue-watching.
6. **Settings:** grouped rows: Appearance (Light/Dark/System), Playback, Family controls (six-digit PIN, protected categories), Backup & transfer (encrypted backup with password), Profiles.

### Android TV / Fire TV (16:9, dark)
1. **Home:**
   - Near-black green background. **Left rail:** a slim column of outline icons (Home, Search, Live TV, TV guide, Movies, Series, Favorites, Settings, Switch playlist) with the GlowTV icon on top. The current page has a green rounded highlight. When focused, the rail expands to show labels over a dimmed scrim.
   - **Hero:** a large rounded banner with the dusk-hills artwork fading in from the right. A small "• LIVE" badge and "Last watched", then a huge title "Evening studio" and the line "Live channels from your playlist. Ready when you are." Three pill buttons: "▷ Watch live" (green, focused, with a white focus ring and slight scale-up), "TV guide" and "Browse channels".
   - Below: rows "Continue watching", "Favorites" and "From your playlist" with wide cards (logo contained on a pale tile, name, category).
   - Profile name and avatar at the top right.
2. **Live TV list:**
   - Header: "Live TV" with "120 channels · Updated 9:25 PM · Menu for options", a search field and a "Refresh" pill.
   - One row of category chips (All, News, Documentary, Kids…) next to four round icon buttons (clock = Recently watched, sliders = Library options, grid = Grid view, calendar = TV guide).
   - Channel rows, each 56 dp tall: logo box, bold name, category in grey ("News · Public"), green "LIVE", a "•••" button and a heart. The focused row has a crisp white ring around the whole row.
3. **TV player:** full-screen video. Pressing a key shows a top info bar with logo, "Evening studio", "2 of 120 · Documentary" and the hint "▲▼ Change channel". Pressing Left slides in a translucent **channel list** panel from the left (numbered rows, the current one highlighted green).
4. **Stall card (reassurance moment):** if a stream won't start, a calm centred card reads "This channel isn't responding" with buttons "Retry" (focused), "Try other player" and "Next channel".

## 5. Shot list: 45-second master

Music tempo 96 BPM; cuts land on beats. Camera language: slow, weighty, motion-controlled moves (dolly-in, gentle orbit, rack focus). Never shaky or whip-pan heavy.

| # | Time | Picture | Camera / motion | On-screen text | Sound | Emotion |
|---|---|---|---|---|---|---|
| 1 | 0:00–0:03 | Dark living room at dusk. A cluttered old TV menu glows harshly; a hand clicks a remote over and over. | Static wide, slight push-in. Subtle flicker on the screen. | — | Room tone, three dry plastic remote clicks, a faint electrical buzz. Music not yet in. | Mild frustration. |
| 2 | 0:03–0:05 | Match cut: the remote click becomes a single soft "tock" and the TV goes black, then a green dot of light blooms centre-screen. | Snap to a black frame, then a slow light bloom with a soft radial glow in `#1EC677`. | — | Tock + low warm swell (sub bass rising). | Breath out. |
| 3 | 0:05–0:08 | The GlowTV icon assembles: rounded square draws, play triangle slides in, the stand settles; the wordmark types in letter by letter. | Centre, slight scale 0.96→1.0 with an overshoot spring. | **GlowTV** | Soft glass "ting", then the music starts: warm Rhodes chords and brushed drums. | Calm, premium. |
| 4 | 0:08–0:12 | iPhone in hand (over the shoulder, sofa, lamp-lit). The Add playlist sheet slides up; the M3U link field fills; a thumb taps "Connect". | Close-up, shallow depth of field, slow dolly-in. | "Bring your own playlist." | Sheet whoosh (short, airy), keyboard taps (light, sparse), a satisfying tap on Connect with a tiny haptic thump. | Easy. |
| 5 | 0:12–0:15 | Progress line "Loading channels… 4,812 found" counts up, then the Home screen cascades in: hero card, chips, Live now rows. | UI animation flat to camera: cards rise 24 px and fade in, staggered 40 ms each. | "Ready in seconds." | Rising soft tick-counter, then a gentle "chime" as Home lands. | Delight. |
| 6 | 0:15–0:19 | Scroll through Home, tap "Watch live" on Evening studio; the player expands from the card to full screen (shared-element zoom). | Screen-recording style inside a floating 3D phone that slowly tilts from 10° to 0°. | "Watch live." | Swipe swish, a velvety whoosh on expand, the music drops to half for a beat. | Immersion. |
| 7 | 0:19–0:22 | Swipe the player down into the mini player and keep browsing the Guide; the green "now" line glides across; tap a programme and the bottom sheet rises. | Phone floats; parallax between the phone and a blurred background. | "A real TV guide." | Paper-soft slide, a light "pop" for the sheet. | Control. |
| 8 | 0:22–0:27 | Cut to the living-room TV, now dark and elegant: GlowTV TV Home. The remote's D-pad press moves the white focus ring across "Watch live → TV guide → Browse channels"; the rail expands. | Over-the-shoulder from the sofa, then a slow dolly toward the TV. Focus ring moves with a slight spring and 5% scale. | "Made for the remote." | Each D-pad press is a crisp, low "tk" synced to the ring moving; the music adds bass and a warm pad. | Satisfaction. |
| 9 | 0:27–0:31 | TV Live TV list: chips slide, rows scroll smoothly, a heart toggles to favorite; then in the player, Left opens the channel list panel and we zap to Wild North. | Screen fills the frame (no bezel), with a subtle 2° perspective. | "Channel logos. Favorites. One-press zapping." (appears line by line) | Heart "blip", soft slide for the panel, a channel-change "shh" with a quick fade. | Flow. |
| 10 | 0:31–0:35 | Quick, clean montage, each 1 second: iPad landscape guide · Android phone search results · Family controls PIN keypad with lock icon · encrypted backup with a green check · the stall card with "Retry" focused. | Hard cuts on the beat; each device glides in on a soft drop shadow. | "Profiles · Family PIN · Encrypted backups · Calm when streams aren't." | One soft percussion hit per cut; a muted lock "click" on the PIN. | Trust. |
| 11 | 0:35–0:40 | Hero tableau: iPhone, iPad, Android phone and a TV floating in a soft arc on a warm `#F7F6F1` to deep `#0D4029` gradient, all showing "Evening studio". | Slow orbit 15° around the group, gentle light sweep across the screens. | Serif (Newsreader): **"Your TV. Finally calm."** | Music resolves to the main chord; airy shimmer. | Warm pride. |
| 12 | 0:40–0:45 | End card on night background: logo centred, URL below, platform row beneath. A thin green glow line underlines the URL. | Static; elements fade up in sequence (logo, URL, platforms), 200 ms apart. | **GlowTV** · "Free download at glowtv.app" · "iPhone · iPad · Android · Android TV · Fire TV" · tiny footnote: "GlowTV is a player. Bring your own playlist." | Final soft "ting" matching shot 3, music tail and room tone fade. | Invitation. |

**15-second vertical cut (9:16):** shots 2–3 (2 s), 4 (2 s), 5 (2 s), 6 (2 s), 8 (3 s, TV cropped tight on the focus ring), 11 (2 s), 12 (2 s). Captions centred in the lower third, large (64 px+), with safe margins of 150 px top and 320 px bottom.

**6-second bumper:** green bloom → logo (2 s) → TV focus ring moving across the hero (2 s) → end card (2 s).

## 6. Motion and animation rules

- Easing: entrances use a decelerating spring (critically damped, ~280 ms for small UI, ~500 ms for screens); exits are ~30% faster with acceleration. No linear motion except progress bars and the guide's "now" line.
- UI elements rise 16–24 px and fade from 0 to 100% opacity; stagger lists at 30–50 ms per item.
- Focus ring (TV): 3 px white outer ring, 2 px inner green-tinted line, the item scales to 1.05; it moves in 180 ms with a slight overshoot.
- Button press (phone): darken and scale to 0.97 the instant the finger lands, release in 120 ms.
- Transitions: shared-element zoom from card to player; native bottom-sheet slide with a grab handle; mini player shrinks along a curved path.
- Text: headlines reveal word by word (60 ms apart) with a 12 px upward drift; never typewriter-flicker except the logo in shot 3.
- Light: one soft green glow per scene at most; subtle film grain (2%) on live-action shots only; UI stays crisp.
- No glitch effects, lens flares, spinning 3D logos, particle explosions or neon.

## 7. Live-action and lighting

- Setting: a modern, lived-in living room at blue hour: linen sofa, wool throw, warm 2700 K table lamp, plants. Deep shadows, warm highlights, the TV providing a cool-green fill.
- The TV is a slim, generic 55-inch set with no visible brand. The remote is a generic black streaming remote (no Amazon or Google logos visible).
- Phones and tablets: generic modern devices with thin bezels; no Apple or Samsung logos in frame.
- Lens look: 35 mm for wides, 85 mm for hands and device close-ups, f/2 shallow depth of field.
- Color grade: warm midtones, teal-green shadows, lifted blacks slightly, skin tones natural.

## 8. Music and sound design

- **Music:** an original, royalty-free, warm modern lo-fi/neo-soul track at 96 BPM in D major. Rhodes piano, brushed drums, round sub bass, a soft analog pad, a gentle plucked motif for the brand moments. Builds from intimate (shot 3) to full but restrained (shot 11), resolving on the tonic at the tagline. No vocals, no drops, no EDM risers.
- **Sound effects (all subtle, -18 to -24 LUFS relative):**
  - Remote clicks: dry plastic in shot 1, then softened, rounded "tk" for D-pad focus moves in GlowTV.
  - Taps: soft muted wooden "tok" with a tiny low thump (haptic feel).
  - Sheets and panels: short airy whooshes (150–250 ms), no harsh highs.
  - Logo/brand: a single glass "ting" (C6, short decay) used twice, as bookends.
  - Favorites heart: a small rising "blip".
  - Lock on the PIN: a soft mechanical click.
  - Room tone throughout live-action shots; no crowd or TV-show audio from the screens.
- **Mix:** dialogue-free. Music around -16 LUFS integrated for social, -23 LUFS for broadcast. Duck the music 3 dB under key SFX.
- Optional voiceover (calm, warm, mid-30s, gender-neutral, unhurried): "Bring your own playlist. GlowTV makes it beautiful. A real guide, made for the remote, on every screen. Your TV. Finally calm."

## 9. On-screen typography spec

- Main captions: Instrument Sans SemiBold, 72 px at 1080p (96 px at 4K), color `#E8EEEA` on dark, `#111613` on light, max 6 words per line.
- Supporting lines: Instrument Sans Regular, 40 px, muted `#A3ADA7` on dark or `#646B67` on light.
- Tagline: Newsreader Medium, 96 px at 1080p, centered.
- Highlight one key word per caption in signature green `#1EC677` (e.g. "**remote**", "**guide**").
- Keep text inside the title-safe area (90% of frame).

## 10. Final checklist for the agent

- Uses only the demo channels and illustrated thumbnails listed in section 2.
- No real brands, store badges, prices, ratings or "free channels" wording.
- Colors and fonts match section 3 exactly.
- Every screen matches a layout in section 4.
- Every message also works without sound.
- The end card shows "glowtv.app" clearly for at least 3 seconds.
