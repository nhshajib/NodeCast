import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
const base = '81e9a002f9194d3d58a5fd3501f73fac152c0c2e';
const previous = path => process.env.NODECAST_BASELINE_DIR ? fs.readFileSync(`${process.env.NODECAST_BASELINE_DIR}/${path}`,'utf8') : execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8' });
function animationCalls(path, source) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), calls = [];
  function visit(node) {
    if (ts.isCallExpression(node) && /^(Animated\.(timing|spring|sequence|parallel|delay)|Easing\.)/.test(node.expression.getText(file))) calls.push(node.getText(file).replace(/\s+/g, ''));
    ts.forEachChild(node, visit);
  }
  visit(file); return calls;
}
for (const path of ['src/NavigationMotion.tsx','src/StartupSplash.tsx','src/PlaybackGlass.tsx','src/FocusPressable.tsx']) assert.deepEqual(animationCalls(path, fs.readFileSync(path, 'utf8')), animationCalls(path, previous(path)), `${path}: animation configuration changed`);
for (const file of ['provider','vault','catalog','xmltv','catchup','playbackPolicy','livePlayback','backupModel','backupTransaction','guideStore','libraryStore','recovery']) {
  const path = `src/${file}.ts`;
  assert.equal(fs.readFileSync(path,'utf8').replaceAll('GlowTV','NodeCast'),previous(path),`${path}: core logic changed`);
}
// The only non-copy provider edit is the Android native sheet-to-tab handoff.
// Restore that reviewed UI fix before comparing every other provider byte.
const androidHandoff = "  const goTab = useCallback((tab: string) => {\n    // One Android action finishes the sheet and selects its destination. A\n    // queued dismissAll + navigate can overwrite the first subsequent tab tap.\n    if (Platform.OS === 'android' && pagesRef.current.length && router.canDismiss()) router.dismissTo(`/${tab}` as never);\n    else { closeAll(); router.navigate(`/${tab}` as never); }\n  }, [closeAll]);";
const originalHandoff = "  const goTab = useCallback((tab: string) => { closeAll(); router.navigate(`/${tab}` as never); }, [closeAll]);";
const providerSource=fs.readFileSync('src/navigation/NodeCastProvider.tsx','utf8');
assert(providerSource.includes(androidHandoff),'Android sheet-to-tab handoff changed without review');
assert.equal(providerSource.replace(androidHandoff,originalHandoff).replaceAll('GlowTV','NodeCast').replaceAll('GLOWTV','NODECAST'), previous('src/navigation/NodeCastProvider.tsx'), 'Provider state changed beyond the display rebrand and reviewed Android route handoff');
function effects(path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),out=[];function visit(node){if(ts.isCallExpression(node)&&/^(React\.)?use(Layout)?Effect$/.test(node.expression.getText(file)))out.push(node.getText(file).replace(/\s+/g,''));ts.forEachChild(node,visit)}visit(file);return out;}
for(const path of ['src/Player.tsx','src/CompatibilityPlayer.tsx','src/BuiltInPlayer.tsx','src/NavigationMotion.tsx'])assert.deepEqual(effects(path,fs.readFileSync(path,'utf8')),effects(path,previous(path)),`${path}: existing lifecycle effects changed`);
console.log('Design safety checks passed: existing animation calls and core provider, storage-model and playback-policy modules unchanged.');
