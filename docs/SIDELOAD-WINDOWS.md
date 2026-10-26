# NodeCast IPA: build, download and install on Windows

This workflow makes an **unsigned physical-iPhone Release IPA**, with embedded JavaScript and VLC. It is not a Simulator build or a Metro-dependent development client. It is for signing with your own Apple account in Sideloadly, not App Store/TestFlight submission. No Apple ID, signing certificate, IPTV credentials or Expo token is required in GitHub.

## Download a completed build

1. Open https://github.com/nhshajib/iptvplayer/actions and sign in to the GitHub account that can access this private repository.
2. Select **Build iPhone IPA for Sideloadly**.
3. Open a successful (green) run. A failed/red run has no usable IPA.
4. Under **Artifacts**, download **NodeCast-iPhone-IPA**.
5. Extract the downloaded ZIP. Inside is `NodeCast-<version>-unsigned.ipa`, `SHA256SUMS.txt` and `INSTALL.txt`.
6. Keep the extracted IPA on your PC for future refreshes. The GitHub artifact is retained seven days; that download retention is separate from Apple's signing expiry.

If no successful run exists, use **Run workflow → main → Run workflow**. Compilation uses the GitHub macos-26 runner (Swift 6.2+ is required by the installed Expo native modules) and is subject to GitHub Actions availability, billing and usage limits. It can take several minutes. A completed pipeline checks device platform, arm64, embedded JavaScript, native VLC linkage and ZIP integrity; real iPhone decoding still needs a device test.

## Install with Sideloadly

1. Download Sideloadly for Windows from https://sideloadly.io/ and install its required Apple device software/drivers.
2. Connect the unlocked iPhone using USB. Accept Trust This Computer if asked.
3. Open Sideloadly and select your iPhone. If it is not detected, verify Apple Devices/iTunes can see it before attempting installation.
4. Drag the extracted **.ipa**, not the GitHub artifact ZIP, into Sideloadly.
5. Use normal Apple-ID signing with your own Apple account, then click **Start**. Enter credentials/verification only in the installer, never in chat or repository files.
6. Follow the phone's prompts to trust your developer profile (Settings → General → VPN & Device Management) and enable Developer Mode (Settings → Privacy & Security) if requested.
7. Open **NodeCast**, not Expo Go. Enter your IPTV details; profiles saved in Expo Go do not automatically transfer to this app's separate storage.
8. In Settings → Default player, choose **NodeCast player**, and leave **Built-in live player** on Automatic. Live playback should say **Built-in VLC · Live TV**.

You can turn the PC off while watching. Metro and Expo Go are not needed by this Release build.

## Keep using free signing

Free Apple signing normally lasts seven days. Before it expires, reconnect the phone and refresh/re-sign the same app with Sideloadly. Keep the same Apple account and bundle identifier when updating. Re-sign over the existing app; deleting it can remove local data. Sideloadly's optional automatic refresh still needs the PC available periodically with USB or configured Wi-Fi pairing. It does not need to remain on while you watch.

Official installer instructions/limitations: https://sideloadly.io/faq.html . Installation and Apple personal-signing limits can vary by device, account and iOS version; a downloaded unsigned IPA alone is not an installable signed app.
