const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict'),ts=require('../../apps/player/node_modules/typescript');
const root=require('node:path').resolve(__dirname,'../..'),base='5c1ce75',app=root+'/apps/player/';
const old=p=>cp.execFileSync('git',['show',base+':apps/player/'+p],{cwd:root,encoding:'utf8'});
// The 1.0.0 feature plan (docs/RELEASE-1.0.0.md) authorizes changes to the catalogue, provider, guide,
// storage, vault, backup and language-preference models; each is covered by its own regression tests.
// Playback policy, recovery, native playback and the backup transaction journal stay frozen.
// The 1.0.1 TV fix list (docs/TV-FIX-1.0.1.md, from real Fire TV testing) authorizes two recovery
// additions: 'missing' (HTTP 404/410) and 'stalled' (no first frame after 15 s) failure kinds with their
// messages, and a clearer 403 message that mentions region blocks. They are mapped back before comparing.
const reviewedRecovery=text=>text
 .replace("export type FailureKind = 'network' | 'format' | 'access' | 'missing' | 'server' | 'stalled' | 'unknown';","export type FailureKind = 'network' | 'format' | 'access' | 'server' | 'unknown';")
 .replace("  if (/\\b(404|410)\\b|not found/.test(value)) return 'missing';\n","")
 .replace("kind === 'access' || kind === 'missing' || kind === 'server' || kind === 'stalled' || attempts >= 2","kind === 'access' || kind === 'server' || attempts >= 2")
 .replace(/  : kind === 'access' \? 'Your provider refused this stream \(HTTP 403\)[^\n]*\n  : kind === 'missing' \? [^\n]*\n  : kind === 'stalled' \? [^\n]*\n/,"  : kind === 'access' ? 'Your provider refused this stream. Check your account or its simultaneous-stream limit.'\n");
for(const name of ['playbackPolicy','livePlayback','backupTransaction','recovery','nativePlayback'])assert.equal(name==='recovery'?reviewedRecovery(fs.readFileSync(app+'src/'+name+'.ts','utf8')):fs.readFileSync(app+'src/'+name+'.ts','utf8'),old('src/'+name+'.ts'),name);
function calls(path,source,pattern){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),out=[];function visit(n){if(ts.isCallExpression(n)&&pattern.test(n.expression.getText(file)))out.push(n.getText(file).replace(/\s+/g,''));ts.forEachChild(n,visit)}visit(file);return out}
// Owner supplied replacement launch videos (2026-11-25); StartupSplash alone is replaced.
// Screen transitions, control fades and all persistent playback effects remain protected.
for(const p of ['src/NavigationMotion.tsx','src/PlaybackGlass.tsx','src/FocusPressable.tsx'])assert.deepEqual(calls(p,fs.readFileSync(app+p,'utf8'),/^(Animated\.(timing|spring|sequence|parallel|delay)|Easing\.)/),calls(p,old(p),/^(Animated\.(timing|spring|sequence|parallel|delay)|Easing\.)/),p);
// 1.0.0 phase 5 (docs/RELEASE-1.0.0.md) authorizes exactly one change inside the native player's setup
// effect: audio/subtitle preferences use matchTrack (exact language variants). Those statements are
// mapped back to their 0.7.4 form before comparing, so any other lifecycle change still fails.
const reviewed=[
 [`const{track:match,notice}=features.playbackAssist?matchTrack(available,preferred):{track:available.find(track=>language(track.language||'')===language(preferred))||null,notice:available.length?'Yourpreferredaudioisnotreportedbythisstream.Youcanchooseanavailabletrack.':''};if(match)player.audioTrack=match;elseif(notice)setTrackNotice(notice);`,`constmatch=available.find(track=>language(track.language||'')===language(preferred));if(match)player.audioTrack=match;elseif(available.length)setTrackNotice('Yourpreferredaudioisnotreportedbythisstream.Youcanchooseanavailabletrack.');`],
 [`const{track:match,notice}=features.playbackAssist?matchTrack(available,preferred):{track:available.find(track=>language(track.language||'')===language(preferred))||null,notice:'Yourpreferredsubtitlesarenotavailableinthisstream.Youcanchooseanotheravailabletrack.'};if(match){player.subtitleTrack=match;setTrackNotice('');}elsesetTrackNotice(notice||'Yourpreferredsubtitlesarenotavailableinthisstream.Youcanchooseanotheravailabletrack.');`,`constmatch=available.find(track=>language(track.language||'')===language(preferred));if(match){player.subtitleTrack=match;setTrackNotice('');}elsesetTrackNotice('Yourpreferredsubtitlesarenotavailableinthisstream.Youcanchooseanotheravailabletrack.');`],
];
// 1.0.1 TV fix list: the VLC player arms a 15 s first-frame stall timer beside its existing network
// timer, clears it on unmount, and shows the controls when a stream fails or stalls (focus on Retry).
reviewed.push(['armTimeout();armStall();','armTimeout();'],['clearTimer();clearStall();coordinator.dispose();','clearTimer();coordinator.dispose();']);
const addedEffects=new Set(['useEffect(()=>{if(blocked)chrome.show();},[blocked])']);
const asReviewed=list=>list.filter(text=>!addedEffects.has(text)).map(text=>reviewed.reduce((value,[now,before])=>value.split(now).join(before),text));
for(const p of ['src/Player.tsx','src/CompatibilityPlayer.tsx','src/BuiltInPlayer.tsx','src/PlaybackChrome.tsx','src/NavigationMotion.tsx'])assert.deepEqual(asReviewed(calls(p,fs.readFileSync(app+p,'utf8'),/^(React\.)?use(Layout)?Effect$/)),calls(p,old(p),/^(React\.)?use(Layout)?Effect$/),p);
// Owner-requested category pins replace the retired connection route; all existing motion stays frozen.
for(const p of ['src/transitionConfig.ts','src/players.ts','src/episodes.ts'])assert.equal(p==='src/transitionConfig.ts'?fs.readFileSync(app+p,'utf8').replace("'favorite-categories': 'slide'","'home-ip': 'slide'"):fs.readFileSync(app+p,'utf8'),old(p),p);

for(const p of ['scripts/patch-android-vlc.cjs','scripts/patch-ios-playback.cjs'])assert.equal(fs.readFileSync(app+p,'utf8'),cp.execFileSync('git',['show','9c2c726:apps/player/'+p],{cwd:root,encoding:'utf8'}),p);
console.log('PASS: protected playback/transaction models, native engine patches and lifecycle effects; navigation and animation definitions preserved. Audit 0.7.3 authorizes TV focus/key UI and skipping the intro when data is ready.');
