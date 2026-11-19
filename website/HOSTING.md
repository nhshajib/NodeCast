# glowtv.app hosting

The independent Astro site builds with `npm ci && npm run build` from `website/`, producing `website/dist/`. The workflow `website-deploy.yml` validates that output. GitHub Pages deployment is optional and runs only when the repository variable `GITHUB_PAGES_ENABLED` is `true`. It runs for website/brand changes, independently of app CI. Asset sources are copied into this project; it never imports from `apps/`.

In repository Settings → Pages, choose **GitHub Actions** as the source. Set **Custom domain** to `glowtv.app`. The generated artifact includes CNAME with that exact value. Wait for GitHub's domain check and certificate provisioning, then enable **Enforce HTTPS**. A CNAME file alone does not configure DNS or prove HTTPS is active.

At your registrar, replace conflicting apex records with:

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |
| CNAME | www | nhshajib.github.io |

Use DNS-only while GitHub verifies the domain. `www` DNS points to GitHub; GitHub Pages performs the HTTP redirect to the configured apex once the domain and certificate are ready. Do not point `www` to an IP address or include `https://` in a DNS record.

Verify all four with an HTTPS client after propagation:
`https://glowtv.app/`, `https://www.glowtv.app/` (redirect to apex), `https://glowtv.app/sitemap.xml`, `https://glowtv.app/robots.txt`.

The `support@glowtv.app` mailto also requires a working mailbox. Keep existing MX and email-verification records when adding the web records above.

## Vercel (current live host)

The connected Vercel project deploys pushes to `main`. Use the Astro preset, root directory `website`, build command `npm run build`, output directory `dist` and Node.js 24. The site is static and needs no app secrets. The checked public-release snapshot keeps the download pages current even if GitHub rate limits the build.

Keep Vercel’s DNS records when hosting there; the GitHub Pages DNS table above applies only if you move hosting to GitHub Pages. Do not combine the two hosts’ apex records. Domain redirects are configured in Vercel → Project Settings → Domains. The source canonical host is `https://glowtv.app/`; configure `www` to redirect to the apex when making that host canonical.

Leave `GITHUB_PAGES_ENABLED` unset for Vercel. Website tests, build, accessibility audit and the downloadable site artifact still run in GitHub Actions; this avoids attempting deployment to an unconfigured Pages site. To use Pages later, configure the site first and set the variable to `true`.

## Pending values

Store listings and the Search Console token live in `src/data/site.ts` (`stores` and `searchConsoleToken`). Leave a value empty until it is real:

- `stores.appStore`: verified iOS listing URL. A separate tvOS listing is needed once an Apple TV target exists.
- `stores.playStore`: verified phone and TV listing URL.
- `stores.amazonAppstore`: verified Amazon Appstore listing URL.
- `stores.downloaderCode`: the assigned Downloader code for the TV APK.
- `searchConsoleToken`: Google Search Console HTML verification token. No verification tag is rendered while it is empty.
- `[ANALYTICS_DOMAIN]`, `[ANALYTICS_SCRIPT_URL]`: optional privacy-friendly analytics, noted in an HTML comment in `src/layouts/Layout.astro`. Analytics stays off until it is configured and documented in the privacy policy.

While a store value is empty, the download page says GlowTV isn't in that store yet and points to the GitHub download. Nothing shows a placeholder or a broken link. The site audit (`npm run audit`) fails if bracketed placeholder text appears on the home page. Download buttons use verified public GitHub assets, testing releases are labelled, and each platform is selected independently. Draft releases and build artifacts are never shown as public downloads.

## Release metadata

`apps-release.yml` produces `GlowTV.apk` and `GlowTV-TV.apk` with checksums as build artifacts. A version tag or the manual `create_draft` option attaches APKs and `release-metadata.json` to a draft GitHub Release. Manual validation builds default to artifacts only. Verify the draft before publishing. The website build selects the newest published release for each edition, including labeled public testing releases, and accepts downloads only when GitHub provides the matching asset URL, size and SHA-256 digest. Trigger the website workflow after publishing a release to refresh availability. This avoids hand-entered release versions, dates or checksums.

The website selects published assets independently for iPhone, Android phone and TV, using pinned tag-specific URLs instead of `/releases/latest/download/` (GitHub latest excludes testing releases and may refer to another platform). File sizes, dates and digests come from the GitHub release API. A checked public-release snapshot supports offline builds and Vercel builds when GitHub rate limits requests. Minimum OS is shown only when verified for the identical asset. Refresh `website/src/data/downloads-snapshot.json` from verified public metadata when publishing, then run `node scripts/sync-download-folders.mjs` from the root to refresh each platform’s `download.json`, `DOWNLOADS.md` and README links.
