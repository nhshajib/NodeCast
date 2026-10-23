# Changelog

## 0.2.2 — October 23, 2026

- Added SDK-matched expo-dev-client and explicit development, standalone internal preview, and production/store profiles.
- Added custom development-client launch/build commands while preserving explicit Expo Go commands.
- Configured the supplied EAS project ID locally, a NodeCast deep-link scheme and a non-example iOS bundle identifier. Remote project ownership/slug and Apple identifier availability still require authenticated validation.
- Added Windows native-build/signing instructions and a default Expo tunnel fallback for ngrok startup errors.
- This is native build preparation, not a completed signed IPA or a claim that native compilation/device tests passed.


## 0.2.1 — October 23, 2026

- Added text Back/Close navigation and a safe-area provider inside full-screen modals. Player loading/failure screens retain escape and external-player controls.
- Corrected forced-HLS-only Xtream live playback. Automatic mode preserves provider direct URLs, tries HLS then MPEG-TS, and sends MPEG-TS to external players when there is no provider direct URL. Retries remain bounded and release the previous stream first.
- Fixed browser retry timers and avoided stale error checks/video reloads during source replacement. Failed streams hide the stalled video surface and retain useful recovery actions.
- Added saved per-profile Automatic/HLS/MPEG-TS selection in Playback. Movies retain their existing container, and M3U signed URLs are not rewritten.
- Channel search spans visible categories during typing, with a visible result count/scope. Punctuation, accents and spacing variants such as BBC1/BBC 1 are supported. List taps work while the keyboard is open.
- Added Settings → Version history and synchronized displayed/package/app versions.

The confirmed implementation defects were forced HLS paths and restrictive search/category handling. The exact cause of the user's provider failure is not yet established: provider, transport, codec and connection-limit behavior require a real iPhone retest. Browser fixtures validate switching endpoints, not native raw MPEG-TS support.

## 0.2.0 — October 23, 2026

Premium lavender/cream design; local secure profiles; Xtream/M3U; favorites and organization; viewing history/resume; metadata caching; now/next; IP/location; external players and track preferences. See docs/IMPLEMENTATION-STATUS.md for remaining limits.
