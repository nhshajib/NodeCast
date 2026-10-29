import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePlayback, playbackURLs } from '../src/livePlayback.ts';
import { createSearchIndex, searchIndex, serializeCatalog, restoreCatalog } from '../src/catalog.ts';
import { validateVault, emptyVault } from '../src/vault.ts';
import { releases, appVersion } from '../src/releases.ts';
import { progressPercent } from '../src/activity.ts';
import { loadLibrary } from '../src/provider.ts';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const provider = {kind:'xtream',name:'Test',address:'https://fixture.example/prefix',username:'u@name',password:'p/word'};
const channel = {id:'live:42',kind:'live',streamId:'42',name:'BBC One HD',group:'UK',url:'https://fixture.example/prefix/live/u%40name/p%2Fword/42.m3u8'};
test('automatic Xtream playback offers sequential HLS and TS, with TS sent to external players',()=>{
 const item=preparePlayback(channel,provider);
 assert.deepEqual(playbackURLs(item),[channel.url,'https://fixture.example/prefix/live/u%40name/p%2Fword/42.ts']);
 assert.equal(item.externalURL,item.playbackURLs[1]);
});
test('explicit live formats have no silent format fallback and do not affect movies',()=>{
 const hls=preparePlayback(channel,provider,'hls'); assert.deepEqual(playbackURLs(hls),[channel.url]); assert.equal(hls.externalURL,channel.url);
 const ts=preparePlayback(channel,provider,'ts'); assert.equal(playbackURLs(ts).length,1); assert.ok(ts.url.endsWith('/42.ts'));
 const movie={...channel,kind:'movies',url:'https://fixture.example/film.mp4'};assert.equal(preparePlayback(movie,provider,'ts'),movie);
});
test('M3U and non-Xtream media keep original signed stream URLs unchanged',()=>{
 const signed={...channel,url:'https://fixture.example/stream?token=signed&output=m3u8'};
 assert.equal(preparePlayback(signed,{...provider,kind:'m3u'}),signed);
 assert.equal(preparePlayback(signed,null),signed);
});
test('provider direct live URL is tried first and passed intact to VLC',()=>{
 const direct='https://edge.example/signed.m3u8?token=private';
 const result=preparePlayback({...channel,url:direct},provider);
 assert.deepEqual(playbackURLs(result),[direct,channel.url,'https://fixture.example/prefix/live/u%40name/p%2Fword/42.ts']);
 assert.equal(result.externalURL,direct);
});
test('fallback URLs and external credentials are omitted from persisted catalogue snapshots',()=>{
 const prepared=preparePlayback(channel,provider);
 const json=JSON.stringify(serializeCatalog([prepared])); assert.ok(!json.includes('https:')); assert.ok(!json.includes('p%2Fword'));
 const restored=restoreCatalog(JSON.parse(json),provider).items[0]; assert.equal(preparePlayback(restored,provider).playbackURLs.length,2);
});
test('channel search matches punctuation, accents, compact numbers and Unicode names',()=>{
 const items=[{...channel,name:'BBC 1 HD'},{...channel,id:'2',name:'Café-News'},{...channel,id:'3',name:'বাংলা সংবাদ'}];
 const index=createSearchIndex(items);
 for (const q of ['BBC1','bbc 1','BBC-1']) assert.equal(searchIndex(index,q)[0].id,channel.id);
 assert.equal(searchIndex(index,'cafe news')[0].id,'2'); assert.equal(searchIndex(index,'বাংলা')[0].id,'3');
 assert.equal(searchIndex(index,'BBC1','All',['UK']).length,0);
});
test('live format preference roundtrips without invalidating existing profiles',()=>{
 const profile={id:'1',provider,createdAt:new Date().toISOString(),favorites:[]};
 assert.equal(validateVault({...emptyVault(),activeId:'1',profiles:[profile]}).profiles[0].liveFormat,undefined);
 assert.equal(validateVault({...emptyVault(),activeId:'1',profiles:[{...profile,liveFormat:'ts'}]}).profiles[0].liveFormat,'ts');
 assert.throws(()=>validateVault({...emptyVault(),activeId:'1',profiles:[{...profile,liveFormat:'bad'}]}));
});
test('Xtream API direct live source survives library parsing',async()=>{
 const original=global.fetch;
 global.fetch=async url=>new Response(JSON.stringify(String(url).includes('get_live_categories')?[]:[{stream_id:42,name:'Live',direct_source:'https://edge.example/direct.m3u8?token=test'}]));
 try {const [item]=await loadLibrary(provider,'live');assert.equal(item.url,'https://edge.example/direct.m3u8?token=test');}finally{global.fetch=original;}
});
test('continue-watching progress never produces a non-finite Yoga percentage',()=>{
 assert.equal(progressPercent(30, 120), 25);
 assert.equal(progressPercent(10, 0), 0);
 assert.equal(progressPercent(Number.NaN, 10), 0);
 assert.equal(progressPercent(5, Number.POSITIVE_INFINITY), 0);
});
test('theme sheets are plain enumerable objects',()=>{
 const theme = fs.readFileSync(new URL('../src/theme.tsx', import.meta.url), 'utf8');
 assert.equal(theme.includes('new Proxy'), false);
 assert.match(theme, /Object\.assign\(styles, next\)/);
});
test('iPhone startup does not evaluate crypto, file or document native modules',()=>{
 const family = fs.readFileSync(new URL('../src/FamilyControls.tsx', import.meta.url), 'utf8');
 const playlist = fs.readFileSync(new URL('../src/localPlaylist.ts', import.meta.url), 'utf8');
 assert.equal(family.includes("from 'expo-crypto'"), false);
 assert.match(family, /await import\('expo-crypto'\)/);
 assert.equal(playlist.includes("from 'expo-document-picker'"), false);
 assert.equal(playlist.includes("from 'expo-file-system'"), false);
 assert.match(playlist, /await import\('expo-document-picker'\)/);
 assert.match(playlist, /await import\('expo-file-system'\)/);
});
test('Picture in Picture stays off until requested and VLC rejects nil media',()=>{
 const player = fs.readFileSync(new URL('../src/Player.tsx', import.meta.url), 'utf8');
 assert.match(player, /allowPip = false/);
 assert.match(player, /allowsPictureInPicture=\{allowPip\}/);
 assert.equal(player.includes('isPictureInPictureSupported()'), false);
 const vlc = JSON.parse(fs.readFileSync(new URL('../node_modules/expo-libvlc-player/package.json', import.meta.url), 'utf8'));
 assert.equal(vlc.version, '58.0.4');
 const media = fs.readFileSync(new URL('../node_modules/expo-libvlc-player/ios/Player/MediaPlayer.swift', import.meta.url), 'utf8');
 assert.match(media, /guard let media = VLCMedia\(url: url\)/);
 assert.match(media, /mediaPlayer\?\.audio\?\.volume/);
 const video = fs.readFileSync(new URL('../node_modules/expo-video/ios/VideoView.swift', import.meta.url), 'utf8');
 assert.match(video, /session\.setCategory\(\.playback, mode: \.moviePlayback\)/);
});
test('iOS scene delegate plist uses the Objective-C class the app actually registers',()=>{
 const {useRegisteredSceneDelegate,SCENE_DELEGATE_CLASS}=require('../plugins/withIosSceneDelegate.js');
 const plist={UIApplicationSceneManifest:{UIApplicationSupportsMultipleScenes:false,UISceneConfigurations:{UIWindowSceneSessionRoleApplication:[{UISceneConfigurationName:'Default Configuration',UISceneDelegateClassName:'$(PRODUCT_MODULE_NAME).SceneDelegate'}]}}};
 const next=useRegisteredSceneDelegate(plist);
 assert.equal(next.UIApplicationSceneManifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication[0].UISceneDelegateClassName, SCENE_DELEGATE_CLASS);
 assert.equal(SCENE_DELEGATE_CLASS, 'SceneDelegate');
 assert.throws(()=>useRegisteredSceneDelegate({}));
 const app=JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
 assert.ok(app.expo.plugins.includes('./plugins/withIosSceneDelegate.js'));
});
test('app, package and displayed release history identify the same current version',()=>{
 assert.equal(releases[0].version,appVersion);
 assert.equal(JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url))).version,appVersion);
 assert.equal(JSON.parse(fs.readFileSync(new URL('../app.json',import.meta.url))).expo.version,appVersion);
});
import { RecoveryCoordinator } from '../src/recovery.ts';
test('default recovery timers retain the global receiver required by browser timer APIs',()=>{
 const originalSchedule=globalThis.setTimeout,originalCancel=globalThis.clearTimeout;
 let scheduled=false,cancelled=false;
 globalThis.setTimeout=function(){assert.equal(this,globalThis);scheduled=true;return 1;};
 globalThis.clearTimeout=function(){assert.equal(this,globalThis);cancelled=true;};
 try {const coordinator=new RecoveryCoordinator(async()=>{},()=>{});coordinator.request('network');coordinator.dispose();assert.ok(scheduled);assert.ok(cancelled);}
 finally {globalThis.setTimeout=originalSchedule;globalThis.clearTimeout=originalCancel;}
});
