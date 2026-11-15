import test from 'node:test';
import assert from 'node:assert/strict';
import {openGuestEntry,resumeOwnerEntry} from '../src/islandEntry.js';
import {IslandLife,newLife} from '../server/life.mjs';
import {Store} from '../server/store.mjs';
import {DailyDirector} from '../server/dailyDirector.mjs';
import {authoredDaily} from '../shared/dailyStories.js';
import {harness} from './helpers.mjs';

const finish=act=>{act({action:'story-escort'});act({action:'story-arrive',room:'main'});act({action:'story-inspect',id:'desk'});act({action:'story-leave'});return act({action:'story-ready'});};
test('every home opening uses the real visitor route even when owner auth and a saved voyage exist',async()=>{
 const h=await harness();try{
  await h.login();const owner=newLife();owner.materials=71;owner.narrative.prologue='complete';owner.narrative.phase='day';owner.narrative.number=8;owner.minutes=10800;owner.boat={stage:3,status:'ready',journey:{id:'saved-local-trip'}};h.app.store.write('life','owner',owner);
  const before=structuredClone(h.app.store.read('life','owner')),calls=[];
  const request=async(path,body)=>{calls.push(path);const r=await h.owner.request(path,{method:body===undefined?'GET':'POST',json:body});assert.equal(r.status,200,r.raw);return r.data;};
  let entry=await openGuestEntry(request);assert.equal(entry.life.narrative.prologue,'arrival');assert.equal(entry.life.minutes%1440,1020);assert.deepEqual(entry.life.narrative.position,{x:114,y:730.5,room:null});
  await request('/api/life/action?view=visitor',{action:'story-escort'});await request('/api/life/action?view=visitor',{action:'story-position',x:663,y:324,room:'main'});
  entry=await openGuestEntry(request);assert.equal(entry.life.narrative.prologue,'arrival');assert.equal(entry.life.narrative.position.room,null);assert.equal(entry.life.narrative.position.x,114);assert.deepEqual(h.app.store.read('life','owner'),before);
  assert.ok(!calls.some(p=>p.includes('view=owner')||p.includes('/api/owner/')||p.includes('/api/gatherings')));assert.equal((await h.owner.request('/api/owner/session')).data.authenticated,true);
  assert.equal(h.app.store.all('visits').length,1);assert.equal(h.app.store.all('jobs').length,0);
 }finally{await h.close()}
});

test('repeated arrivals clear prologue dialogue and stun, preserve one continuation and cannot farm resources',()=>{
 const store=new Store(':memory:'),life=new IslandLife(store),key='visitor:entry',act=b=>life.action(key,b).life,s=newLife();
 s.minutes=1305;s.materials=29;s.treasureFinds=['1:shore-pearl'];s.treasures=1;s.narrative.prologue='complete';s.narrative.phase='fog';s.narrative.night={token:'saved-night',started:1140,settled:false};s.narrative.position={x:485,y:446,room:'main'};s.narrative.known=['main','customs','archive'];s.narrative.doors=['main','archive'];s.narrative.health=0;s.narrative.downed={at:123,eventId:'old-stun'};s.narrative.dialogues={'arrival:customs':2,'warning:customs':3,'1:fog:archive':2};life.save(key,s);
 let arrival=act({action:'story-replay',restart:true});const back=structuredClone(arrival.narrative.replayReturn);assert.equal(arrival.narrative.health,100);assert.equal(arrival.narrative.downed,null);assert.equal(arrival.narrative.dialogues['arrival:customs'],undefined);assert.equal(arrival.narrative.dialogues['1:fog:archive'],2);
 act({action:'story-dialogue',id:'customs'});act({action:'story-escort'});arrival=act({action:'story-replay',restart:true});assert.equal(arrival.narrative.prologue,'arrival');assert.deepEqual(arrival.narrative.replayReturn,back);assert.equal(arrival.materials,29);
 const done=finish(act);assert.equal(done.narrative.phase,'fog');assert.equal(done.minutes,1305);assert.equal(done.narrative.night.token,'saved-night');assert.deepEqual(done.narrative.position,{x:485,y:446,room:'main'});assert.deepEqual(done.narrative.downed,s.narrative.downed);assert.equal(done.materials,29);assert.equal(done.treasures,1);assert.equal(act({action:'treasure',id:'shore-pearl'}).materials,29);store.close();
});

