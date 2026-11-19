import test from 'node:test';
import assert from 'node:assert/strict';
import {orientationPolicy} from '../src/orientationPolicy.ts';
test('phone restores portrait, tablets unlock through rotation and narrow multitasking, TV stays landscape',()=>{
 assert.equal(orientationPolicy({width:393,height:852}),'portrait');
 assert.equal(orientationPolicy({width:852,height:393}),'portrait');
 assert.equal(orientationPolicy({width:1032,height:1376}),'unlocked');
 assert.equal(orientationPolicy({width:400,height:1000,tablet:true}),'unlocked');
 assert.equal(orientationPolicy({width:1920,height:1080,television:true}),'landscape');
});

import {messageLifetime,tvBackAction} from '../src/uiPolicy.ts';
test('info expires after four seconds; errors require explicit dismissal',()=>{
 assert.equal(messageLifetime({text:'Refreshing',tone:'info'}),4000);
 assert.equal(messageLifetime({text:'Failed to save',tone:'error'}),null);
 assert.equal(messageLifetime(null),null);
});
test('TV Back returns libraries to Home and requires two Home presses inside two seconds',()=>{
 assert.equal(tvBackAction({home:false,lastBack:100,now:300}),'home');
 assert.equal(tvBackAction({home:true,lastBack:null,now:300}),'warn');
 assert.equal(tvBackAction({home:true,lastBack:300,now:2300}),'exit');
 assert.equal(tvBackAction({home:true,lastBack:300,now:2301}),'warn');
});

import {plural} from '../src/formatting.ts';
import {providerFormProblem} from '../src/formValidation.ts';
test('count labels handle zero, one, many, irregular words and fractional counts',()=>{
 assert.equal(plural(0,'channel'),'0 channels');assert.equal(plural(1,'title'),'1 title');
 assert.equal(plural(2,'profile'),'2 profiles');assert.equal(plural(2,'category','categories'),'2 categories');
 assert.equal(plural(1.5,'title'),'1.5 titles');
});
test('provider form explains missing data, rejects unsupported URLs, and accepts each existing source',()=>{
 const form={kind:'xtream',name:'Home',address:'https://provider.example',username:'example',password:'example'};
 assert.equal(providerFormProblem(form,'xtream'),'');
 assert.match(providerFormProblem({...form,password:''},'xtream'),/password/);
 assert.match(providerFormProblem({...form,address:'file:///x'},'xtream'),/HTTP/);
 assert.equal(providerFormProblem({...form,kind:'m3u',username:'',password:''},'m3u'),'');
 assert.match(providerFormProblem(form,'file'),/Import/);
 assert.equal(providerFormProblem({...form,localText:'#EXTM3U'},'file'),'');
});

import {detailRoute} from '../src/detailRoute.ts';
test('restorable detail links use opaque IDs and valid catalogue sections, never a stream URL',()=>{
 assert.deepEqual(detailRoute('details','movies:42','movies'),{type:'details',id:'movies:42',section:'movies'});
 assert.deepEqual(detailRoute('series','series:2','series'),{type:'series',id:'series:2',section:'series'});
 assert.equal(detailRoute('series','series:2','movies'),null);
 assert.equal(detailRoute('provider','anything','live'),null);
 assert.equal(detailRoute('details','https://provider.example/secret','movies'),null);
 assert.equal(detailRoute('details','','live'),null);
});

import {libraryTabView} from '../src/uiPolicy.ts';
test('native library search and tab content share platform-specific view identities',()=>{
 assert.equal(libraryTabView('live',false),'live');
 assert.equal(libraryTabView('live',true),'watch');
 for(const android of [false,true]){
  assert.equal(libraryTabView('library',android),'library');
  assert.equal(libraryTabView('search',android),'search');
  assert.equal(libraryTabView('home',android),null);
 }
});
