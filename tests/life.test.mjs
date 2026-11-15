import test from 'node:test';
import assert from 'node:assert/strict';
import {Store} from '../server/store.mjs';
import {greatFogAt,visibleLampIds} from '../shared/lifeConfig.js';
import {IslandLife} from '../server/life.mjs';
import {runIndustryDemo} from '../shared/industries.js';
import {harness} from './helpers.mjs';
function setup(){const store=new Store(':memory:');return {store,life:new IslandLife(store)}}
test('anonymous story, rewards and repair form a complete idempotent loop',()=>{
 const{store,life}=setup(),key='visitor:test',act=body=>life.action(key,body).life;
 act({action:'talk',id:'customs'});const first=act({action:'lamp',id:'lamp-dock',night:true,weather:'fog'});assert.equal(first.materials,13);
 assert.equal(act({action:'lamp',id:'lamp-dock',night:true,weather:'fog'}).materials,13);act({action:'lamp',id:'lamp-dock',night:true,weather:'fog'});
 act({action:'lamp',id:'lamp-square',night:true,weather:'fog'});const damaged=act({action:'talk',id:'archive'});assert.equal(damaged.story,2);assert.equal(damaged.facility,'damaged');
 const repaired=act({action:'repair'});assert.equal(repaired.materials,10);assert.equal(act({action:'repair'}).materials,10);
 const complete=act({action:'talk',id:'curator'});assert.equal(complete.story,3);assert.ok(complete.owned.includes('fog-medal'));assert.equal(complete.materials,13);assert.equal(act({action:'talk',id:'curator'}).materials,13);
 assert.equal(life.read('owner').materials,12);store.close();
});
test('prologue pauses clock and has no offline catch-up or daylight attacks',()=>{const {store,life}=setup();let now=100000;const a=b=>life.action('visitor:paused',b,{now}).life;let s=a({action:'tick',speed:4});now+=8000;s=a({action:'tick',speed:4});assert.equal(s.minutes,1020);assert.equal(s.materials,12);assert.equal(s.event,null);const later=new IslandLife(store).action('visitor:paused',{action:'tick',speed:4},{now:now+86400000}).life;assert.equal(later.minutes,s.minutes);store.close();});
test('insufficient resources have free recovery, monster requires driving, decoration costs once',()=>{
 const{store,life}=setup(),s=life.read('owner');s.materials=0;s.facility='damaged';s.event={type:'monster',driven:false};life.save('owner',s);
 assert.throws(()=>life.action('owner',{action:'repair'},{owner:true}));life.action('owner',{action:'drive'},{owner:true});assert.throws(()=>life.action('owner',{action:'repair'},{owner:true}));
 for(const id of ['wood-shore','wood-woods'])life.action('owner',{action:'pickup',id},{owner:true});life.action('owner',{action:'repair'},{owner:true});assert.equal(life.read('owner').materials,2);
 life.action('owner',{action:'pickup',id:'wood-garden'},{owner:true});life.action('owner',{action:'decorate',id:'windbell'},{owner:true});assert.equal(life.read('owner').materials,2);life.action('owner',{action:'decorate',id:'windbell'},{owner:true});assert.equal(life.read('owner').materials,2);store.close();
});
test('industry configuration switches with explicit demo identity and rejects invented skills',()=>{
 const fashion=runIndustryDemo('fashion',['outfit','palette'],{scene:'周末出游',preference:'自然舒适',branch:'细节'}),edu=runIndustryDemo('education',['plan'],{scene:'入门探索',preference:'循序渐进',branch:'整体'});
 assert.equal(fashion.mode,'demo');assert.match(fashion.identity,/预设/);assert.notDeepEqual(fashion.result,edu.result);assert.match(edu.explanation,/未调用模型/);assert.throws(()=>runIndustryDemo('fashion',['exec'],fashion.input));
});
test('HTTP authorization isolates visitors and owner, demo outputs never create AI jobs',async()=>{
 const h=await harness();try{const{guest}=await h.visitor();assert.equal((await guest.request('/api/life?view=owner')).status,401);
 assert.equal((await guest.request('/api/life/action?view=visitor',{method:'POST',json:{action:'upgrade'}})).status,403);
 await h.login();await h.owner.request('/api/life/action?view=owner',{method:'POST',json:{action:'pickup',id:'wood-shore'}});
 const own=(await h.owner.request('/api/life?view=owner')).data.life;assert.equal(own.materials,15);
 await guest.request('/api/life/action?view=visitor',{method:'POST',json:{action:'pickup',id:'wood-shore'}});assert.equal((await h.owner.request('/api/life?view=owner')).data.life.materials,15);
 const result=await guest.request('/api/industry/demo?view=visitor',{method:'POST',json:{industryId:'fashion',skills:['outfit'],input:{scene:'日常通勤',preference:'利落简洁',branch:'整体'}}});assert.equal(result.status,200);assert.equal(result.data.result.mode,'demo');assert.equal(h.app.store.all('jobs').length,0);
 assert.equal((await h.owner.request('/api/industry/results?view=owner')).data.results.length,0);
 assert.equal((await guest.request('/api/owner/work-log')).status,401);assert.equal((await h.owner.request('/api/owner/work-log')).status,200);
 assert.ok(!(await guest.request('/api/updates')).data.entries[0].privateNotes);assert.equal((await guest.request('/api/life/action?view=visitor',{method:'POST',json:{action:'event',type:'wind'}})).status,403);
 }finally{await h.close()}
});

