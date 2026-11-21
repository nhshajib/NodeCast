/** GitHub counts file downloads, including repeat downloads; never infer installs. */
export function downloadCount(value) {
 return Number.isSafeInteger(value) && value >= 0 ? value : null;
}
export function assetDownloadCount(asset, expectedURL, expectedId) {
 if (!asset || asset.id !== expectedId || asset.browser_download_url !== expectedURL) return null;
 return downloadCount(asset.download_count);
}
export function cachedDownloadCount(value, expectedURL, now) {
 if (!value || value.url !== expectedURL || !Number.isFinite(value.checkedAt) || value.checkedAt > now || now - value.checkedAt >= 300000) return null;
 return downloadCount(value.count);
}
