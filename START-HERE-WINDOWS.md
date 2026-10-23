# Start here: Windows PC and iPhone

You will run NodeCast on your iPhone inside Expo Go. Windows hosts the development server. No Apple Developer membership or EAS production build is needed for this method.

1. Install Node.js 24 LTS from https://nodejs.org/ on Windows. Keep the installer defaults.
2. Install the latest Expo Go from the App Store on your iPhone. This project requires Expo Go support for Expo SDK 58. If it reports an SDK mismatch, record the exact message before changing dependencies.
3. Open https://github.com/nhshajib/iptvplayer in your Windows browser. Sign in if the repository is private.
4. Click the green Code button, then Download ZIP. Right-click the downloaded ZIP and choose Extract All. Open the extracted iptvplayer-main folder containing package.json.
5. Click the File Explorer address bar, type cmd, and press Enter.
6. Type the following and press Enter:

```bat
npm ci
```

Wait until installation finishes. Then run:

```bat
npm run start:go
```

7. Connect your PC and iPhone to the same Wi-Fi. If Windows Firewall asks about Node.js, allow access on your private home network.
8. Scan the QR code in the terminal using the iPhone Camera. Tap Open in Expo Go. Allow local-network access if asked. Keep the PC awake and terminal open.
9. Choose Explore the demo, or add your own Xtream server URL, username and password, or complete M3U playlist link. Enter provider credentials only in the app.

## If the phone cannot connect

Press Ctrl+C in the terminal, then run:

```bat
npx expo login
npm run start:tunnel
```

Follow the terminal prompts and scan the new QR code. An Expo account may be required. Do not share passwords or tokens in chat. VPNs and guest Wi-Fi isolation can interfere with local connections.

## Next time

Open cmd in the same project folder and run npm run start:go. You do not need npm ci every time. Keep the server reachable while testing.

## Real iPhone checks

Try playback, sound, fullscreen, rotation, movie resume, Start over, favorites, profile persistence, IP refresh, and external-player handoff. Read docs/IPHONE-TESTING.md for the complete checklist. Physical-device behavior is not yet verified.

## Optional standalone/TestFlight build

This is separate from Expo Go. EAS initialization and production build previously stopped because this workspace had no Expo authentication. The app still has the placeholder bundle identifier com.example.nodecast; replace it with your chosen unique identifier before Apple distribution. Your supplied Expo project ID is 49ee7c99-08db-4b89-ad01-022961dcfd6c, but remote ownership/linking has not been verified. Do not treat the source configuration as a completed IPA.
