const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict'),ts=require('../../apps/player/node_modules/typescript');
const root=require('node:path').resolve(__dirname,'../..'),base='5c1ce75',app=root+'/apps/player/';
const old=p=>cp.execFileSync('git',['show',base+':apps/player/'+p],{cwd:root,encoding:'utf8'});
for(const name of ['provider','vault','catalog','xmltv','catchup','playbackPolicy','livePlayback','backupModel','backupTransaction','guideStore','libraryStore','recovery','storage','nativePlayback','viewingPreferences'])assert.equal(fs.readFileSync(app+'src/'+name+'.ts','utf8'),old('src/'+name+'.ts'),name);
function calls(path,source,pattern){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),out=[];function visit(n){if(ts.isCallExpression(n)&&pattern.test(n.expression.getText(file)))out.push(n.getText(file).replace(/\s+/g,''));ts.forEachChild(n,visit)}visit(file);return out}
for(const p of ['src/NavigationMotion.tsx','src/StartupSplash.tsx','src/PlaybackGlass.tsx','src/FocusPressable.tsx'])assert.deepEqual(calls(p,fs.readFileSync(app+p,'utf8'),/^(Animated\.(timing|spring|sequence|parallel|delay)|Easing\.)/),calls(p,old(p),/^(Animated\.(timing|spring|sequence|parallel|delay)|Easing\.)/),p);
for(const p of ['src/Player.tsx','src/CompatibilityPlayer.tsx','src/BuiltInPlayer.tsx','src/PlaybackChrome.tsx','src/NavigationMotion.tsx'])assert.deepEqual(calls(p,fs.readFileSync(app+p,'utf8'),/^(React\.)?use(Layout)?Effect$/),calls(p,old(p),/^(React\.)?use(Layout)?Effect$/),p);
for(const p of ['src/transitionConfig.ts','src/players.ts','src/episodes.ts'])assert.equal(fs.readFileSync(app+p,'utf8'),old(p),p);

for(const p of ['scripts/patch-android-vlc.cjs','scripts/patch-ios-playback.cjs'])assert.equal(fs.readFileSync(app+p,'utf8'),cp.execFileSync('git',['show','9c2c726:apps/player/'+p],{cwd:root,encoding:'utf8'}),p);
console.log('PASS: protected models, native engine patches and lifecycle effects; navigation and animation definitions preserved. Audit 0.7.3 authorizes TV focus/key UI and skipping the intro when data is ready.');
