# Native iPhone testing and production builds

Expo Go is a precompiled host. A standalone EAS production build is your own app; it does not run inside Expo Go. The EAS warning highlights that native behavior has not been validated with a custom development build. The absence of ios/ and android/ is normal with Expo Continuous Native Generation: EAS generates them from app.json and config plugins. They do not need to be committed to remove a warning.

The project now includes SDK-matched expo-dev-client and three build profiles:

| Profile | Purpose | Needs Metro running? |
| --- | --- | --- |
| development | Your own app with development launcher; test native transport, schemes and plugins | Yes |
| preview | Standalone release-mode build for registered iPhones | No |
| production | Signed App Store Connect/TestFlight build | No |

Installing the library/configuring profiles is preparation, not proof that native compilation succeeds. An actual signed cloud build and physical-device test are still required.

## Windows: build a custom development app

A paid Apple Developer membership is normally required for EAS physical-iPhone distribution. An iOS Simulator build cannot run on an iPhone, and Windows cannot run Apple's iOS Simulator. Expo Go remains the free testing route.

In PowerShell inside the current source folder, run each command separately:

```powershell
npm.cmd ci
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest init --id 49ee7c99-08db-4b89-ad01-022961dcfd6c
npx.cmd eas-cli@latest device:create
npx.cmd eas-cli@latest build --platform ios --profile development
```

Follow EAS prompts to register the iPhone and configure Apple signing. Credentials belong in your own terminal/browser, not chat. EAS init may ask to align the local slug with the existing project; verify that it is your intended project before accepting changes.

The supplied EAS project ID is configured locally; remote ownership/slug has not been verified from this workspace. The chosen bundle identifier is com.nhshajib.nodecast (replacing the example identifier). If you already created an App Store Connect app with another identifier, change ios.bundleIdentifier to match it before building. Apple determines identifier availability.

The standalone app has its own local storage. Profiles saved inside Expo Go do not automatically transfer; enter your provider details in the new app.

When EAS finishes, open its installation link on your registered iPhone and install the development app. Enable iOS Developer Mode if prompted. On Windows, start Metro:

```powershell
npm.cmd run start:dev
```

Use the QR code/development launcher in **NodeCast**, not Expo Go. For a remote connection:

```powershell
npm.cmd run start:dev:tunnel
```

For Expo CLI authentication, separate from EAS CLI login:

```powershell
npx.cmd expo login --no-browser --username YOUR_EXPO_USERNAME
npx.cmd expo whoami
```

Rebuild the development app after adding/changing native dependencies, plugins, schemes or native permissions. JavaScript-only edits normally use Metro reload.

## Standalone testing without the PC

```powershell
npx.cmd eas-cli@latest build --platform ios --profile preview
```

The iPhone must be registered for this internal/ad-hoc build. Signing expires; this is not a permanent unsigned installation.

For TestFlight:

```powershell
npx.cmd eas-cli@latest build --platform ios --profile production
npx.cmd eas-cli@latest submit --platform ios --profile production
```

Submit only the intended completed production build. This uploads to App Store Connect; processing/testing and public App Store release are separate. TestFlight builds expire after 90 days.

## Expo Go tunnel fallback

After Expo CLI login, try the default tunnel first:

```powershell
npx.cmd expo start --go --tunnel --clear
```

If ngrok startup reports `Cannot read properties of undefined (reading 'body')`, that is a tunnel-service/helper failure before app loading. It does not establish a NodeCast playback error. Try the default tunnel rather than repeating the same ngrok command. LAN remains available with npm.cmd run start:go when network/firewall configuration permits it.
