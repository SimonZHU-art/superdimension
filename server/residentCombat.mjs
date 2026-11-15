import {COMBAT_RULES as R,STORY_RESIDENTS,strikeInRange} from '../shared/storyResidents.js';
import {canWalk} from '../src/worldData.js';
import {fail} from './security.mjs';
export function combatAction(s,b,{now}){
 const n=s.narrative;n.health??=100;n.combat??={events:[],lastStrike:0,seen:[],recent:{},protectUntil:0};const combat=n.combat;
 if(b.action==='resident-strike'){
  if(!STORY_RESIDENTS[b.id]||b.id==='main'&&n.number===1)fail(400,'target','此处没有可打击的虚构居民。');
  if(typeof b.eventId!=='string'||b.eventId.length>100)fail(400,'event','打击标识无效');if(combat.seen.includes(b.eventId))return '';
  if(n.downed)fail(409,'downed','先回住处休息。');if(now-combat.lastStrike<R.cooldown)return '';
  const p=b.player,t=b.target,room=n.position?.room||null;
  if(b.room!==room||!p||!t||![p.x,p.y,t.x,t.y].every(Number.isFinite)||p.x<0||p.y<0||p.x>1440||p.y>900||(!room&&(!canWalk(p.x,p.y)||!canWalk(t.x,t.y)))||!strikeInRange(p,t,{room:!!room,clear:canWalk}))fail(400,'range','走近、面向居民，再打一下。');
  if(b.id==='archive'&&combat.events.some(e=>e.target==='archive'&&e.damage&&!e.resolved&&now<e.due+250)){combat.seen=[...combat.seen.slice(-39),b.eventId];return ''; }
  combat.lastStrike=now;combat.seen=[...combat.seen.slice(-39),b.eventId];
  const previous=combat.recent[b.id],count=previous&&now-previous.at<5000?previous.count+1:1;combat.recent[b.id]={at:now,count};
  const damage=b.id==='archive'?R.archiveDamage:b.id==='liaison'&&count>=3?R.liaisonDamage:0;
  const event={id:b.eventId,target:b.id,at:now,count,x:t.x,y:t.y,room,damage,due:damage?now+R.windup:null,resolved:false};combat.events=[...combat.events.slice(-6),event];
  return STORY_RESIDENTS[b.id].lines[(count-1)%STORY_RESIDENTS[b.id].lines.length];
 }
 if(b.action==='resident-counter'){
  const e=combat.events.find(e=>e.id===b.eventId);if(!e||e.resolved||!e.damage||now<e.due)return '';e.resolved=true;
  const p=b.player;if(n.downed||now<combat.protectUntil||b.room!==e.room||!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.hypot(p.x-e.x,p.y-e.y)>50)return '';
  n.health=Math.max(0,n.health-e.damage);e.hit=true;e.hitAt=now;
  if(!n.health){n.downed={at:now,eventId:e.id};return '你对地面有了更深入的了解。歇两秒，再回住处。';}
  return e.target==='archive'?'书没弄皱。你挨了一下。':'混子推开你一步，又去捡信了。';
 }
 if(b.action==='combat-rest'){
  if(!n.downed||now-n.downed.at<R.restDelay)fail(409,'rest','先缓一缓。');n.health=100;n.playerHits=0;n.downed=null;combat.protectUntil=now+R.protection;n.rescue=(n.rescue||0)+1;return '回住处休息。资料和守灯进度都在。';
 }
 return null;
}
