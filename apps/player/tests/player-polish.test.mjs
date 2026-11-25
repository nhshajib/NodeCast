import test from 'node:test';
import assert from 'node:assert/strict';
import {adjacentChannel} from '../src/channelNavigation.ts';
import {createRankedSearch,rankedSearch,runQuery} from '../src/catalogQuery.ts';
import {recentChannelPicker,previousChannel} from '../src/playbackAssist.ts';
const channel=(id,name,group='News')=>({id,kind:'live',name,group});
test('channel navigation wraps within the supplied filtered list and has no single-channel action',()=>{
 const list=[channel('a','One'),channel('c','Three')];
 assert.equal(adjacentChannel(list,'c',1),list[0]);
 assert.equal(adjacentChannel(list,'a',-1),list[1]);
 assert.equal(adjacentChannel(list,'missing',1),list[0]);
 assert.equal(adjacentChannel(list,'missing',-1),list[1]);
 assert.equal(adjacentChannel([list[0]],'a',1),undefined);
 assert.equal(adjacentChannel([],'a',-1),undefined);
 assert.deepEqual(list.map(x=>x.id),['a','c']);
});
test('prepared search preserves ranking, category, hidden rules and provider/newest/alphabetical sort',()=>{
 const items=[channel('a','News extra'),channel('b','News'),channel('c','Newspaper','Sport'),channel('d','Café News','Hidden')].map((item,i)=>({...item,added:i+1}));
 const search=createRankedSearch(items);
 for(const query of ['','news','cafe','new s'])for(const group of ['All','News','Sport'])for(const hidden of [[],['Hidden']])for(const include of [false,true])for(const sort of ['provider','az','za','newest']){
  assert.deepEqual(search(query,group,hidden,include,sort),rankedSearch(items,query,group,hidden,include,sort));
 }
 assert.deepEqual(search('news').map(x=>x.id),['b','a','c','d']);
});
test('subsequent prepared queries reuse the catalogue snapshot without reading every source object again',()=>{
 let reads=0;
 const items=Array.from({length:1000},(_,i)=>({id:String(i),kind:'live',group:'News',get name(){reads++;return `Channel ${i}`;}}));
 const search=createRankedSearch(items),before=reads;
 search('channel 1');search('channel 12');search('channel 123');
 assert.equal(reads,before);
});
test('shared query normalization invalidates after a caller edits a row',()=>{
 const row={...channel('a','Before'),position:0};
 const query={profile:'p',section:'live',text:'before'};
 assert.equal(runQuery([row],query,'s').total,1);
 row.name='After';assert.equal(runQuery([row],query,'s').total,0);
 assert.equal(runQuery([row],{...query,text:'after'},'s').total,1);
});
test('single-pass recent channels matches previous-channel access policy, ordering and deduplication',()=>{
 const items=[channel('a','Current'),channel('b','Visible'),channel('c','Restricted','Adult'),channel('d','Hidden')];
 const history=['a','c','d','missing','b','b'].map((id,i)=>({item:items.find(x=>x.id===id)||channel(id,'Missing'),lastPlayedAt:new Date(100000-i*1000).toISOString()}));
 const options={restricted:['Adult'],hidden:['d']};
 assert.deepEqual(recentChannelPicker(history,'a',items,options).map(x=>x.id),['b']);
 assert.equal(recentChannelPicker(history,'a',items,options)[0],previousChannel(history,'a',items,options));
 assert.deepEqual(recentChannelPicker(history,'a',items,{...options,unlocked:true},1).map(x=>x.id),['c']);
 assert.deepEqual(recentChannelPicker(history,'a',items,options,0),[]);
});
