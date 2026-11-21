import test from 'node:test';
import assert from 'node:assert/strict';
import {downloadCount,assetDownloadCount,cachedDownloadCount} from '../src/lib/download-counts.mjs';
import {selectDownloads} from './release-selection.mjs';
const url='https://github.com/nhshajib/NodeCast/releases/download/glowtv-v0.7.4/GlowTV.apk';
test('a real zero is valid; absent, fractional, negative or fabricated counts stay unknown',()=>{
 for(const n of [0,1,1250000])assert.equal(downloadCount(n),n);
 for(const n of [undefined,null,'100',-1,1.1,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.equal(downloadCount(n),null);
});
test('live counts belong to the exact selected release file and asset ID',()=>{
 const asset={id:123,browser_download_url:url,download_count:7};assert.equal(assetDownloadCount(asset,url,123),7);
 assert.equal(assetDownloadCount(asset,url.replace('GlowTV.apk','GlowTV-TV.apk'),123),null);
 assert.equal(assetDownloadCount(asset,url,124),null);assert.equal(assetDownloadCount(null,url,123),null);
});
test('the short-lived cache rejects stale, future, invalid and other-version entries',()=>{
 const entry={url,count:12,checkedAt:1000};assert.equal(cachedDownloadCount(entry,url,1001),12);
 assert.equal(cachedDownloadCount(entry,url,301000),null);assert.equal(cachedDownloadCount(entry,url,999),null);
 assert.equal(cachedDownloadCount({...entry,count:'12'},url,1001),null);assert.equal(cachedDownloadCount(entry,'another-file',1001),null);
});
test('release selection counts only the app binary, excluding checksums and metadata',()=>{
 const asset={id:123,name:'GlowTV.apk',state:'uploaded',size:100,digest:'sha256:'+'a'.repeat(64),browser_download_url:url,download_count:7};
 const release={tag_name:'glowtv-v0.7.4',published_at:'2026-11-21T00:00:00Z',draft:false,assets:[{...asset,name:'release-metadata.json',download_count:900},asset]};
 const chosen=selectDownloads([release],{platforms:{}}).android;assert.equal(chosen.assetId,123);assert.equal(chosen.downloadCount,7);
 assert.equal(selectDownloads([{...release,assets:[{...asset,download_count:undefined}]}],{platforms:{}}).android.downloadCount,null);
});
