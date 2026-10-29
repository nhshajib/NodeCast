# Backup and recent-history verification

Version 0.6.4 adds Clear recents to Home, TV recent channels and Settings → Library & storage. It keeps resume positions and watched marks. Watching again brings a channel back. Clear viewing history remains a separate destructive action.

Settings → Backup & transfer creates password-encrypted `.nodecast` files. Profiles, provider credentials/headers, local playlists, favorites, channel/group/playback preferences, guide configuration, appearance, home-IP reference and family protection are included. Viewing history is optional. Cached libraries and guide schedules rebuild. Backup passwords require 12–256 characters and cannot be recovered. Maximum encrypted file: 12 MiB.

Import previews counts before committing. It adds profile copies and retains existing profiles; general preferences use the backup. An existing family PIN stays; otherwise the backup PIN is restored. Android replaces unsupported Infuse choices with the internal player. Imports lock family protection and reload the library. A journal repairs an interrupted import before startup loads profiles.

`npm test` covers authenticated encryption, wrong passwords/tampering, strict format limits, profile preservation, history remapping, interrupted import recovery and clear-recents behavior. `check.py` exercises both exported interfaces using synthetic credentials, with screenshots and `checks.json`. Browser tests do not certify native file pickers. Android emulator checks additionally save an encrypted file through DocumentsUI, clear **emulator-only** app data, then restore profiles/favorites/guide/dark appearance/family protection on a fresh installation.

Native iOS Release startup is checked in the simulator before IPA packaging. Physical iPhone file sharing and TV file-picker availability still depend on the installed device software.

Android export uses the current File API for document-provider URIs and waits for writing to finish. A guarded postinstall patch corrects expo-intent-launcher 58.0.3 returning `Intent.toString()` instead of `Intent.data`; without this fix the system picker creates an empty file. Native verification requires a nonempty encrypted file before testing fresh-device import. The file picker backgrounds the app, so the test unlocks family controls again to check the export confirmation.
