# Everyday polish · source 0.5.0

- TypeScript: passed.
- Automated tests: 84 passed, including legacy secure-vault writes and eight new preference/report/search/series tests.
- Mobile and TV browser checks: passed; see `checks.json` and six PNG screenshots. These use synthetic IPTV metadata and the repository's generated MP4, not a customer's subscription.
- JavaScript/Hermes exports: iOS, Android mobile and Android TV passed. Web exports for both layouts passed.
- No IPA/APK built or published. Physical iPhone, Android mobile and TV decoder/track/remote/performance checks remain pending.

Reproduce the browser checks after exporting mobile web to one static server at `127.0.0.1:8091` and TV web (`NODECAST_TARGET=tv EXPO_PUBLIC_APP_VARIANT=tv`) to another at `127.0.0.1:8092`. From the repository root, run `python verification/everyday/check.py` with Playwright and Chromium available. The script intercepts `provider.example` and the IP service, so it needs no actual IPTV account.

The browser checks verify category retention, scope controls, saved channel player selection, external chooser, return navigation, failed-refresh cache retention, watched marks, redacted player information, cross-season next episode and returning to the selected season. They do not exercise native VLC, real external-app installation/handoff, physical D-pad behavior or native filesystem failure conditions.

The 30,000-title fixture in the automated suite is a correctness/performance smoke check on this host, not a physical-device frame-rate or memory benchmark. No new background polling, cloud service or second video session was introduced.
