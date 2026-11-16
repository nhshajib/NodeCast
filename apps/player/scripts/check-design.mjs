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
assert.equal(fs.readFileSync('src/navigation/NodeCastProvider.tsx','utf8').replaceAll('GlowTV','NodeCast').replaceAll('GLOWTV','NODECAST'), previous('src/navigation/NodeCastProvider.tsx'), 'Merged provider state and routes changed beyond the display rebrand');
function effects(path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),out=[];function visit(node){if(ts.isCallExpression(node)&&/^(React\.)?use(Layout)?Effect$/.test(node.expression.getText(file)))out.push(node.getText(file).replace(/\s+/g,''));ts.forEachChild(node,visit)}visit(file);return out;}
for(const path of ['src/Player.tsx','src/CompatibilityPlayer.tsx','src/BuiltInPlayer.tsx','src/NavigationMotion.tsx'])assert.deepEqual(effects(path,fs.readFileSync(path,'utf8')),effects(path,previous(path)),`${path}: existing lifecycle effects changed`);
console.log('Design safety checks passed: existing animation calls and core provider, storage-model and playback-policy modules unchanged.');
