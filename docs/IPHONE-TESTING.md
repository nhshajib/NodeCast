# Testing NodeCast on a real iPhone

This is an Expo Go test session, not an installed standalone app. Keep the development server running. Install the latest Expo Go from the iPhone App Store; it must support this project’s Expo SDK 58.

## Run on your PC

Inside the current nodecast-expo source folder:

```sh
npm ci
npm run start:go
```

Keep the PC and iPhone on the same Wi-Fi. Scan the QR code using the iPhone Camera and open it in Expo Go. Allow local network access when prompted.

For a remote connection:

```sh
npx expo login
npm run start:tunnel
```

Enter Expo credentials only in your own terminal/browser, never in chat. Expo CLI may offer an alternative ngrok tunnel, which requires its helper and permitted network access. A private cloud-workspace localhost URL is not reachable from an iPhone without a working tunnel or forwarding.

## Test in this order

1. Explore the demo: check text, scrolling, floating tabs, movie details and dismissible sheets in portrait and landscape.
2. Connect a real HTTPS Xtream provider or full M3U link. Check invalid details, import, password visibility, refresh and missing guide states.
3. Play live TV, a movie and an episode. Check startup, sound, native fullscreen, rotation, interruption and return from background.
4. Play a movie for at least 15 seconds, close playback and use Resume in NodeCast. Verify the approximate saved position; check Start over and completion.
5. Set available audio/subtitle choices, then open another stream with matching tracks. If tracks are absent, verify that the UI explains it.
6. Save favorites, reorder them, hide a category, and test current-media versus all-media search. Switch profiles and relaunch Expo Go to check isolation and persistence.
7. Interrupt network access briefly. Verify bounded reconnect behavior, manual retry, and that closing playback cancels recovery.
8. Install VLC/Infuse separately and test the disclosure and handoff. External-player progress is managed by that app.
9. Refresh public IP and location. Compare with a reference IP only after saving the intended baseline. IP changes do not establish VPN status.

Record iPhone model, iOS version, Expo Go version, media kind, symptom and steps. Do not include passwords, full provider URLs, playlist links or unredacted screenshots of credentials. HTTP-only providers, codecs and headers may be restricted by Expo Go; app.json cannot change Expo Go’s native policies.

No physical-device pass is claimed until these checks are performed. Cloud accounts and standalone IPA distribution remain outside this test workflow.
