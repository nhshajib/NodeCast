# NodeCast — iPhone, Android mobile and Android TV

**Android phone APK and source:** [android-mobile](android-mobile/README.md).

**Android TV / Google TV APK and source:** [android-tv](android-tv/README.md).

**Design audit and screenshots:** [Review the 0.2.4 polish](docs/DESIGN-REVIEW.md).

**Standalone IPA for Windows sideloading:** [Build/download/install guide](docs/SIDELOAD-WINDOWS.md).

**Windows beginner setup:** [Start here](START-HERE-WINDOWS.md).

**Native development / preview / TestFlight:** [Native build guide](docs/NATIVE-BUILDS.md). The project includes expo-dev-client; use `start:go` explicitly for Expo Go, or `start:dev` for an installed custom development app.

A standalone React Native IPTV player for your own Xtream Codes server or M3U playlist. Installed IPA/APK builds include the app and playback engine, so they do not need a running PC or Expo Go. Android phone and TV editions have separate folders, interfaces and application IDs, with shared provider and playback code.

The 0.3.2 interface uses spacious layouts, lavender/cream surfaces, Crimson Text headings and rounded controls. The phone interface has Home / Library / Favorites / Settings tabs. The TV edition uses a landscape navigation rail, a three-column library and visible remote focus. This is a new mobile/TV implementation inspired by NodeCast TV, rather than a feature-for-feature copy of its original web application.

## Start on your Windows PC (also works on macOS/Linux)

1. Install **Node.js 24 LTS** (24.3 or newer) from https://nodejs.org. Node 22.13+ is also supported by this Expo SDK.
2. Install **Expo Go** from the iPhone App Store and update it to the latest version.
3. Extract the project ZIP on your PC. Open PowerShell or a terminal inside the `nodecast-expo` folder that contains `package.json`.
4. Run:

   ```sh
   npm ci
   npx expo start --go
   ```

5. Keep the terminal running. Connect the PC and iPhone to the **same Wi-Fi network**. Allow Node.js through Windows Firewall on your private network if prompted.
6. Scan the terminal QR code with your iPhone Camera, then tap **Open in Expo Go**. Allow local-network access if iOS asks.
7. Choose **Explore the demo** to check the interface, or enter your own IPTV details.

For Xtream Codes, enter a base URL such as `https://provider.example:8080`, username, and password. For M3U, paste the complete playlist link (including any query parameters the provider supplies). Do not post these credentials in screenshots, issues, or shared logs.

If LAN discovery fails, try:

```sh
npx expo start --go --tunnel
```

Expo may offer to install its tunnel helper; an Expo account or additional network access may be needed. A VPN can interfere with development connections. If your IPTV provider requires a VPN, ensure your iPhone can reach both the development server and provider.

This project uses **Expo SDK 58** and SDK-matched versions of `expo-video`, SecureStore, and safe-area support. Expo Go for iOS must support this SDK. If Expo Go reports a version mismatch, follow the SDK version it reports; a previous Expo Go version generally cannot be installed from the iPhone App Store. Do not randomly upgrade React Native independently of Expo.

## Included features

- Xtream Codes login and direct connections to provider APIs.
- Live channels, movie libraries, series, seasons and episode playback.
- M3U import with category names and channel logos. Obvious movie file URLs (`.mp4`, `.mkv`, etc.) appear under Movies. Generic M3U entries otherwise appear under Live TV; structured series require Xtream Codes.
- Search, categories, per-profile favorites, and movie detail pages.
- Local Continue watching for movies/episodes, one-tap built-in resume, Start over, completed-item removal, and recently watched live channels. External players manage their own progress.
- Metadata-only catalogue caching, foreground refresh, scoped multi-word search, hidden categories, and favorites ordering. Cached M3U titles require a successful playlist refresh before playback.
- Bounded stream reconnect attempts with clear manual retry/external-player options; no endless retry loop.
- Explicit Xtream export-link field import, password visibility control, and remembered per-profile audio/subtitle language choices when matching tracks exist.
- Xtream Now & next schedules for up to ten matching channels per view, with separate refresh and honest missing-guide states.
- A reference-led introductory screen with an original TV mascot, lavender/ink/cream styling, and floating navigation.
- `expo-video` with native player controls and playback failure handling.
- Up to 30 named profiles, with switching, editing, deletion confirmation, and independent favorites. Profiles, provider credentials, playlist links, and favorites use device-only iOS Keychain protection via `expo-secure-store`. Chunked writes support long playlist links; a failed save preserves the last committed vault.
- Home-screen public IP and approximate location lookup, manual refresh, and refresh when returning to the app. Optional comparison with a reference IP you save while your VPN is off. **Expo Go cannot reliably determine whether your VPN is connected.** A changed IP is not proof of a VPN, and a matching IP is not proof that a VPN is off. Failed checks label previous results as last known.
- Default-player preferences: built-in NodeCast, ask each time, VLC, or Infuse. External-player selection shows a credential-sharing notice before attempting a handoff. Those apps must be installed separately. The browser preview explains that handoffs require the iPhone app.
- Player preferences and the optional reference IP use local app storage. No account, Supabase connection, or cloud synchronization is enabled.
- A demo library using public test streams. The demo channel names are illustrative; they are not real IPTV channels or supplied subscriptions.

