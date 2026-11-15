import {STORY_RESIDENTS} from '../shared/storyResidents.js';
import {CHAPTERS,makeNarrative,chapterFor,nightPhase,selectNextChapter} from '../shared/fogStory.js';
import {LIFE_LAMPS} from '../shared/lifeConfig.js';
import {fail} from './security.mjs';
export function migrateNarrative(s,old=false){s.narrative??=makeNarrative(s.minutes,old);const n=s.narrative;if(n.night&&!n.night.token)n.night.token=n.number+':legacy:'+n.night.chapter+':'+n.night.started;s.version=Math.max(2,s.version||1);return n;}
function beginNight(s){const n=s.narrative;n.phase='fog';s.fogActive=true;s.lamps=[];s.lampOff=[];s.lampRewards=[];n.playerHits=0;n.night={id:n.number,chapter:n.chapter,dispelled:false,seen:false,settled:false,started:s.minutes,token:n.number+':'+Date.now()};}
export function settleNight(s){const n=s.narrative,night=n.night;if(!night||night.settled)return;night.settled=true;const c=chapterFor(n),lamps=[...s.lamps],outcome=night.dispelled?'all':lamps.length?'partial':'shelter';const targets=[{id:'archive',lamp:'lamp-woods'},{id:'customs',lamp:'lamp-dock'},{id:'curator',lamp:'lamp-garden'},{id:'main',lamp:'lamp-square'}];const harmed=outcome==='all'?[]:targets.filter(t=>!lamps.includes(t.lamp)&&!(t.id==='main'&&s.protection>=2)).map(t=>t.id);for(const id of harmed){if(!n.damage.some(d=>d.id===id))n.damage.push({id,night:n.number});if(!n.injuries.includes(id))n.injuries.push(id);}if(harmed.length){s.facility='damaged';s.event={type:'aftermath',target:'rack',driven:true};}if(night.seen){const item=n.collection[c.id];item.ready=true;if(night.dispelled)item.dispelled=true;}else if(!n.rumors.some(r=>r.id===c.id))n.rumors.push({id:c.id,day:n.number});if(!n.clues.includes(c.clue))n.clues.push(c.clue);if(!n.clues.includes('湿脚印穿过了安全灯区。'))n.clues.push('湿脚印穿过了安全灯区。');const loss=harmed.length&&s.protection===0?Math.min(2,s.materials):0;s.materials-=loss;
 n.results.push({loss,number:n.number,chapter:c.id,outcome,lamps,harmed,seen:night.seen});n.results=n.results.slice(-30);n.phase='morning';n.prologue='complete';s.minutes=Math.floor(s.minutes/1440)*1440+360;if(s.minutes<night.started)s.minutes+=1440;s.fogActive=false;s.lamps=[];}