test('first and second protection levels change event consequences',()=>{
 const{store,life}=setup();let s=life.read('owner');s.materials=40;life.save('owner',s);
 life.action('owner',{action:'upgrade'},{owner:true});s=life.action('owner',{action:'event',type:'wind'},{owner:true,dev:true}).life;assert.equal(s.facility,'damaged');assert.equal(s.materials,32);
 life.action('owner',{action:'repair'},{owner:true});life.action('owner',{action:'upgrade'},{owner:true});s=life.read('owner');s.day=1;life.save('owner',s);s=life.action('owner',{action:'event',type:'monster'},{owner:true,dev:true}).life;assert.equal(s.facility,'healthy');assert.equal(s.materials,12);store.close();
});
test('lamps persist on refresh, reset at dawn, and no offline gap triggers a loss',()=>{
 const{store,life}=setup();life.action('owner',{action:'lamp',id:'lamp-dock',night:true,weather:'fog'},{owner:true});assert.ok(new IslandLife(store).read('owner').lamps.includes('lamp-dock'));
 life.action('owner',{action:'tick'},{owner:true,now:100000});const before=life.read('owner').minutes;const paused=life.action('owner',{action:'tick'},{owner:true,now:1000000}).life;assert.equal(paused.minutes,before);
 const s=life.read('owner');s.narrative.prologue='complete';s.narrative.phase='day';s.minutes=1799;life.save('owner',s);life.action('owner',{action:'tick'},{owner:true,now:1004000});assert.equal(life.read('owner').lamps.length,0);store.close();
});
test('owner reception metadata follows actual queue states and stays private',async()=>{
 const h=await harness({withProviders:true});try{const {guest}=await h.visitor();const r=await guest.request('/api/visit/register',{method:'POST',json:{name:'TEST FIXTURE arrival',background:'Synthetic authorized visitor',purpose:'Reception verification',text:'TEST FIXTURE supplied material',consent:true}});assert.equal(r.status,200);await h.login();
 const queued=(await h.owner.request('/api/world')).data;assert.equal(queued.receptionWork.length,4);assert.ok(queued.receptionWork.every(j=>j.status==='queued'));assert.ok(queued.projections.some(p=>p.name==='TEST FIXTURE arrival'));assert.equal((await guest.request('/api/world?view=visitor')).data.receptionWork.length,0);
 await h.app.runQueue();const delivered=(await h.owner.request('/api/world')).data;assert.ok(delivered.receptionWork.some(j=>j.status==='succeeded'));assert.ok(delivered.receptionWork.every(j=>!j.sources&&!j.text));
 }finally{await h.close()}
});

test('explicit monster encounter stays scoped and consumes the same daily event allowance',()=>{
 const {store,life}=setup(),key='visitor:encounter';
 const first=life.action(key,{action:'encounter'}).life;assert.equal(first.event.type,'monster');assert.equal(first.materials,10);assert.equal(life.read('owner').materials,12);
 assert.equal(life.action(key,{action:'encounter'}).life.materials,10);
 life.action(key,{action:'drive'});life.action(key,{action:'repair'});
 const again=life.action(key,{action:'encounter'}).life;assert.equal(again.event,null);assert.equal(again.materials,6);store.close();
});

