import test from 'node:test';
import assert from 'node:assert/strict';
import {DAILY_STORIES,authoredDaily,dailyPhase,dailyObjects,dailyDialogue} from '../shared/dailyStories.js';
import {activityAt,DAILY_LIFE} from '../shared/dailyActivities.js';
import {advanceDailyCast,newDailyPerformance,meetingGoal,dailyPresentationMinute} from '../src/dailyStoryMotion.js';
import {canWalk,findWalkPath,WORLD_BUILDINGS} from '../src/worldData.js';
import {Store} from '../server/store.mjs';
import {DailyDirector} from '../server/dailyDirector.mjs';
import {IslandLife,newLife} from '../server/life.mjs';
import {speechLines,speechFrame} from '../src/speechBubbles.js';
const daily=id=>({schema:2,day:2,skeleton:id,phase:'prepare',clockMinutes:480,pack:authoredDaily(id),items:[],observed:[],accepted:false,completed:false,helped:false});
const cast=d=>Object.fromEntries(Object.keys(DAILY_LIFE[d.skeleton].activities).map(id=>{const b=WORLD_BUILDINGS.find(b=>b.id===id);return [id,{pose:{x:b.doorX,y:b.doorY+5,direction:'down'},atHome:false}]}));
function setup(id='sandmarks',minute=780){const store=new Store(':memory:'),director=new DailyDirector(store,{},'autonomy'),life=new IslandLife(store,director),s=newLife();s.narrative.prologue='complete';s.narrative.phase='day';s.narrative.number=2;s.minutes=minute;store.write('daily-packs','autonomy:2',{id:'autonomy:2',schema:2,skeleton:id,frozen:true,pack:authoredDaily(id),source:'authored'});director.sync(s);life.save('visitor:qa',s);return {store,director,life};}
const action=(f,body)=>{const d=f.life.read('visitor:qa').daily;return f.life.action('visitor:qa',{...body,day:d.day,version:d.version,requestId:crypto.randomUUID()});};
const near=(f,p)=>{const s=f.life.read('visitor:qa');s.narrative.position={...p,room:null};f.life.save('visitor:qa',s);};

