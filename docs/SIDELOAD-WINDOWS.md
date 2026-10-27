# NodeCast IPA: build, download and install on Windows

This workflow makes an **unsigned physical-iPhone Release IPA**, with embedded JavaScript and VLC. It is not a Simulator build or a Metro-dependent development client. Use Impactor to sign it with your own Apple account for personal installation. No Apple ID, signing certificate, IPTV credentials or Expo token is required in GitHub.

## Current download

[Download NodeCast 0.3.0 IPA](https://github.com/nhshajib/NodeCast/releases/download/ios-v0.3.0/NodeCast-0.3.0-unsigned.ipa) · [iPhone product page, versions and changelog](../iphone/README.md)

The release download is a permanent copy of the verified IPA. Sign into GitHub with repository access before downloading.

## Alternative: download a build artifact

1. Open https://github.com/nhshajib/NodeCast/actions and sign in to the GitHub account that can access this private repository.
2. Select **Build iPhone IPA for personal signing**.
3. Open a successful (green) run. A failed/red run has no usable IPA.
4. Under **Artifacts**, download **NodeCast-iPhone-IPA**.
5. Extract the downloaded ZIP. Inside is `NodeCast-<version>-unsigned.ipa`, `SHA256SUMS.txt` and `INSTALL.txt`.
6. Keep the extracted IPA on your PC for future refreshes. The GitHub artifact is retained seven days; that download retention is separate from Apple's signing expiry.

If no successful run exists, use **Run workflow → main → Run workflow**. Compilation uses the GitHub macos-26 runner (Swift 6.2+ is required by the installed Expo native modules) and is subject to GitHub Actions availability, billing and usage limits. It can take several minutes. A completed pipeline checks device platform, arm64, embedded JavaScript, native VLC linkage and ZIP integrity; real iPhone decoding still needs a device test.

## Install with Impactor

1. Download **Impactor for Windows** from the [official claration/impactor releases](https://github.com/claration/impactor/releases). Open Impactor and install the required Apple device software/drivers if prompted.
2. Connect the unlocked iPhone using USB. Accept Trust This Computer if asked.
3. Open Impactor and select your iPhone. If it is not detected, verify Apple Devices/iTunes can see it before attempting installation.
4. Drag the extracted **.ipa**, not the GitHub artifact ZIP, into Impactor.
5. Follow Impactor’s Apple-account sign-in prompts and start the installation. Enter credentials and verification codes only in Impactor.
6. Follow the phone's prompts to trust your developer profile (Settings → General → VPN & Device Management) and enable Developer Mode (Settings → Privacy & Security) if requested.
7. Open **NodeCast**, not Expo Go. Enter your IPTV details; profiles saved in Expo Go do not automatically transfer to this app's separate storage.
8. In Settings → Default player, choose **NodeCast player**, and leave **Built-in live player** on Automatic. Live playback should say **Built-in VLC · Live TV**.

You can turn the PC off while watching. Metro and Expo Go are not needed by this Release build.

## Keep using free signing

Free Apple signing normally lasts seven days. Before it expires, reconnect the phone and refresh/re-sign the same app with Impactor. Keep the same Apple account and bundle identifier when updating. Re-sign over the existing app; deleting it can remove local data. Impactor's optional automatic refresh still needs the PC available periodically with USB or configured Wi-Fi pairing. It does not need to remain on while you watch.

Official installer project and release notes: https://github.com/claration/impactor . Installation and Apple personal-signing limits can vary by device, account and iOS version; a downloaded unsigned IPA alone is not an installable signed app.