test('refreshing a first unfinished prologue starts at the boat and finishes into dusk without a bogus saved prologue',()=>{
 const store=new Store(':memory:'),life=new IslandLife(store),act=b=>life.action('visitor:new',b).life;
 act({action:'story-escort'});act({action:'story-arrive',room:'main'});const start=act({action:'story-replay',restart:true});assert.equal(start.narrative.prologue,'arrival');assert.equal(start.narrative.replayReturn,undefined);
 const done=finish(act);assert.equal(done.narrative.prologue,'complete');assert.equal(done.narrative.phase,'dusk');assert.equal(done.minutes,1080);store.close();
});

test('arrival suspends but does not erase today’s clues, performance, rewards, collections or boat',()=>{
 const store=new Store(':memory:'),director=new DailyDirector(store,{},'entry'),life=new IslandLife(store,director),s=newLife(),key='visitor:daily',act=b=>life.action(key,b).life;
 s.narrative.prologue='complete';s.narrative.phase='day';s.narrative.number=2;s.minutes=790;s.materials=48;s.owned=['flowers','bell'];s.placements=[{id:'flowers',x:600,y:650}];s.boat={stage:1,screws:2,status:'frame',claims:['2:screw-woods']};
 store.write('daily-packs','entry:2',{id:'entry:2',schema:2,skeleton:'sandmarks',frozen:true,pack:authoredDaily('sandmarks'),source:'authored'});director.sync(s);s.daily.observed=['sand-shell'];s.daily.accepted=true;s.daily.performance.encounters['south-north-clue']={status:'finished',endedAt:655};s.dailyRewards={'1':{wood:4,screws:0}};life.save(key,s);const before=life.read(key);
 for(let i=0;i<3;i++){const intro=act({action:'story-replay',restart:true});assert.deepEqual(intro.daily,before.daily);assert.deepEqual(intro.dailyRewards,before.dailyRewards);assert.deepEqual(intro.boat,before.boat);assert.equal(intro.materials,48);}
 const done=finish(act);assert.equal(done.minutes,790);assert.equal(done.narrative.phase,'day');assert.deepEqual(done.daily,before.daily);assert.deepEqual(done.owned,before.owned);assert.deepEqual(done.placements,before.placements);store.close();
});

test('a gathering invitation opens its own landing window without resetting the visitor or auto-resuming the owner',async()=>{
 const calls=[];const request=async(path,body)=>{calls.push({path,body});return path==='/api/visit'?{visit:{id:'registered',kind:'registered'}}:{projections:[]};};
 const entry=await openGuestEntry(request,{invite:'actual-room-token'});assert.equal(entry.panel,'gathering-join');assert.equal(entry.life,null);assert.ok(!calls.some(c=>c.path.includes('/api/life')||c.path.includes('owner')||c.path.includes('/api/gatherings')));
});

test('owner journey recovery requires an explicit login path and keeps active formal or local journeys',async()=>{
 const calls=[],storage={getItem:()=>null,removeItem:()=>assert.fail('no entry to remove')};
 const formal={room:{id:'saved-room',status:'active'}};
 let result=await resumeOwnerEntry(async path=>{calls.push(path);return formal;},storage);assert.deepEqual(result,{formal});assert.deepEqual(calls,['/api/gatherings?view=owner']);
 const voyage={boat:{journey:{id:'saved-voyage'}}};result=await resumeOwnerEntry(async path=>path.startsWith('/api/gatherings')?{room:null}:voyage,storage);assert.deepEqual(result,{voyage});
});

test('visitor arrival cannot reset an owner’s real inventory or story state',()=>{
 const store=new Store(':memory:'),life=new IslandLife(store),s=newLife();s.narrative.prologue='complete';s.materials=55;life.save('owner',s);const before=store.read('life','owner');
 assert.throws(()=>life.action('owner',{action:'story-replay',restart:true},{owner:true}),e=>e.code==='visitor_entry_only');assert.deepEqual(store.read('life','owner'),before);store.close();
});