export function advanceDirector(s){const n=s.narrative;if(['prologue','morning'].includes(n.phase))return;const phase=nightPhase(s.minutes);if(phase==='fog'&&!n.night)beginNight(s);if(n.night&&!n.night.settled&&phase==='day'&&((s.minutes%1440)+1440)%1440<1020)settleNight(s);else if(n.phase!=='morning')n.phase=phase;}
export function storyAction(s,b,{owner,dev,now}){const n=s.narrative,c=chapterFor(n);let message='';
 switch(b.action){
 case 'story-landing':{
   // Refresh restores this session, including an unfinished night or morning settlement.
   if(!n.position)n.position={x:114,y:730.5,room:null};
   n.restoreTag=(n.restoreTag||0)+1;break;
 }
 case 'story-dialogue':{if(!['main','customs','archive','curator','liaison','specialist','wanderer'].includes(b.id))fail(400,'resident','居民不存在');if(!n.known.includes(b.id))n.known.push(b.id);if(n.prologue==='complete'&&!n.doors.includes(b.id))n.doors.push(b.id);const key=n.prologue==='complete'?n.number+':'+n.phase+':'+b.id:n.prologue+':'+b.id;n.dialogues[key]=Math.min(5,(n.dialogues[key]||0)+1);break;}
 case 'story-escort':if(n.prologue==='arrival'){n.prologue='escort';if(!n.doors.includes('main'))n.doors.push('main');}break;
 case 'story-arrive':if(n.prologue==='escort'&&b.room==='main'){n.prologue='house';}break;
 case 'story-inspect':if(b.id==='trace'){if(!n.clues.includes(c.sign))n.clues.push(c.sign);message=c.sign;break;}if(n.prologue==='house'){n.prologue='houseReady';}if(b.id==='desk'){n.known=Array.from(new Set([...n.known,'main','customs','archive','curator','liaison','specialist']));n.doors=Array.from(new Set([...n.doors,'main','customs','archive','curator','liaison','specialist']));}message=b.id==='window'?'窗外四盏旧灯还没亮，码头的人正在收绳。':'公开档案介绍了居民与他们整理资料的本领。私人工作记录锁在另一层抽屉里。';break;
 case 'story-leave':if(n.prologue==='houseReady')n.prologue='warning';break;
 case 'story-ready':if(n.prologue==='warning'){n.prologue='complete';if(n.replayReturn){const back=n.replayReturn;n.phase=back.phase;s.minutes=back.minutes;n.night=back.night;n.position=back.position;s.fogActive=n.phase==='fog';n.known=back.known;n.doors=back.doors;for(const k of ['health','downed','combat'])if(Object.hasOwn(back,k))n[k]=back[k];n.restoreTag=(n.restoreTag||0)+1;delete n.replayReturn;}else{n.phase='dusk';s.minutes=Math.floor(s.minutes/1440)*1440+1080;}}break;
 case 'story-sleep':if(b.room!=='main'||n.phase!=='fog')fail(400,'shelter','雾夜回主宅后才可以等到清晨。');settleNight(s);message='你在屋内等到了清晨。门外留下了昨夜的痕迹。';break;
 case 'story-next':if(n.phase!=='morning')fail(400,'morning','先看看清晨留下的东西。');{const next=selectNextChapter(n);n.number++;n.chapter=next.id;if(!n.used.includes(next.id))n.used.push(next.id);n.night=null;n.phase='day';n.dialogues={};n.playerHits=0;s.minutes=Math.floor(s.minutes/1440)*1440+480;s.pickups=[];message=next.sign;}break;
 case 'story-replay':{
  if(b.restart&&owner)fail(403,'visitor_entry_only','刷新序章入口只用于游客，不重置岛主存档。');
  if(!b.restart&&n.prologue!=='complete'){message='你正在序章中，跟着守码头的人继续走就好。';break;}
  if(n.prologue==='complete'&&!n.replayReturn)n.replayReturn={phase:n.phase,minutes:s.minutes,night:n.night,position:n.position,known:[...n.known],doors:[...n.doors],health:n.health,downed:n.downed,combat:n.combat};
  n.replay=(n.replay||0)+1;n.prologue='arrival';n.phase='prologue';n.known=['customs'];n.doors=['main'];n.night=null;s.fogActive=false;s.minutes=Math.floor(s.minutes/1440)*1440+1020;
  if(b.restart){
   n.position={x:114,y:730.5,room:null};n.restoreTag=(n.restoreTag||0)+1;
   n.dialogues=Object.fromEntries(Object.entries(n.dialogues).filter(([key])=>!['arrival','escort','house','houseReady','warning'].includes(key.split(':')[0])));
   n.health=100;n.downed=null;n.combat={events:[],lastStrike:0,seen:[],recent:{},protectUntil:0};
  }
  message='序章重新开始，已有资料、收藏和资源保留。';break;
 }
 case 'story-museum-open':{const ready=(n.pendingExhibits||[]).filter(id=>n.collection[id]?.ready);if(ready.length){n.lastRevealAt=now;n.pendingExhibits=n.pendingExhibits.filter(id=>!ready.includes(id));message='居民为昨夜的轮廓摆好了展柜，轻轻揭开了罩布。';}}break;
 case 'story-day-seen':if(n.phase==='day'){n.dayHeard??=[];if(!n.dayHeard.includes(c.id))n.dayHeard.push(c.id);}break;
 case 'story-seen':if(n.phase==='fog'&&n.night&&!n.night.dispelled){n.night.seen=true;const fresh=!n.collection[c.id];n.collection[c.id]??={day:n.number,dispelled:false,ready:false};if(fresh){n.pendingExhibits??=[];n.pendingExhibits.push(c.id);}}break;
 case 'story-repel':if(n.phase==='fog'&&n.night?.seen){n.night.lampRepelled=true;n.collection[c.id].lampKnown=true;}break;
 case 'story-hit':if(!n.downed&&now>=(n.combat?.protectUntil||0)&&n.phase==='fog'&&n.night&&!n.night.dispelled&&b.room===null&&now-n.lastHitAt>=3500){n.lastHitAt=now;n.playerHits++;n.health=Math.max(0,(n.health??100)-34);if(n.playerHits>=3||n.health===0){if(n.collection[c.id])n.collection[c.id].shelterKnown=true;n.rescue=(n.rescue||0)+1;n.playerHits=0;n.health=100;message='你踉跄着退回住处。屋内是安全的，已点亮的灯仍然保留。';}}break;
 case 'story-position':if(Number.isFinite(b.x)&&Number.isFinite(b.y)&&b.x>=0&&b.x<=1440&&b.y>=0&&b.y<=900){n.position={x:b.x,y:b.y,room:['main','customs','archive','curator','liaison','specialist','gallery','meeting','museum','industry'].includes(b.room)?b.room:null};}break;
 case 'story-combat-position':if(!dev||!owner||!n.combatDemo)fail(403,'dev_only','仅人物验收副本可用');{const i=Object.keys(STORY_RESIDENTS).indexOf(b.id);if(i<0)fail(400,'resident','居民不存在');n.position={x:620+i*50,y:530,room:null,direction:'up'};n.restoreTag=(n.restoreTag||0)+1;}break;
 case 'story-combat-demo':if(!dev||!owner)fail(403,'dev_only','仅开发验收可用');n.demo=true;n.combatDemo=true;n.number=2;n.prologue='complete';n.phase='prologue';n.position={x:620,y:540,room:null};n.restoreTag=(n.restoreTag||0)+1;n.health=100;n.downed=null;n.combat={events:[],lastStrike:0,seen:[],recent:{},protectUntil:0};s.minutes=600;s.fogActive=false;break;
 case 'story-debug':if(!dev||!owner)fail(403,'dev_only','仅本地开发验收可跳转');if(!['day','dusk','fog','morning'].includes(b.phase))fail(400,'phase','阶段无效');n.demo=true;n.combatDemo=false;n.showModels=!!b.models;n.damage=[];n.injuries=[];n.playerHits=0;n.rescue=0;s.facility='healthy';s.event=null;if(b.chapter&&CHAPTERS.some(c=>c.id===b.chapter))n.chapter=b.chapter;n.prologue='complete';n.phase=b.phase;s.minutes={day:600,dusk:1100,fog:1160,morning:1800}[b.phase];n.night=null;if(b.phase==='fog')beginNight(s);if(b.phase==='morning'){beginNight(s);if(b.branch==='all'){s.lamps=LIFE_LAMPS.map(l=>l.id);n.night.dispelled=true;}else if(b.branch==='partial')s.lamps=[LIFE_LAMPS[0].id];settleNight(s);}s.lampCycle=Math.floor((s.minutes-360)/1440);break;
 default:return null;
 }return message;
}
export function checkDispel(s){const n=s.narrative;if(n.phase==='fog'&&n.night&&!n.night.dispelled&&LIFE_LAMPS.every(l=>s.lamps.includes(l.id))){n.night.dispelled=true;n.night.dispelledAt=Date.now();if(!n.demo){s.materials+=3;if(!s.owned.includes('fog-medal'))s.owned.push('fog-medal');}if(n.night.seen)n.collection[n.chapter].dispelled=true;return '四盏灯连成暖光。它退入浓雾，窗内有人回应你的灯。';}return '';}
