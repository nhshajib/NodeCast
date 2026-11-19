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