One saved profile is active at a time. Switching profiles preserves their separate favorites. Editing server identity or credentials clears that profile’s old favorites to avoid mismatched stream IDs. Profiles are saved after successful connection. On reopening, the active profile loads its library. The previous single-profile format is migrated when found. Browser previews keep profiles in memory only; reload does not persist them.

The Home IP check uses https://ipwho.is/ and sends no IPTV details. That service sees the IP of its own request and returns approximate geolocation; GPS is not used. IP changes can also come from Wi-Fi/mobile switching, dynamic addresses, or IPv4/IPv6 routing. Split tunneling means this does not describe every app’s traffic. For actual VPN state, check the VPN app or iPhone settings. Saving a reference IP asks you to turn the VPN off and refresh first.

## What is free, and what is different from an installed app?

Expo Go and the local development server are free. Your provider, mobile data, or internet service may have separate charges. In this workflow you open the project **inside Expo Go**, and your development server must remain reachable. It is not a standalone installed IPA.

A later independent iPhone build has separate signing and distribution requirements. Expo's cloud build service has its own changing quotas/pricing; paid Apple Developer membership is generally needed for TestFlight/App Store and normal iOS ad-hoc distribution. None is necessary to try this project through Expo Go.

See [live-TV compatibility](docs/LIVE-TV-COMPATIBILITY.md) for the diagnosis and embedded engine requirements.

## Playback and Expo Go limits

- HLS (`.m3u8`) and supported MP4 codecs are the best starting point. Xtream Automatic mode tries HLS, then MPEG-TS; its VLC handoff starts with MPEG-TS unless the provider supplied a direct stream URL. Settings → Default player → Live TV format offers a per-profile override. Raw MPEG-TS/its codecs may require VLC; fallback cannot make unsupported codecs playable. M3U stream URLs remain unchanged.
- Some providers return MPEG-TS, MKV, incompatible audio/video codecs, expiring URLs, or require special HTTP headers. These are not guaranteed to play. New custom builds include an embedded VLC engine for live TV. Expo Go and older installed binaries cannot load it; they retain the native player. No transcoding is included. Opening a separately installed external player is different: the app attempts a URL-scheme handoff, but that app’s own stream support still applies.
- HTTP is unencrypted. Prefer HTTPS. The project's native config allows HTTP for a future custom build, but **app.json cannot change Expo Go's own native transport policy**. An HTTP-only provider may still be blocked in Expo Go; a custom build or HTTPS provider endpoint may be necessary.
- Full XMLTV programme grids, background playback, explicit Picture in Picture integration, and downloads are not implemented yet. Xtream now/next schedules and local watch history are included. Audio/subtitle choices depend on tracks exposed by the stream and platform.
- Browser preview (`npm run web`) is available, but provider CORS policies may block browser connections. Browser credentials are session-only. Test actual IPTV in Expo Go.

## Validation

```sh
npm run typecheck
npm test
npx expo export --platform ios --output-dir dist/ios
```

Verified in this workspace: TypeScript, 27 provider/parser, IP comparison, external-link, and secure-vault tests, and Metro exports for iOS and web. See verification/RESULTS.md for the current browser checks and their limits. Browser tests are interface checks; they do not establish real iPhone playback support. No real credentials were used. A physical iPhone and your actual provider are still needed to validate stream compatibility, audio/subtitles, interruptions, and rotation.

The earlier Swift prototype remains separately in `../nodecast-iphone`; use this Expo folder for the PC/Expo Go approach.

## Source and licensing

GPL-3.0-only. See LICENSE, NOTICE, and THIRD_PARTY_NOTICES.md. Keep the license and notices, mark changes, and provide corresponding source when distributing covered builds. Review distribution-license compatibility before App Store publication.

## Design and feature research

See `docs/DESIGN-DIRECTION.md` for the final visual system and `docs/FEATURE-RESEARCH-AND-PLAN.md` for cited public-community research and the prioritized implementation roadmap. Proposed features are explicitly separated from implemented behavior. Current page captures are in `verification/screenshots`; see `verification/RESULTS.md` for their limits. No new source ZIP has been created for this design pass.

See [implementation status](docs/IMPLEMENTATION-STATUS.md) for the current milestone and remaining work.

## Optional support

NodeCast is free. If you would like to support development, [buy me a coffee](https://buymeacoffee.com/hexorbd). Support is optional and does not unlock features. The link is also available in Settings.
