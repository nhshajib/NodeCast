# A lighter TV library · 0.6.7

These library changes apply to the TV edition. iPhone and Android mobile keep their existing library layouts and include the shared playback-overlay updates.

- **Channels start in List view**, with compact fixed-height rows, Play, channel options and Favorites. Choose Grid view from the toolbar if preferred. Movies and series retain their artwork.
- Channel logos are **off by default in the list**, avoiding image requests. Grid/logos refresh picture metadata on demand after restarting; the default text list keeps using its fresh saved catalog without that extra request. Turn them on in Library options → Library preferences. Layout, logos, sort, refresh and TV search defaults belong to the profile and are included in encrypted backups.
- Organization has separate **Library preferences, Categories and Favorites order** panels. The media selector controls the correct Live TV, Movies or Series preferences. Categories use remote-selectable rows; large collections are virtualized rather than paged in groups of 40.
- Cached catalogs now hydrate TV memory after restarting. Organization no longer depends on having refreshed online first, and opening preferences does not download all media libraries. Favorite catalogs load only media types that contain saved favorites.
- Hiding the selected category returns the library to All. Recently watched filters belong to each media tab. Category/favorite mutations use the latest queued profile, and saving does not disable the focused TV control.
- Channel rows are memoized; favorite toggles do not rebuild the full Live TV search index. Numeric alphabetical sorting reuses an `Intl.Collator`. Rendering stays bounded with fixed row layouts and small batches. The native grid also has an explicit viewport and fixed 214dp cards/228dp row pitch, including space for two-line titles. This prevents offscreen cards from expanding the native render window. Native grid checks assert fewer than 60 accessible cards in the snapshot and 100 logo requests for 3,000 channels. The final API 30 run reports six visible grid actions and 18 image requests; the default list requests none.

## Checks

TypeScript and **125 automated tests** cover provider behavior, settings/backup validation, cache hydration and isolation, stable numeric sorting over 10,000 channels, and favorite ordering. The browser integration uses a local synthetic 3,000-channel provider at the native TV logical size of 960×540. It checks layout boundaries, list/grid, skipped image downloads, lazy media loading, category visibility, favorites and independent media preferences. The final browser run mounts 11 text rows or 18 grid cards from 3,000 channels. See `browser-result.json` for measured counts and scope; browser timing is not a physical-TV performance benchmark.

Native release verification uses the exact APK with `.github/workflows/android-smoke.yml`, API 30 and `tv_suite=library`. It exercises D-pad/Select only, saved category/favorite data after process restart, no refetch for a fresh disk cache, layout persistence and independent movie/live settings. Separate `stability` and `core` suites check playback overlays, live pixels/connections, remote input, guide/catch-up and local controls. Final run IDs and checksums are recorded in `android-tv/build.json` after those checks finish. Physical Hisense/Fire TV speed remains a device-testing check. APK size is not the performance measure: embedded VLC and the three CPU architectures are retained for compatibility.

To repeat browser UI checks:

```sh
NODECAST_TARGET=tv EXPO_PUBLIC_APP_VARIANT=tv EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 npx expo export --platform web --output-dir build/tv-web
python3 scripts/tv-library-web-smoke.py
```

Requires Python Playwright, Chromium and a local HTTP listener. No IPTV credentials are used. Screenshots here show synthetic provider content. Any IP/location card in native captures belongs to the disposable CI runner, not a customer device.

## Final native captures

[Channel list](native-library-list.png) · [Grid view](native-library-grid.png) · [Restored categories](native-organization-cached-categories.png) · [Exact native results](native-result.json)
