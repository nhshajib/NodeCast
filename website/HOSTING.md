# glowtv.app hosting

The independent Astro site builds with `npm ci && npm run build` from `website/`, producing `website/dist/`. The workflow `website-deploy.yml` validates and deploys that output. It runs for website/brand changes, independently of app CI. Asset sources are copied into this project; it never imports from `apps/`.

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

## Pending values

- `[APP_STORE_URL]`: verified iOS listing; a separate tvOS listing is required once an Apple TV target exists.
- `[PLAY_STORE_URL]`: verified phone / TV listings, when published.
- `[AMAZON_URL]`: verified Amazon listing.
- `[DOWNLOADER_CODE]`: assigned official TV download code.
- `[GSC_TOKEN]`: Google Search Console HTML verification token.
- `[ANALYTICS_DOMAIN]`, `[ANALYTICS_SCRIPT_URL]`: optional privacy-friendly analytics configuration. Analytics is disabled until configured and documented in the privacy policy.

Unavailable store labels are plain text, not broken anchors. APK links become active only after a verified public GlowTV release supplies real metadata. No older binary is renamed for marketing.

## Release metadata

`apps-release.yml` produces `GlowTV.apk`, `GlowTV-TV.apk`, checksums and `release-metadata.json`. Verify the draft before publishing. The website build fetches the latest public, non-prerelease `glowtv-v*` release and accepts metadata only for actual matching assets, sizes and SHA-256 fields. Trigger the website workflow after publishing a release to refresh availability. This avoids hand-entered release versions, dates or checksums.