test('every authored activity and spaced meeting has a reachable dry-land approach',()=>{
 for(const sk of DAILY_STORIES){const life=DAILY_LIFE[sk.id];for(const id of Object.keys(life.activities)){const b=WORLD_BUILDINGS.find(b=>b.id===id),from={x:b.doorX,y:b.doorY+5};for(const activity of life.activities[id]){const p=life.places[activity.place];assert.ok(canWalk(p.x,p.y),sk.id+':'+activity.place);assert.ok(findWalkPath(from,p).length);}}
 for(const e of life.encounters)for(const id of e.actors){const goal=meetingGoal(life,e,id);assert.ok(canWalk(goal.x,goal.y),sk.id+':'+e.id+':'+id);}}
});
test('unattended residents independently work, meet with alternating responses, depart and continue without any player task flags',()=>{
 for(const sk of DAILY_STORIES){const d=daily(sk.id),residents=cast(d),performance=newDailyPerformance(d),jobs=new Map(),speakers=new Map();
  for(let minute=480;minute<1080;minute+=.2){d.phase=dailyPhase(minute);const result=advanceDailyCast(d,residents,minute,.05,{performance});
   for(const [id,a]of Object.entries(result.actors)){assert.ok(canWalk(a.x,a.y));const history=jobs.get(id)||new Set();history.add(residents[id].dailyKey);jobs.set(id,history);if(a.speech){const e=lifeMeeting(d,minute,performance);if(e){const heard=speakers.get(e.id)||new Set();heard.add(id);speakers.set(e.id,heard);}assert.ok(!Object.values(result.actors).some(other=>other!==a&&other.speech),'one turn at a time');}}
  }
  for(const [id,history]of jobs)assert.ok(history.size>=5,sk.id+':'+id+' has independent jobs');
  for(const e of DAILY_LIFE[sk.id].encounters){assert.equal(performance.encounters[e.id]?.status,'finished',sk.id+':'+e.id);assert.equal(speakers.get(e.id)?.size,2,sk.id+':'+e.id+' has real responses');}
  assert.equal(d.accepted,false);assert.equal(d.completed,false);assert.equal(Object.keys(advanceDailyCast({...d,phase:'ended'},residents,1080,.05,{performance}).actors).length,0);
 }
});
function lifeMeeting(d,minute,p){return DAILY_LIFE[d.skeleton].encounters.find(e=>minute>=e.from&&minute<e.to&&p.encounters[e.id]?.status==='playing');}
test('a missed or blocked meeting expires, paused dialogue resumes, and refresh never replays a finished encounter',()=>{
 const d=daily('sandmarks'),residents=cast(d),performance=newDailyPerformance(d),e=DAILY_LIFE.sandmarks.encounters[0];
 for(const id of e.actors)residents[id].pose={...meetingGoal(DAILY_LIFE.sandmarks,e,id),direction:'down'};
 advanceDailyCast(d,residents,600,.05,{performance});assert.equal(performance.encounters[e.id].status,'playing');
 const before=structuredClone(residents);advanceDailyCast(d,residents,600,3,{paused:true,performance});assert.deepEqual(residents.curator.pose,before.curator.pose);
 advanceDailyCast(d,residents,637,.05,{performance});assert.equal(performance.encounters[e.id].status,'finished');
 const restored=newDailyPerformance({...d,performance});const result=advanceDailyCast(d,residents,638,.05,{performance:restored});assert.equal(result.actors.curator.where,'工坊门前');assert.equal(result.actors.specialist.where,'木桥南端');assert.ok(!result.actors.curator.speech);for(const minute of [654,656,664])assert.equal(advanceDailyCast(d,residents,minute,.05,{performance:restored}).actors.curator.where,'工坊门前');
 const unavailable=newDailyPerformance(d);advanceDailyCast(d,cast(d),600,.05,{performance:unavailable,unavailable:['curator']});advanceDailyCast(d,cast(d),656,.05,{performance:unavailable});assert.equal(unavailable.encounters[e.id].status,'missed');
});
test('cross-coast clue is available before hearing it and progress survives landing and later conversation',()=>{
 const f=setup(),sk=DAILY_STORIES.find(s=>s.id==='sandmarks'),shell=sk.objects.find(o=>o.kind==='shell');let s=f.life.read('visitor:qa');s.minutes=530;f.life.save('visitor:qa',s);f.director.sync(s);assert.ok(!dailyObjects(s.daily).some(o=>o.id===shell.id));s.minutes=550;f.director.sync(s);f.life.save('visitor:qa',s);
 assert.ok(dailyObjects(s.daily).some(o=>o.id===shell.id));assert.ok(Math.hypot(shell.x-810,shell.y-762)>500);assert.ok(findWalkPath({x:810,y:762},shell).length);
 near(f,shell);action(f,{action:'daily-observe',id:shell.id});const before=f.life.read('visitor:qa');const refreshed=f.life.action('visitor:qa',{action:'story-landing'}).life;assert.deepEqual(refreshed.daily.observed,before.daily.observed);assert.equal(refreshed.daily.accepted,true);assert.ok(dailyDialogue(refreshed.daily,'specialist').some(b=>b.text.includes('已经查过')));assert.ok(dailyDialogue(refreshed.daily,'specialist').some(b=>b.text.includes('北岸船台')));f.store.close();
});
test('helping at a moving resident changes only participation and reward, not the remaining timeline; old discussion spot cannot deliver',()=>{
 const f=setup(),sk=DAILY_STORIES.find(s=>s.id==='sandmarks');for(const o of sk.objects){near(f,o);action(f,{action:'daily-observe',id:o.id});}
 let s=f.life.read('visitor:qa');s.daily.actorPositions={specialist:{x:1200,y:285,atHome:false}};f.life.save('visitor:qa',s);near(f,{x:810,y:762});assert.throws(()=>action(f,{action:'daily-deliver',id:'specialist'}));
 near(f,{x:1200,y:291});s=f.life.read('visitor:qa');const schedule=activityAt(s.daily,'specialist'),priorMinute=s.minutes;const result=action(f,{action:'daily-deliver',id:'specialist'});assert.equal(result.life.minutes,priorMinute);assert.equal(result.life.daily.phase,'investigate');assert.deepEqual(activityAt(result.life.daily,'specialist'),schedule);assert.equal(result.life.materials,s.materials+4);assert.ok(dailyObjects(result.life.daily).every(o=>o.observed));assert.ok(!dailyDialogue(result.life.daily,'specialist').some(l=>/还没找到|谢谢/.test(l.text)));
 const repeated=action(f,{action:'daily-deliver',id:'specialist'});assert.equal(repeated.life.materials,result.life.materials);f.store.close();
});
test('current-day checkpoint survives refresh and ends held props without a duplicate resident pickup or new reward',()=>{
 const f=setup('glasses',640);near(f,{x:1110,y:745});action(f,{action:'daily-pickup',id:'glasses-sand'});let s=f.life.read('visitor:qa');s.minutes=650;f.director.sync(s);f.life.save('visitor:qa',s);
 f.life.action('visitor:qa',{action:'story-position',x:1110,y:745,room:null,daily:{day:2,positions:{curator:{x:947,y:381,direction:'left'}},performance:{encounters:{'road-argument':{status:'finished',startedAt:600,endedAt:636,turn:3}}}}});
 const restored=f.life.action('visitor:qa',{action:'story-landing'}).life;assert.equal(restored.daily.performance.encounters['road-argument'].status,'finished');assert.equal(restored.daily.actorPositions.curator.direction,'left');s=restored;s.minutes=1080;f.life.save('visitor:qa',s);const ended=f.life.action('visitor:qa',{action:'tick'}).life;assert.equal(ended.daily.resolution,'held-returned');assert.deepEqual(ended.daily.returnedIds,['glasses-sand']);assert.deepEqual(ended.daily.items,[]);assert.equal(ended.materials,restored.materials);assert.ok(!dailyDialogue(ended.daily,'curator')[0].text.includes('混子从沙堆找回'));f.store.close();
});
test('identity switch cannot expire morning meetings using a previous visitor evening clock',()=>{
 const d=daily('sandmarks'),performance=newDailyPerformance(d),residents=cast(d);
 assert.equal(dailyPresentationMinute(d,1020),485);advanceDailyCast(d,residents,dailyPresentationMinute(d,1020),.05,{performance});assert.deepEqual(performance.encounters,{});
 const f=setup('sandmarks',600);const s=f.life.read('visitor:qa');s.minutes=600;f.director.sync(s);f.life.save('visitor:qa',s);f.life.action('visitor:qa',{action:'story-position',x:810,y:762,room:null,daily:{day:2,performance:{encounters:{'south-north-clue':{status:'missed',endedAt:655}}}}});assert.equal(f.life.read('visitor:qa').daily.performance.encounters['south-north-clue'],undefined);f.store.close();
});
test('overheard speech wraps and stays inside the current camera rather than the whole map',()=>{
 const lines=speechLines('北岸船台右边，旧木桩靠海那侧，有一枚带齿贝壳。',s=>s.length*10,100);assert.ok(lines.length>1);assert.equal(lines.join(''),'北岸船台右边，旧木桩靠海那侧，有一枚带齿贝壳。');
 const camera={x:774,y:220};for(const a of [{x:792,y:762},{x:1270,y:285}]){const frame=speechFrame(a,camera,520,630,300,2);assert.ok(frame.left>=782);assert.ok(frame.left+frame.w<=1286);assert.ok(frame.top>=272);assert.ok(frame.top+frame.h<=808);assert.equal(frame.visible,true);}
 assert.equal(speechFrame({x:300,y:400},camera,520,630,100,1).visible,false);
});
test('a heartbeat correction just behind an interpolated meeting start cannot index a negative dialogue turn or stop the scene',()=>{
 const d=daily('sandmarks'),residents=cast(d),performance=newDailyPerformance(d),e=DAILY_LIFE.sandmarks.encounters[0];for(const id of e.actors)residents[id].pose={...meetingGoal(DAILY_LIFE.sandmarks,e,id),direction:'down'};
 advanceDailyCast(d,residents,601.5,.05,{performance});assert.equal(performance.encounters[e.id].status,'playing');assert.doesNotThrow(()=>advanceDailyCast(d,residents,600.2,.05,{performance}));assert.ok(advanceDailyCast(d,residents,600.2,.05,{performance}).actors.curator.speech);d.clockMinutes=600.2;assert.equal(dailyPresentationMinute(d,600.2,601.5),601.5);advanceDailyCast(d,residents,638,.05,{performance});assert.equal(performance.encounters[e.id].status,'finished');assert.equal(advanceDailyCast(d,residents,639,.05,{performance}).actors.curator.where,'工坊门前');
});
