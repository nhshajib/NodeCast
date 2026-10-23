# NodeCast: user research and feature plan

Research date: October 23, 2026. Current direction: standalone iPhone player, Expo Go for testing, Xtream Codes/M3U, local profiles, no account or cloud project, no packaging until requested.

## What was researched

This is exploratory desk research, not a representative market survey. I read public Reddit discussions, TROYPOINT Insider discussion threads, the Firecore community, and Apple App Store reviews. These include individual complaints and requests, mixed app versions, and many Apple TV/Android TV users; an iPhone audience may behave differently. Provider problems and player bugs are often difficult to separate from a comment. No interviews, participant counts, market-size estimates, or demand percentages are invented here.

I also searched YouTube, X, and Facebook. Relevant YouTube review videos were indexed, but opening them was throttled, so their videos/comments were not used as evidence. X/Facebook did not yield useful accessible player-feature discussions. Private groups and Discord were not accessed. This report therefore makes no claim to have surveyed all those networks.

## Evidence and the product implication

| Evidence read | Observed request or friction | Implication for NodeCast |
| --- | --- | --- |
| [UHF community wishlist](https://www.reddit.com/r/uhf_app/comments/1mdtzq7/wishlist_to_improve_the_app/) | Faster access to recent channels; reorder favorites; hide categories; refresh selected libraries; per-channel player preferences. | Make frequent tasks visible and avoid forcing people through settings to organize a large playlist. |
| [Continue-watching discussion](https://www.reddit.com/r/uhf_app/comments/1tj1wt4/continue_watching_button/) | Repeated prompts before resuming an episode feel unnecessary. | Offer one-tap Resume as the main action; keep Start over as a secondary action. |
| [Subtitle-preference discussion](https://www.reddit.com/r/uhf_app/comments/1tfrq7q/i_have_to_manually_enable_subtitles_every_time/) | Re-enabling subtitles on each episode. | Remember audio/subtitle preferences, with visible fallback when a track is missing. |
| [UHF experience discussion](https://www.reddit.com/r/appletv/comments/1ohjlyu/update_my_experience_with_uhf_for_iptv_on_apple_tv/) | Praise for Apple-like navigation and quick channel switching, alongside reports of sports buffering and disagreement about its cause. | Validate startup/recovery on real devices; distinguish network, provider, and unsupported-format problems. |
| [TROYPOINT feature wishlist](https://troypointinsider.com/t/tivimate-feature-wish-list/153806) | Timeshift, easier sync, scoped search, stream information, and frustration when an external player makes returning awkward. | Prioritize diagnostics and useful search. Treat external apps as an optional handoff; do not present them as seamless internal engines. |
| [IPTVX iPhone reviews](https://apps.apple.com/us/app/iptvx/id1451470024?platform=iphone&see-all=reviews) | Slow library loading, multi-word search friction, and confusion between guide refresh and catalogue refresh. | Keep cached metadata available, label refresh actions explicitly, and test multi-word searches. These are reports, not independently reproduced competitor bugs. |
| [UHF App Store reviews](https://apps.apple.com/ca/app/uhf-love-your-iptv/id6443751726?platform=watch&see-all=reviews) | Missing/inconsistent EPG and difficulty finding settings. | Build clear guide-source diagnostics and direct access to player/profile settings. Missing provider data must not look like an app silently failing. |
| [iPhone player discussion](https://www.reddit.com/r/iphone/comments/1d1sbae/best_iptv_app_for_iphone/) | Interest in ad-free occasional viewing, PiP, and casting. | Keep the main watching flow uncluttered; investigate PiP/AirPlay before adding complex features. |
| [Firecore community discussion](https://community.firecore.com/t/support-for-add-ons/60061) | Interest in combining IPTV, media metadata, and subtitles, with uncertainty about support. | Say what the selected player can actually do. An Infuse single-video URL handoff is not a promise that it can import an IPTV playlist. |

The resulting priorities are an interpretation of these sources, not measured market rankings.

## Positioning and likely audiences

**Proposed promise:** a calm, private iPhone player that makes an existing IPTV subscription easier to use. Sell clarity and reliability rather than a long checklist or bundled channels.

- **Occasional viewers:** quick setup, favorites, recent channels, readable errors. Avoid forcing an account or subscription prompt before playing their content.
- **Movie/series viewers:** resume, episode progress, remembered language/subtitles, useful metadata.
- **Large-playlist users:** scoped search, hidden categories, custom order, selective refresh.
- **Sports viewers:** quick channel changes, guide visibility, buffering recovery, provider connection-limit awareness.

Validate these audience hypotheses with actual iPhone users before assigning commercial value or charging for features. Current project scope remains personal/local; monetization is not being implemented.

## What is implemented now

- Xtream Codes and M3U connections; named local profiles with separate favorites.
- Live TV, movie and series browsing; search and categories; episode playback.
- iOS secure storage for provider secrets and profile data, including long links and safe staged writes.
- Native Expo video player plus explicit VLC/Infuse handoff choices and credential-sharing disclosure.
- Public IP/approximate location, refresh, and optional non-VPN IP comparison. VPN state remains unverified; no false “protected” badge.
- Reference-led lavender/ink/cream interface, introductory screen, floating navigation, separate channel/movie layouts, and movie details with real available artwork and descriptions.

The next items below are proposals, not shipped features.

## Prioritized implementation roadmap

| Sequence | Feature and user benefit | Implementation approach | Effort / dependency | Acceptance check |
| --- | --- | --- | --- | --- |
| 1A | Reliable playback recovery and understandable errors | Add bounded retry with backoff, cancel recovery after a channel change, track time-to-ready, and show provider/network/format categories where supported. Redact URLs and tokens from logs. | Medium; real-device/provider testing essential. | Stop/retry never starts two streams; timeout is actionable; no secrets in diagnostics. |
| 1B | Recent channels and one-tap Resume | Store per-profile opaque content ID, position, duration, and last-played timestamp; throttle writes and flush on pause/close. Use player events. Completed items leave the resume rail. External players cannot reliably report progress back. | Medium; Expo video/device event validation. | Resume within a proposed ±5 seconds; no live-stream positions treated as VOD; profiles stay isolated. |
| 1C | Fast, resilient catalogue browsing | Persist non-secret metadata and opaque IDs in a local index; reconstruct Xtream URLs from secure credentials. Do not put credential-bearing M3U stream URLs into unencrypted SQLite. Refresh in the foreground without discarding a usable list. | Medium–large; storage model and playlist-size profiling. | Test proposed 10k-channel/large-VOD fixtures; search and scrolling remain responsive; cancelled work cannot replace another profile’s library. |
| 1D | Easier onboarding | Recognize provider `get.php` links and offer to extract server/login fields locally; show/hide password; validate field-level errors; avoid dumping the pasted URL into analytics. | Small–medium; source validation. | A user reaches a first playable item without retyping credentials from a supported link. |
| 2A | TV guide that explains missing data | Xtream now/next first, then XMLTV import. Preserve channel IDs, normalize timestamps/time zones, index programme windows, allow manual channel mapping and separate guide refresh. Provider catch-up is a later extension. | Large; parser, mapping, caching; optional provider EPG. | Known fixtures map correctly across DST; empty guide says why; refreshing guide does not rebuild movies. |
| 2B | Better search and organization | Tokenized multi-word matching; choose current category, favorites, current playlist, or all loaded catalogues; hide/reorder categories; reorder favorites. Keep “hidden” and “excluded from search” distinct. | Medium; index from 1C. | Terms with spaces work; filters explain their scope; changes survive restart without touching other profiles. |
| 2C | Remember audio and subtitles | Store per-profile language/subtitle settings and optional title overrides. Choose a compatible track after it becomes available; communicate when no matching track exists. | Medium; stream-format-dependent. | Preferences persist across episodes; unavailable languages do not silently choose an unrelated track. |
| 2D | Movie/series detail and episode state | Extend the existing movie detail page with provider-supplied year and richer metadata; improve series details with a season selector, watched marks, and next-episode action. Optional external metadata requires separate API/privacy decisions. | Medium; provider metadata coverage. | Titles without metadata still have a good layout; unavailable episodes never get fake artwork/progress. |
| 3A | Watch while browsing and AirPlay/PiP | Keep a shared player above navigation for an in-app mini-player; investigate native route controls and PiP with the current Expo SDK. Gate unavailable features rather than showing inert buttons. | Medium–large; Expo Go capability spike, possibly a custom build. | A real iPhone retains playback while browsing; interruption/foreground handling is tested. |
| 3B | Per-channel player choice and technical details | Save an override by profile/content ID. Show only exposed codec/track/resolution data; offer a redacted diagnostic report. Continue to warn before credential-bearing handoffs. | Medium; native introspection limitations. | One problematic stream can use VLC without changing every other channel. |
| 3C | Family controls and accessibility | Hide mature groups explicitly, local PIN/biometric gate where supported, Dynamic Type, VoiceOver order, reduced motion, higher-contrast states. PIN is not encryption or provider entitlement control. | Medium; biometric support in Expo Go must be verified. | Large text fits; every icon button is named; profiles cannot bypass the intended local gate accidentally. |
| Later | Optional account/sync | Revisit only when requested. Define encrypted credential backups, ownership checks, device conflicts, logout behavior, recovery, and consent before choosing a backend. | Large; explicitly deferred by user. | No account is needed for local viewing; private profiles never become public API records. |
| Later | Catch-up, DVR, downloads, multiview | Detect provider catch-up capability first. Scheduled DVR/background transfers, storage quotas, and concurrent streams require separate native/server and provider-limit design. | Large–very large; not a blanket Expo Go feature. | Do not offer unsupported catch-up; warn about connection limits; test battery/storage/background behavior. |

## Implementation update

The first milestone is now implemented in source: recovery, local recents/resume, metadata caching, explicit link import, scoped search, hidden categories, favorites ordering, Xtream now/next, and track preferences. See [implementation status](IMPLEMENTATION-STATUS.md) for validation and remaining limits. The roadmap below remains a staged plan, not a claim that every feature has shipped.

## Original suggested next milestone

Implement 1A–1D, then guide now/next plus saved audio/subtitle preferences. This pairs the new visual quality with concrete everyday improvements. Full EPG, cloud sync, downloads, and multiview should not delay a reliable single-stream iPhone player.

## Validation before calling it premium

1. Review the welcome, empty Home, connected Home, live list, movie grid, series/episodes, favorites, profiles, provider form, player preferences, player, and failure states at 390×844 and a narrower iPhone viewport.
2. On a physical iPhone, test startup, rotation, background/foreground, audio interruption, AirPlay/PiP availability, and installed external players.
3. Run small task-based sessions: add a playlist, find a channel, save it, switch profile, resume a film, change subtitles, and recover from a failed stream. Measure task completion and confusion; do not infer usability from screenshots alone.
4. Proposed metrics: time to first successful play, time to repeat play, search success, recovery success, crash-free sessions, and percentage of test users completing each task. Set numeric targets after a baseline; none are claimed as measured here.
