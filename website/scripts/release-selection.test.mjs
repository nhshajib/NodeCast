import test from 'node:test';
import assert from 'node:assert/strict';
import {selectDownloads} from './release-selection.mjs';
const digest='sha256:'+'a'.repeat(64),root='https://github.com/nhshajib/NodeCast';
function fixture(tag='android-v0.6.7',name='NodeCast-mobile-0.6.7.apk',extra={}){return{tag_name:tag,draft:false,prerelease:true,published_at:'2026-10-31T01:01:22Z',assets:[{name,state:'uploaded',size:100,digest,browser_download_url:`${root}/releases/download/${tag}/${name}`}],...extra};}
const empty={platforms:{}};
test('public testing downloads keep their exact tag and original name',()=>{const item=selectDownloads([fixture()],empty).android;assert.equal(item.url,root+'/releases/download/android-v0.6.7/NodeCast-mobile-0.6.7.apk');assert(item.prerelease&&item.legacy);assert.equal(selectDownloads([fixture()],empty).tv,null);});
test('drafts and external or incomplete assets never become download buttons',()=>{for(const change of [{draft:true},{assets:[{...fixture().assets[0],browser_download_url:'https://example.com/file.apk'}]},{assets:[{...fixture().assets[0],digest:null}]},{assets:[{...fixture().assets[0],state:'new'}]}])assert.equal(selectDownloads([fixture(undefined,undefined,change)],empty).android,null);});
test('each edition is selected independently, sorted by version, without /latest',()=>{const result=selectDownloads([fixture(),fixture('android-v0.6.6','NodeCast-mobile-0.6.6.apk',{published_at:'2026-11-17T00:00:00Z'}),fixture('ios-v0.6.4','NodeCast-0.6.4-unsigned.ipa'),fixture('glowtv-v0.7.0','GlowTV-TV.apk')],empty);assert.equal(result.android.version,'0.6.7');assert.equal(result.ios.version,'0.6.4');assert.equal(result.tv.version,'0.7.0');assert(!result.tv.legacy);});
test('minimum OS is retained only for the identical verified binary',()=>{const old=selectDownloads([fixture()],empty).android;const snapshot={platforms:{android:{...old,minimumOS:'Android 7.0'}}};assert.equal(selectDownloads([fixture()],snapshot).android.minimumOS,'Android 7.0');assert.equal(selectDownloads([fixture('android-v0.6.8','NodeCast-mobile-0.6.8.apk')],snapshot).android.minimumOS,null);});
test('mobile can advance first; publishing TV later keeps the mobile asset and cumulative count',()=>{
 const phone=fixture('android-v1.0.3','GlowTV.apk',{prerelease:false,published_at:'2026-11-25T23:50:00Z'});
 phone.assets[0].download_count=4;
 const oldPhone=fixture('glowtv-v1.0.2','GlowTV.apk',{prerelease:false});oldPhone.assets[0].download_count=12;
 const oldTV=fixture('glowtv-v1.0.2','GlowTV-TV.apk',{prerelease:false});
 const first=selectDownloads([phone,oldPhone,oldTV],empty);
 assert.equal(first.android.tag,'android-v1.0.3');assert.equal(first.tv.version,'1.0.2');
 assert.equal(first.android.downloadCount+first.android.previousDownloadCount,16);
 const tv=fixture('glowtv-android-v1.0.3','GlowTV-TV.apk',{prerelease:false,published_at:'2026-11-26T00:20:00Z'});
 const second=selectDownloads([tv,phone,oldPhone,oldTV],empty);
 assert.equal(second.android.url,first.android.url);assert.equal(second.tv.version,'1.0.3');
 assert.equal(second.android.downloadCount+second.android.previousDownloadCount,16);
});
