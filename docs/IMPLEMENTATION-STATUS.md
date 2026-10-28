# Current status — October 28, 2026

The approved 0.6.0 local feature round is implemented and released for all editions. See [features, UI locations and limits](../verification/roadmap/README.md), [browser checks](../verification/roadmap/checks.json), and [native records](../verification/android/native-0.6.0-builds.json). The following sections are historical records, including their original roadmaps and validation limits.

# Implementation status — October 23, 2026

The first research-led implementation milestone is complete in source. The lavender, cream, serif-heading design and four main tabs are retained. Secondary controls live in Library options or the player, rather than adding more main navigation.

## Implemented

- Bounded automatic playback recovery, safe error messages, manual retry and external-player alternatives. Closing playback cancels pending recovery.
- Per-profile local viewing history: actual playback positions, one-tap Resume in NodeCast, Start over, completed-title removal, dismissible Continue watching cards, and recent live channels. External-player progress is not available to NodeCast.
- Metadata-only catalogue snapshots and immediate cached browsing with foreground refresh. Credentials and stream URLs are excluded from catalogue/history records; profiles remain in the secure vault on iOS. Xtream URLs are reconstructed in memory; M3U playback requires resolving the current playlist.
- Indexed, accent-insensitive multi-word search; explicit current-media/all-media scope. All-media search clearly includes hidden categories. Favorites remain accessible when their category is hidden.
- Per-profile category visibility and favorites ordering.
- Explicit import of Xtream credentials from provider export links, with user-controlled password visibility.
- Audio/subtitle preference controls using available tracks, remembered per profile. Missing language matches do not force an unrelated language.
- Xtream Now & next guide: up to ten matching channels, bounded concurrent requests, favorites filter, local-time display, independent refresh and missing-data states. This is not a full XMLTV grid.

## Validation and limits

TypeScript and 47 automated tests pass. Web and iOS JavaScript exports succeed. Browser fixture tests cover real video progress, seeking/resume, restart, completion, category visibility, scoped search, favorites ordering, guide display, import, cached refresh failures and recovery cancellation; there are no browser page errors. A 30,000-title search fixture was exercised; desktop timing is not an iPhone performance guarantee.

Physical iPhone testing remains necessary for Expo Go playback, native tracks, Keychain, interruptions, provider codec/transport compatibility and installed VLC/Infuse handoffs. No real IPTV credentials were used. Browser screenshots contain simulated provider/IP/location values.

## Remaining roadmap

Full XMLTV guide import and mapping; richer series metadata and episode navigation; persistent mini-player; device-validated PiP/AirPlay; per-channel player overrides; further accessibility/family controls. DVR, downloads, multiview and optional cloud accounts remain separate later work. Sign-in/Supabase is deferred as requested.

No ZIP/package was rebuilt or replaced.

## 0.2.1 follow-up

Visible modal navigation, per-profile live format selection, bounded HLS/TS fallback, original direct-URL preservation, VLC TS defaults, broader category search and Settings version history are implemented. Retry timer/source replacement defects found during reproduction are corrected. Current automated count: 57 tests; see verification/RESULTS.md and CHANGELOG.md for scope and device limits.

## 0.2.3 native engine integration

Embedded VLC is implemented for live TV in new custom builds, with capability-gated native imports and explicit Expo Go guidance. See LIVE-TV-COMPATIBILITY.md. The native engine has not been compiled or device-tested here; 65 pure tests and JavaScript exports do not establish that it works on an iPhone.

## October 27 follow-up: source 0.5.0

The approved everyday-polish round is implemented across mobile and TV. See [current research and implementation](RESEARCH-2026-10-27.md) and [browser evidence](../verification/everyday/checks.json). It adds explicit scoped search, profile-specific session browsing, resilient cached TV refresh, channel playback overrides, redacted player information and shared series continuity. The subsequent October 28 release includes a newly compiled IPA and both APKs; per-edition build records identify the binaries and native checks. Earlier device-validation statements above describe their historical versions, not validation of the new 0.5.0 native behavior.
