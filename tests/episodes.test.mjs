import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playbackClock } from '../src/activity.ts';
import { followingEpisode } from '../src/episodes.ts';
const episode=(id,season=1)=>({id:`episode:${id}`,name:`Episode ${id}`,kind:'series',group:`Season ${season}`,url:`https://example.test/series/${id}.mp4`});
test('next episode uses provider order and nonconsecutive IDs across seasons',()=>{
 const first=episode(401), second=episode(905), third=episode(1002,2); const queue=[first,second,third];
 assert.equal(followingEpisode(queue,first),second);
 assert.equal(followingEpisode(queue,second),third);
 assert.equal(followingEpisode(queue,third),null);
});
test('next episode never invents an episode or jumps from an unrelated show, movie or live channel',()=>{
 const queue=[episode(401),episode(905)];
 assert.equal(followingEpisode(queue,episode(999)),null);
 assert.equal(followingEpisode(queue,{...queue[0],kind:'movies'}),null);
 assert.equal(followingEpisode(queue,{...queue[0],kind:'live'}),null);
 assert.equal(followingEpisode([],queue[0]),null);
});
test('next episode skips duplicate rows and missing or unsafe streams',()=>{
 const first=episode(401), last=episode(1002,2);
 const queue=[first,{...first},{...episode(402),url:undefined},{...episode(403),url:'javascript:bad'},last];
 assert.equal(followingEpisode(queue,first),last);
});

test('TV playback clock includes seconds and handles long or unknown durations',()=>{
 assert.equal(playbackClock(0),'0:00'); assert.equal(playbackClock(30),'0:30');
 assert.equal(playbackClock(3599),'59:59'); assert.equal(playbackClock(3661),'1:01:01');
 assert.equal(playbackClock(-1),'0:00'); assert.equal(playbackClock(Infinity),'0:00');
});
