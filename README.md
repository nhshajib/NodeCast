<p align="center"><img src="brand/logo/glowtv-logo-light-bg.svg" alt="GlowTV" width="260" /></p>

# GlowTV

**Your TV, beautifully lit.** A free, open-source IPTV player for iPhone, iPad, Android, Android TV and Fire TV. Bring your own legally obtained M3U playlist, file or Xtream Codes account. GlowTV does not sell, host or provide channels, subscriptions or content.

[Website](https://glowtv.app/) · [Download availability](https://glowtv.app/download/) · [Installation guides](https://glowtv.app/install/) · [Support](https://glowtv.app/support/) · [Changelog](CHANGELOG.md)

The GlowTV rebrand is in development. Store listings and new branded binaries are pending; previous project releases remain in [GitHub Releases](https://github.com/nhshajib/NodeCast/releases) under their original names. The website's custom domain needs GitHub Pages and DNS setup; see [hosting instructions](website/HOSTING.md).

| Your device | Download and setup | Project |
| --- | --- | --- |
| iPhone / iPad | [iOS availability](https://glowtv.app/download/iphone/) · [Install](https://glowtv.app/install/iphone/) | [iPhone documentation](apps/player/iphone/) |
| Android phone | [Android availability](https://glowtv.app/download/android/) · [Install APK](https://glowtv.app/install/android/) | [Phone documentation](apps/player/android-mobile/) |
| Android TV / Fire TV | [TV availability](https://glowtv.app/download/tv/) · [Fire TV setup](https://glowtv.app/install/fire-tv/) | [TV documentation](apps/player/android-tv/) |

Apple TV is not supported yet. Apple TV brand assets are prepared for a future tvOS project.

## Features

Live TV and XMLTV guide, provider-supported catch-up, movies, series and next episode, favorites, search, multiple profiles, viewing progress, encrypted backup and transfer, family controls, external players, on-screen playback settings and a dedicated remote-first TV layout. Compatible native iOS playback supports AirPlay and picture-in-picture; Chromecast is not implemented.

## Projects

- [apps/player/](apps/player/) — one shared React Native + Expo project with phone and dedicated TV shells.
- [website/](website/) — independent Astro static site; no dependency on the app project.
- [brand/](brand/) — original supplied GlowTV logos, launcher icons and brand board.
- [design/](design/) — supplied app mockups and website reference.
- [store-assets/](store-assets/) — screenshot candidates, icons and capture provenance.

## Run locally

Use Node.js 24 LTS. From the repository root:

```sh
cd apps/player
npm ci
npm run typecheck
npm test
npm run start:dev
```

On Windows PowerShell, use `npm.cmd` and `npx.cmd` if script execution is restricted. Expo Go can preview supported features; built-in VLC needs a custom native build. Existing bundle IDs, signing configuration, backup formats and persisted storage keys are retained for update compatibility.

For the website, open another terminal:

```sh
cd website
npm ci
npm run dev
```

[Build and hosting](website/HOSTING.md) · [Audit scope](verification/glowtv/README.md) · [Original project attribution](NOTICE) · [GPL-3.0-only license](LICENSE)

Optional support: [buymeacoffee.com/hexorbd](https://buymeacoffee.com/hexorbd). Support never unlocks content or app features.
