[← All editions](../README.md) · [iPhone](../iphone/README.md) · [Other Android edition](../android-mobile/README.md)

<img src="../assets/readme/android-tv.svg" alt="NodeCast for Android TV" width="400" />

# NodeCast for Android TV

A landscape library, visible remote focus and fullscreen episodes with a bottom-right Next episode button.

**[Download TV APK · 0.4.0](https://github.com/nhshajib/NodeCast/releases/download/android-v0.4.0/NodeCast-tv-0.4.0.apk)** · [Release page](https://github.com/nhshajib/NodeCast/releases/tag/android-v0.4.0) · [Changelog](CHANGELOG.md) · [Build details & checksum](build.json)

While this repository is private, sign into GitHub with repository access before downloading.

## Version at a glance

| | Current download |
| --- | --- |
| Version | **0.4.0** · October 27, 2026 |
| File | `NodeCast-tv-0.4.0.apk` · 218.0 MB |
| Compatibility | Android 7+ · ARM32, ARM64 and x86-64 |
| App ID | `com.nhshajib.nodecast.tv` |
| Signing | Signed personal-testing APK · standard Android test key |
| Watching | No Expo Go, running PC or weekly signing renewal |
| Profiles | Local storage; no account or cloud sync |

<details>
<summary>Preview the TV player</summary>
<br />
<img src="../verification/android/native-tv-next-0.4.0.png" alt="NodeCast Android TV native emulator preview" width="900" />
<p>Native Android emulator capture with a generated test video.</p>
</details>

## Install

1. Download the **TV APK** above on a phone or PC signed into GitHub.
2. Transfer the APK to the TV using a USB drive or a trusted file-transfer app.
3. Open the APK with a TV file manager.
4. If Android TV asks, allow **Install unknown apps** for that file manager, then choose **Install**.
5. Open **NodeCast TV** from the TV app launcher. Complete or skip the home-IP setup and add your server or playlist.
6. Use the on-screen keyboard, or your Google TV phone remote keyboard, to enter long server/playlist links.

Choose this APK for Android TV / Google TV. Samsung Tizen and LG webOS use different app formats.

## Remote and Next episode

Use the D-pad to move between highlighted controls and Select/OK to activate them. **Back** closes the current page/player, clears a search or returns to Live TV before exiting.

For Xtream series, open the series and choose an episode. The fullscreen player's **Next episode** button sits at the bottom right and shows the following title/season. Select it to open that episode automatically from the beginning. It uses the provider's actual ordered episode list, crosses into the next season and releases the previous stream first. The final episode has no Next button. Plain M3U playlists without structured series metadata do not supply that sequence.

Movies and live TV keep their own playback controls. Audio/subtitle language choices for movies/episodes are remembered per profile when matching tracks are available.

## Update without losing profiles

Download the newer APK for this same edition and install it over the existing app. Avoid uninstalling first. Keep a separate copy of your provider details. An update installs new app code; it does not renew or change your IPTV subscription.

Version 0.4.0 fixes a VLC startup race found in earlier Android testing builds. Use this version when updating from 0.3.3.

## Changelog and verification

[Read the TV changelog](CHANGELOG.md) · [Exact build record](build.json) · [Native verification](../verification/android/README.md)

Release signatures, embedded JavaScript/VLC and architecture checks passed. Repeated cold starts passed on Android emulators. The TV test also passed native test-stream playback and D-pad/Select next-episode changes. Test your provider and hardware on your own device. Configure a private signing key before store distribution.

## Build from source

Shared dependencies and provider/playback code live at the repository root. The TV interface is in `TVApp.tsx`. See the [developer guide](../docs/DEVELOPMENT.md). From the root, `npm run build:android:tv` regenerates the matching native project and builds a local Release app with the template test key. Android SDK/Java tooling is required for local compilation.

[Download help](../docs/DOWNLOADS.md) · [All editions](../README.md) · [Support NodeCast](https://buymeacoffee.com/hexorbd)
