# Repository homepage

The repository README is designed as a product landing page within GitHub's supported Markdown and HTML. It uses local SVG artwork in the app's lavender, cream and ink palette, a separate hero for narrow screens, readable per-edition download rows, real product captures, feature summaries and expandable help.

Visual verification rendered the README through GitHub's Markdown API, then inspected that output in Chromium with GitHub Markdown CSS 5.8.1. These are rendered README previews, not screenshots of a hosted website or GitHub's surrounding repository interface.

- Desktop: 1280px, light and dark appearance.
- Phone: 390px and 320px.
- No missing images, document overflow or scrolling inside the tables.
- All three download image targets retain at least 44px height.
- Narrow screens select the mobile hero; desktop selects the wide illustration.
- The download destinations match each edition's published `build.json`.

[Desktop opening](desktop-top.png) · [Phone opening](phone-top.png) · [Dark opening](desktop-dark-top.png) · [Full desktop preview](desktop.png) · [Full phone preview](phone.png) · [Layout measurements](checks.json)

App captures on the homepage retain their existing provenance. Device/hero drawings are illustrations. The app source and IPA/APK assets were not changed for this redesign.
