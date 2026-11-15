# GlowTV: start here on Windows

For development, Windows runs the Expo server and your iPhone opens the project. For a standalone release, your PC is not needed while watching. App Store availability is still pending.

1. Install Node.js 24 LTS on Windows.
2. Download this repository from https://github.com/nhshajib/NodeCast and extract the ZIP.
3. Open the extracted folder, then **apps → player**. This is the folder containing `package.json`.
4. Click the File Explorer address bar, type `cmd` and press Enter.
5. Install the locked dependencies:

```bat
npm ci
```

6. For an Expo Go preview, install a compatible Expo Go version on your iPhone, then run:

```bat
npm run start:go
```

This project uses Expo SDK 58. Expo Go does not include the built-in VLC engine; use a custom development or standalone build to test that engine. Keep the terminal and PC awake for an Expo Go session.

7. Connect the phone and PC to the same Wi-Fi, allow Node on your private network if Windows asks, then scan the QR code with the iPhone camera.
8. If a tunnel is needed, sign into **Expo CLI** in the terminal, even if your browser is already signed in:

```bat
npx expo login
npx expo whoami
npx expo start --go --tunnel --clear
```

In PowerShell, use `npm.cmd` and `npx.cmd` instead of changing Windows script-execution policy.

9. Add your own M3U playlist, file or Xtream Codes provider. Keep full URLs, passwords and access tokens out of public screenshots and bug reports.

For custom native development builds, run `npm run start:dev` after installing your development build. The existing app IDs and EAS project are retained.

For standalone iPhone installation, see https://glowtv.app/install/iphone/ and the repository’s verified releases. A personally signed IPA needs your own signing certificate; free signing usually needs refreshing every seven days. An unsigned IPA cannot be installed by simply tapping it. Store listings and new branded releases must be published before their download links become available.
