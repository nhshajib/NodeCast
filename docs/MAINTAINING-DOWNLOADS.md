# Updating the download hub

[← Developer guide](DEVELOPMENT.md) · [Home](../README.md)

Keep published binaries and shared source versions separate. Publishing an Android build does not create a new iPhone IPA.

For an edition's next release:

1. Build and verify the standalone binary. Confirm the filename, app ID, version, architecture, byte size and SHA-256.
2. Upload it and its checksum to a GitHub release. Keep direct download URLs pointed at release assets, since Actions artifacts expire.
3. Update that edition's `build.json`, download link/version table and `CHANGELOG.md`.
4. Update the edition's card and download row in the root `README.md`, plus its row in the root `CHANGELOG.md`.
5. Keep the release notes aligned with the actual platform features and signing method. Record native/physical testing limits accurately.
6. Verify every local documentation/image link and the published release asset before announcing the download.

The product pages are `iphone/README.md`, `android-mobile/README.md` and `android-tv/README.md`. Shared source's detailed history is in `src/releases.ts`; the site-facing changelogs describe published downloads.

The iPhone 0.3.0 release was promoted from a verified existing artifact with `publish-iphone-download.yml`, without rebuilding it. A future version needs its own verified binary and updated metadata.

For new iPhone builds, `publish-iphone-download.yml` now accepts the successful build run ID, its full source commit and the IPA SHA-256 from that run's packaging log. It validates provenance, archive integrity, bundle ID, version and device platform before uploading into an existing draft release. It uses the publisher's existing permissions; the iPhone build workflow remains read-only. Publish the draft and update product links only after verification. Android builds also upload into a draft until native checks finish.
