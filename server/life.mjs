import {sceneObservation} from '../shared/sceneInteractions.js';
import {canPlaceDecoration} from '../src/worldData.js';
import {combatAction} from './residentCombat.mjs';
import {makeNarrative,nightPhase} from '../shared/fogStory.js';
import {migrateNarrative,advanceDirector,storyAction,checkDispel} from './fogDirector.mjs';
import {LIFE_RULES as R,LIFE_LAMPS,LIFE_PICKUPS,SHORE_TREASURES,DECORATIONS,PERSONALITIES,greatFogAt,visibleLampIds} from '../shared/lifeConfig.js';
import {fail} from './security.mjs';
import {dailySkeleton} from '../shared/dailyStories.js';
import {canWalk as canPlaceActor} from '../src/worldData.js';
import {DailyDirector} from './dailyDirector.mjs';
export function newLife(){return {narrative:makeNarrative(),dailyStart:2,version:3,minutes:1020,materials:R.initialMaterials,day:0,lamps:[],lampCycle:0,pickups:[],story:0,facility:'damaged',event:null,eventDays:[],repairs:0,protection:0,decoration:'flowers',owned:['flowers'],placements:[],npcStyles:{},receptionSeen:[],history:[],revision:0,lastTick:0};}
export class IslandLife{
 constructor(store,daily=new DailyDirector(store)){this.store=store;this.daily=daily;this.heartbeats=new Map();}
 read(key){const stored=this.store.read('life',key);if(!stored){const fresh=newLife();if(key.startsWith('owner')){fresh.narrative.prologue='complete';fresh.narrative.phase='day';fresh.narrative.known=Object.keys(PERSONALITIES);fresh.narrative.doors=['main','customs','archive','curator','liaison','specialist','gallery','meeting'];}return fresh;}migrateNarrative(stored,true);stored.dailyStart??=stored.narrative.number+1;stored.version=3;stored.placements??=[];if(stored.facility==='damaged'&&stored.event)stored.event.target='rack';if(stored.npcStyles&&Object.keys(stored.npcStyles).length){stored.legacyNpcStyles??=stored.npcStyles;stored.npcStyles={};}return stored;}
 save(key,s){s.revision++;this.store.write('life',key,s);return s;}
 action(key,body,{owner=false,dev=false,now=Date.now()}={}){return this.store.transaction(()=>{
  const s=this.read(key),a=body.action;let message='';
  if((s.boat?.journey||s.boat?.sailingFor||s.boat?.reservedFor)&&(a==='tick'||a.startsWith('story-')||a.startsWith('daily-')||a.startsWith('resident-')||a==='combat-rest'))return {life:s,message:''};
  const record=text=>{s.history=[...s.history.slice(-29),{day:s.day,text}];message=message?message+'\n'+text:text;};
  const combat=combatAction(s,body,{owner,dev,now});if(combat!==null)return {life:this.save(key,s),message:combat};
  const daily=this.daily.action(s,body);if(daily!==null)return {life:this.save(key,s),message:daily};
  const handled=storyAction(s,body,{owner,dev,now});
  if(handled!==null){if(a==='story-position')this.daily.checkpoint(s,body);this.daily.sync(s);if(['story-landing','story-next','story-sleep','story-ready','story-debug','story-replay'].includes(a))this.heartbeats.delete(key);return {life:this.save(key,s),message:handled};}
  if(a==='inspect-scene'){
   if(!['well','laundry'].includes(body.id))fail(400,'unknown_scene','这里没有可观察的东西。');
   s.sceneVisits??={};const key=body.id+':'+s.narrative.chapter;s.sceneVisits[key]=Math.min(4,(s.sceneVisits[key]||0)+1);message=sceneObservation(body.id,s.sceneVisits[key],s.narrative.chapter);
  }else if(a==='tick'){
   const previous=this.heartbeats.get(key),clients=new Map(previous?.clients||[]),client=typeof body.clockClient==='string'&&body.clockClient.length<=80?body.clockClient:'legacy';
   for(const [id,c] of clients)if(now-c.at>12000)clients.delete(id);clients.set(client,{at:now,active:body.active!==false,paused:!!body.paused});while(clients.size>16)clients.delete(clients.keys().next().value);
   const active=[...clients.values()].filter(c=>c.active),paused=!active.length||active.some(c=>c.paused),gap=previous?(now-previous.at)/1000:0,elapsed=gap>0&&gap<=12&&!previous.paused&&!paused?Math.min(8,gap):0;
   this.heartbeats.set(key,{at:now,paused,clients});s.lastTick=now;s.sharedClockPaused=paused;
   if(!['prologue','morning'].includes(s.narrative.phase))s.minutes+=elapsed*([1,2,4].includes(body.speed)?body.speed:1);
   advanceDirector(s);
   if(s.narrative.phase==='prologue')return {life:this.save(key,s),message};
   const day=Math.floor(s.minutes/1440);if(day!==s.day){s.day=day;s.pickups=[];}
   const cycle=Math.floor((s.minutes-360)/1440);if(cycle!==s.lampCycle){s.lampCycle=cycle;s.lamps=[];s.lampRewards=[];s.lampOff=[];}
   advanceDirector(s);
   const fog=s.narrative.phase==='fog';s.fogActive=fog;
  }else if(a==='lamp'){
   if(!LIFE_LAMPS.some(l=>l.id===body.id))fail(400,'unknown_lamp','路灯不存在。');
   if(!body.night)fail(400,'daylight','天还亮着，等夜晚再来拨灯吧。');
   const fog=s.narrative.phase==='fog'||body.weather==='fog';
   if(fog&&!s.fogActive)s.lamps=[];s.fogActive=fog;
   s.lampRewards??=[...s.lamps];
   if(!fog){s.lampOff??=[];if(s.lampOff.includes(body.id)){s.lampOff=s.lampOff.filter(id=>id!==body.id);message='你拨亮了路灯。';}else{s.lampOff.push(body.id);message='你熄灭了路灯。';}return {life:this.save(key,s),message};}
   if(s.lamps.includes(body.id)){s.lamps=s.lamps.filter(id=>id!==body.id);message='你熄灭了路灯，雾重新靠近这条小路。';}
   else{const reward=body.weather==='fog'&&!s.lampRewards.includes(body.id);s.lamps.push(body.id);if(reward){s.lampRewards.push(body.id);s.materials+=R.lampReward;}record(reward?'点亮一盏路灯，获得 1 份木料。':'亮了。至少这一小块地方归人管了。');if(s.event?.type==='monster'&&!s.event.driven){s.event.driven=true;s.lastDriveAt=Date.now();record('暖光让小怪物退回树林。受损处仍需要修理。');}}
  }else if(a==='treasure'){
   if(!SHORE_TREASURES.some(p=>p.id===body.id))fail(400,'unknown_treasure','这里没有宝物。');
   s.treasureFinds??=[];s.treasures??=0;const key=s.narrative.number+':'+body.id;
   if(s.treasureFinds.includes(key))message='这一天的宝物已经拾取。';else{s.treasureFinds.push(key);s.treasures++;s.materials+=2;record('发现一件海岸宝物，获得 2 份木料。累计宝物 '+s.treasures+' 件。');}
  }else if(a==='pickup'){
   if(!LIFE_PICKUPS.some(l=>l.id===body.id))fail(400,'unknown_pickup','这里没有木料。');
   if(!s.pickups.includes(body.id)){s.pickups.push(body.id);s.materials+=R.pickupReward;record('木料 +3 · 已收入背包');}else message='今天的木料已经拾取，下一游戏日还会出现。';
  }else if(a==='talk'){
   if(!Object.hasOwn(PERSONALITIES,body.id))fail(400,'unknown_resident','居民不存在。');
   if(s.story===0&&body.id==='customs'){s.story=1;record('海关居民：旧路灯能照出雾中的路。今晚一起点亮它们吧。');}
   else if(s.story===1&&s.lamps.length>=2&&body.id==='archive'){s.story=2;record('档案官找到了修缮图纸：花架曾经挂着一盏纪念灯。');if(s.facility==='healthy')this.event(s,'wind',record,false);}
   else if(s.story===2&&s.facility==='healthy'&&s.repairs>0&&body.id==='curator'){s.story=3;if(!s.owned.includes('fog-medal'))s.owned.push('fog-medal');s.materials+=3;record('策展人挂上了雾夜纪念灯。故事完成，获得纪念家装和 3 份木料。');}
   else message=s.story===1?'居民指了指路灯：夜雾中点亮两盏灯，再去问档案官。':s.story===2?'居民提醒：驱散小怪物、修好花架后，请策展人来挂灯。':'居民与你分享了今天的小镇见闻。';
  }else if(a==='drive'){
   if(s.event?.type==='monster'&&!s.event.driven){s.event.driven=true;s.lastDriveAt=Date.now();record('你拍了拍木板，小怪物抱着落叶跑回树林。');}else message='院落里已经没有小怪物。';
  }else if(a==='repair'){
   if(s.facility==='healthy')message='花架完好，不需要消耗材料。';
   else{if(s.event?.type==='monster'&&!s.event.driven)fail(400,'monster_present','小怪物还抱着花架的木条，先驱赶它再修复花架。');if(s.materials<R.repairCost)fail(400,'not_enough_materials','修复这座花架需要 4 份木料，岸边和树林可以拾取。');s.materials-=R.repairCost;s.facility='healthy';s.repairs++;s.lastRepairAt=now;s.lastRepairTarget='rack';s.event=null;record('广场花架修好了 · 木料 −4');}
  }else if(a==='upgrade'){
   if(!owner)fail(403,'owner_only','防护升级仅岛主可以操作。');if(s.protection>=2){message='主宅已经达到最高防护。';}else{const cost=R.upgradeCosts[s.protection];if(s.materials<cost)fail(400,'not_enough_materials',`需要 ${cost} 份木料，可免费探索拾取。`);s.materials-=cost;s.protection++;record(`主宅升至 ${s.protection} 级防护，消耗 ${cost} 份木料。`);}
  }else if(a==='place'){
   if(!s.owned.includes(body.id)||!DECORATIONS.some(d=>d.id===body.id))fail(400,'not_owned','这件物品还不在背包里。');
   if(!canPlaceDecoration(Math.round(body.x),Math.round(body.y),s.placements||[],body.id)||!Number.isFinite(body.x)||!Number.isFinite(body.y))fail(400,'invalid_placement','这里放不下，换一块空地吧。');
   s.placements=[...(s.placements||[]).filter(p=>p.id!==body.id),{id:body.id,x:Math.round(body.x),y:Math.round(body.y)}];record('已放好。');
  }else if(a==='unplace'){
   if(!(s.placements||[]).some(p=>p.id===body.id))fail(400,'not_placed','这件物品已经在背包里。');
   s.placements=s.placements.filter(p=>p.id!==body.id);record('已收回背包。');
  }else if(a==='craft'||a==='decorate'){
   const d=DECORATIONS.find(d=>d.id===body.id);if(!d)fail(400,'unknown_decor','家装不存在。');if(!s.owned.includes(d.id)){if(d.reward)fail(400,'story_locked','完成雾夜故事后获得纪念灯。');if(s.materials<R.decorCost)fail(400,'not_enough_materials','需要 3 份木料。');s.materials-=R.decorCost;s.owned.push(d.id);}if(a==='decorate')s.decoration=d.id;record(a==='craft'?`${d.name}已收入背包。`:`已摆放${d.name}。`);
  }else if(a==='style'){fail(403,'fixed_story_personality','故事居民的人格与名字由作者固定。');
  }else if(a==='reception'){
   if(typeof body.id!=='string'||body.id.length>120)fail(400,'invalid_reception','接待标识无效。');if(!s.receptionSeen.includes(body.id))s.receptionSeen=[...s.receptionSeen.slice(-49),body.id];
  }else if(a==='encounter'){
   if(s.event)message='花架旁的事件还在，先去处理它吧。';
   else if(s.eventDays.includes(s.day))message='今天的扰动已经体验过，下一游戏日再来看看。';
   else this.event(s,'monster',record);
  }else if(a==='event'){
   if(!dev||!owner)fail(403,'dev_only','事件触发只在开发环境提供给岛主。');if(!['wind','monster'].includes(body.type))fail(400,'invalid_event','事件不存在。');if(!s.event)this.event(s,body.type,record);
  }else fail(400,'invalid_life_action','玩法操作不存在。');
  this.daily.sync(s);
  const dispel=checkDispel(s);if(dispel)record(dispel);
  return {life:this.save(key,s),message};
 });}
 event(s,type,record,counts=true){if(counts){if(s.eventDays.includes(s.day))return;s.eventDays.push(s.day);}if(counts&&s.protection===2){record('主宅防护抵御了扰动，材料与设施没有损失。');return;}const target='rack';s.event={type,target,driven:false,startedAt:Date.now()};s.facility='damaged';const loss=!counts||s.protection===1?0:Math.min(R.loss,s.materials);s.materials-=loss;record(`广场西侧的花架被${type==='wind'?'阵风吹断':'小怪物撞坏'}，损失 ${loss} 份木料。走到花架前按 E，可用 4 份木料修复。`);}
}