test('visitor daylight no longer triggers independent attacks',()=>{const {store,life}=setup();let now=100000;const initial=life.read('owner').facility;const s=life.action('visitor:day',{action:'tick',speed:4},{now}).life;assert.equal(s.event,null);assert.equal(life.read('owner').facility,initial);store.close();});
test('great fog cycle and night-only lamp toggles cannot repeat rewards',()=>{
 assert.equal(greatFogAt(980).active,false);assert.equal(greatFogAt(1080).warning,true);assert.equal(greatFogAt(1140).active,true);assert.equal(greatFogAt(1500).active,true);assert.equal(greatFogAt(1800).active,false);assert.equal(greatFogAt(2580).active,true);
 const {store,life}=setup(),key='visitor:lamp';assert.throws(()=>life.action(key,{action:'lamp',id:'lamp-dock'}));
 const act=()=>life.action(key,{action:'lamp',id:'lamp-dock',night:true,weather:'fog'}).life;
 let s=act();assert.ok(s.lamps.includes('lamp-dock'));assert.equal(s.materials,13);s=act();assert.equal(s.lamps.length,0);s=act();assert.equal(s.materials,13);assert.ok(s.lamps.includes('lamp-dock'));store.close();
});

test('lamps are dark by day, automatic on ordinary nights, and fail when fog arrives',()=>{
 assert.deepEqual(visibleLampIds({lamps:['lamp-dock']},false,true),[]);assert.equal(visibleLampIds({},true,false).length,4);assert.deepEqual(visibleLampIds({fogActive:false,lamps:['lamp-dock']},true,true),[]);
 const {store,life}=setup(),key='visitor:light';let s=life.read(key);s.lamps=['lamp-dock'];s.minutes=1140;s.narrative.prologue='complete';s.narrative.phase='dusk';life.save(key,s);s=life.action(key,{action:'tick',weather:'fog'}).life;assert.equal(s.lamps.length,0);s=life.action(key,{action:'lamp',id:'lamp-dock',night:true,weather:'fog'}).life;assert.deepEqual(visibleLampIds(s,true,true),['lamp-dock']);assert.deepEqual(visibleLampIds(s,false,true),[]);store.close();
});

test('backpack placements persist, reject water and doors, and return without duplicate resources',()=>{
 const {store,life}=setup(),key='visitor:bag',act=b=>life.action(key,b).life;
 const first=act({action:'pickup',id:'wood-woods'});assert.equal(first.materials,15);
 assert.equal(act({action:'pickup',id:'wood-woods'}).materials,15);
 assert.throws(()=>act({action:'place',id:'windbell',x:800,y:460}));
 const made=act({action:'craft',id:'windbell'});assert.equal(made.materials,12);
 assert.equal(act({action:'craft',id:'windbell'}).materials,12);
 assert.throws(()=>act({action:'place',id:'windbell',x:0,y:0}));
 assert.throws(()=>act({action:'place',id:'windbell',x:1184,y:264}));
 const placed=act({action:'place',id:'windbell',x:800,y:460});assert.equal(placed.placements.length,1);assert.equal(placed.materials,12);
 assert.equal(new IslandLife(store).read(key).placements[0].x,800);
 assert.throws(()=>act({action:'place',id:'flowers',x:800,y:460}));
 assert.deepEqual(life.read('owner').placements,[]);
 assert.equal(act({action:'unplace',id:'windbell'}).placements.length,0);
 assert.equal(life.read(key).materials,12);assert.ok(life.read(key).owned.includes('windbell'));
 assert.throws(()=>act({action:'unplace',id:'windbell'}));store.close();
});

test('flower rack repair costs four once and does not heal unrelated residents',()=>{
 const {store,life}=setup(),key='visitor:rack';let s=life.read(key);assert.equal(s.facility,'damaged');s.narrative.damage=[{id:'archive',night:1}];s.narrative.injuries=['archive'];life.save(key,s);
 const repaired=life.action(key,{action:'repair'},{now:123456}).life;assert.equal(repaired.materials,8);assert.equal(repaired.facility,'healthy');assert.equal(repaired.lastRepairTarget,'rack');assert.equal(repaired.lastRepairAt,123456);assert.deepEqual(repaired.narrative.injuries,['archive']);assert.equal(life.action(key,{action:'repair'}).life.materials,8);store.close();
});
test('well and laundry observations advance separately and persist without inventory costs',()=>{
 const {store,life}=setup(),key='visitor:scene';const first=life.action(key,{action:'inspect-scene',id:'well'}),second=life.action(key,{action:'inspect-scene',id:'well'});assert.notEqual(first.message,second.message);assert.equal(second.life.materials,12);assert.equal(new IslandLife(store).read(key).sceneVisits['well:antler'],2);
 const laundry=life.action(key,{action:'inspect-scene',id:'laundry'});assert.equal(laundry.life.sceneVisits['laundry:antler'],1);assert.equal(life.read('owner').sceneVisits,undefined);assert.throws(()=>life.action(key,{action:'inspect-scene',id:'unknown'}));store.close();
});
