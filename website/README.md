# GlowTV website

Independent Astro static site for https://glowtv.app. Node.js 24 LTS. No imports from the app project.

```sh
npm ci
npm run dev
npm run build
npm run audit
```

Use `ASTRO_TELEMETRY_DISABLED=1` in restricted environments. Audits start their own static server and use Playwright Chromium; install it with `npx playwright install --with-deps chromium`. To use a system browser, set `CHROMIUM_PATH=/usr/bin/chromium`.

[Hosting, DNS and pending values](HOSTING.md) · [Photography and screenshot provenance](CREDITS.md).

Download data is refreshed from public GitHub releases at build time. Versioned IPA/APK links, file sizes and SHA-256 digests are selected independently per edition; drafts never become buttons. A checked snapshot supports offline or rate-limited builds. Run `npm test` for release-selection checks. After refreshing metadata, run `node scripts/sync-download-folders.mjs` from the repository root to update platform download records.
