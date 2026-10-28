# NodeCast 0.6.0 feature verification

The four mobile tabs and TV sidebar stay intact. Library options contain sorting and refresh policy; player options contain display, speed, sleep and browsing controls; Settings contains Appearance, Family controls, and Storage & history. Connection headers remain in the playlist form's Advanced section.

Implemented local features: per-profile sorting and foreground refresh, TV organization, local M3U import, User-Agent/Referer overrides, independent cache/history clearing, bounded XMLTV/gzip ingestion, indexed native SQLite schedules, mapping and programme search, synchronized TV timelines, Light/Dark/System, six-digit family PIN with category filtering and background relock, persistent mini-player, and supported native PiP/iOS AirPlay access. English is the only complete language; translation keys are a foundation.

`npm run typecheck` and `npm test` cover source and pure provider/policy/parser behavior. `check.py` exercises mobile and TV web exports with synthetic credentials/media. Browser checks do not prove native codecs, SQLite, PiP, AirPlay or physical-device behavior. The Android TV native smoke test additionally checks embedded VLC, the same mini-player session, real episode ordering, SQLite guide persistence across process restart, and PIN filtering/recovery. Native release provenance belongs in each edition's build.json after release validation.

Limits: feed download 8 MB, expanded XML 32 MB, retained schedule past 24 to next 72 hours, max 150,000 retained programmes, up to 1,000 queried results and 100 displayed channel rows per page. Local files max 400 KB; bigger playlists should use their URL. Automatic refresh runs on foreground/use, not as an OS background job. Existing guide cache survives a failed refresh.

The family PIN gates access on this device; it does not encrypt provider content or prevent OS-level access. Forgotten-PIN recovery deletes saved profiles and viewing data. The sleep timer stops the in-app session; external players manage their own timers. Native PiP depends on engine/device support and is disabled while the sleep timer is active. AirPlay is iOS native-engine only. Physical PiP/AirPlay require device testing.

Chromecast discovery/sender integration, multiview, QR pairing, additional portal/MAC protocols, cloud sync, DVR and downloads remain separate future projects; no inactive controls are added for them.
