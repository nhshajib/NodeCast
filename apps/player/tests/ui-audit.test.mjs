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
