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
