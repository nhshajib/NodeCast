# Download help

[← NodeCast home](../README.md)

Choose the file for your device:

| Device | Download and installation guide | File |
| --- | --- | --- |
| iPhone | [iPhone edition](../iphone/README.md) | `.ipa` — requires personal Apple signing |
| Android phone or tablet | [Android mobile edition](../android-mobile/README.md) | Mobile `.apk` |
| Android TV or Google TV | [Android TV edition](../android-tv/README.md) | TV `.apk` |

## Login page, 404 or inaccessible download

This repository is currently private. Sign into the GitHub account with repository access in the same browser you use to download. An account signed into Expo does not sign you into GitHub. Open the product's release page and select its IPA/APK under **Assets** if the direct link does not open.

If you do not have repository access, ask the repository owner. NodeCast does not need a GitHub account after installation.

## Downloaded ZIP instead of IPA/APK

GitHub Actions artifacts arrive as ZIP files. Extract the ZIP and use the IPA/APK inside. The product pages link directly to release files, so those downloads do not need extraction. Keep the file's original extension.

## Which version should I install?

Use the published version shown on your product page. iPhone and Android releases can have different version numbers. The latest shared source version can be ahead of an edition's downloadable binary.

When updating, keep the same app/signing identity and install over the existing app. Deleting the app can remove local profiles. iPhone free signing needs periodic renewal; Android APKs have no weekly signing renewal.

## Move to a different device

In NodeCast 0.6.4 or later, open **Settings → Backup & transfer → Export backup**. Choose a password of at least 12 characters, create the encrypted file, and save it using Files/the system picker. Keep the password separately; it cannot be recovered.

Copy the `.nodecast` file to the new device. Open **Settings → Backup & transfer → Import backup**, choose the file, enter its password, review its contents, then select **Import profiles & settings**. Profiles, provider details, favorites and settings transfer; history is optional. Existing profiles stay. An existing family PIN stays; a fresh device restores the backup PIN. Guides and library caches download again. Check your saved home-IP reference if you have changed networks.

Android TV needs a compatible system document picker/file manager for import and export. Unsupported external-player preferences fall back to the built-in player.

## Check a downloaded file

Every product page links to its build record with the exact filename, byte size and SHA-256 hash. You can compare the hash on Windows:

```powershell
Get-FileHash -Algorithm SHA256 "C:\path\to\NodeCast-file.apk"
```

Replace the path with your downloaded IPA or APK. A matching hash confirms that the file matches the published build.

## The app opens but a stream will not play

1. Confirm the server address, username/password or full M3U link with your provider.
2. Check whether that subscription plays in another trusted IPTV player, and whether your provider requires a VPN or limits simultaneous connections.
3. Try built-in live playback on **Automatic**, or choose external VLC if available. Android offers VLC; iPhone also offers Infuse.
4. For M3U HTTP 404, verify the provider's playlist endpoint. A working server login can have a different address from its playlist link.
5. Report the app edition/version, device, connection type and error text. Keep passwords, complete playlist links and tokens out of screenshots and issues.

The public-IP card compares the current exit IP with your saved home reference. It does not certify that a VPN is connected. Plain M3U playlists without structured series metadata do not provide an automatic next-episode sequence.

[Back to all editions →](../README.md)
