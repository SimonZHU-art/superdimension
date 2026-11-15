import {randomUUID} from 'node:crypto';
import {Gatherings} from './gatherings.mjs';
import {gatheringBoatAdapter} from './gatheringBoatAdapter.mjs';
import {gatheringAgentAdapter} from './gatheringAgentAdapter.mjs';
import {validateParticipant as validateTestProfile,participantPack} from './gatheringProfiles.mjs';
import {modelConfigured} from './agents.mjs';
import {NORTH_DOCK,themeTemplate} from '../shared/voyageConfig.js';
import {fail} from './security.mjs';

const ROLES={customs:'阿斯伽德',archivist:'Doctor Strange',curator:'黄四郎',specialist:'纳德',liaison:'混子'};
export const gatheringArchiveBucket=island=>'gathering-archives:'+island;
// HTTP supplies a credential built from its verified cookie, never from the request body.
// Rooms, accepted inputs, jobs, travellers and private archives share the main persistent store.
export function createGatheringProduct({store,life,domain,modelOptions,clock=()=>Date.now(),batchMs=30000,schedulerMs=1000,model}={}){
 const config=()=>domain.config(),ownerId=()=>`owner:${config().islandId}`;
 function resolve(c){
  if(c?.kind==='owner')return {userId:ownerId(),islandId:config().islandId,canHost:true,agents:Object.keys(ROLES),avatar:domain.published().avatar,internalContext:{owner:{public:config().public.confirmed?config().public:{confirmed:false},private:{background:config().private.background,documents:config().private.documents}},filter:config().filter}};
  if(c?.kind==='visitor'){const v=store.read('visits',c.visitId);if(v)return {userId:'visit:'+v.id,canHost:false,agents:[],avatar:domain.projection(v.id)?.avatar||{body:'#819b94',hair:'#735a43',hat:'#dfcb9b'}};}
  if(c?.kind==='virtual'){const p=service.read('virtual',c.roomId);if(p)return {userId:p.userId,canHost:false,agents:[],avatar:{body:'#9d725b',hair:'#514b47',hat:'#ddd4b1'}};}
  return null;
 }
 const pending=new Set();let closing=false,pumping=false;
 const service=new Gatherings(store,{clock,batchMs,auth:{resolve,authorizePack:(_a,pack)=>pack.map(p=>({title:String(p.title||'本次开放资料').slice(0,120),text:p.text}))},boats:gatheringBoatAdapter(life,island=>island===config().islandId?'owner':null),model:model||gatheringAgentAdapter(modelOptions),archive:{async write(island,key,record){
  if(island!==config().islandId)fail(403,'archive_route','未获准的档案路由。');
  const room=service.read('rooms',record.roomId),member=room?.members[record.otherUserId],virtual=service.read('virtual',record.roomId);
  store.write(gatheringArchiveBucket(island),key,{...record,otherNickname:member?.nickname||'来客',virtual:record.otherUserId===virtual?.userId});
 }}});
 // Resume durable work interrupted by a server shutdown, keeping its immutable accepted input.
 for(const t of service.all('tasks'))if(t.status==='running'){t.status=t.result?'archive_failed':'queued';service.write('tasks',t.id,t);}
 function pump(){if(closing||pumping)return;pumping=true;try{service.expire();service.batch();for(const t of service.runnableTasks().slice(0,Math.max(0,2-pending.size))){const job=service.runTask(t.id);pending.add(job);job.catch(()=>{}).finally(()=>pending.delete(job));}}finally{pumping=false}}
 const timer=schedulerMs>0?setInterval(pump,schedulerMs):null;timer?.unref();
 const actor=c=>service.actor(c);
 function current(c){const a=actor(c),pointer=service.read('travellers',a.userId);return pointer&&service.read('rooms',pointer.roomId);}
 function archives(c){const a=actor(c);return a.islandId?store.all(gatheringArchiveBucket(a.islandId)).reverse():[];}
 function view(c,key){
  const a=actor(c),r=key?service.room(key):current(c);let room=null;
  if(r){service.member(r,a);const m=r.members[a.userId];if(m.present&&r.status==='active'&&clock()-(m.lastSeen||0)>4000){m.lastSeen=clock();service.write('rooms',r.id,r);}
   room=service.snapshot(c,r.id);room.isHost=r.host===a.userId;room.self={...room.self,userId:a.userId,nickname:m.nickname,avatar:m.avatar};
   const virtual=service.read('virtual',r.id);room.members=room.members.filter(m=>m.userId===a.userId||m.userId===virtual?.userId||clock()-(r.members[m.userId].lastSeen||r.startedAt)<20000).map(m=>({...m,virtual:m.userId===virtual?.userId}));
   room.virtualUserId=virtual?.userId||null;
  }
  return {mode:'gathering',analysisMode:'real',realAvailable:modelConfigured(modelOptions.env),room,actorId:a.userId,roles:ROLES,archives:archives(c),profile:service.read('profiles',a.userId)||validateTestProfile({}),boat:a.islandId?{...life.read('owner').boat,materials:life.read('owner').materials}:null};
 }
 function host(c){const a=actor(c);if(!a.canHost)fail(403,'owner_only','只有岛主可以创建聚会。');return a;}
 function acceptedVirtual(c,r,e){const p=service.read('virtual',r.id);if(p&&e.users.includes(p.userId)&&e.status==='pending')service.decide({kind:'virtual',roomId:r.id},e.id,p.profile.accept);}
 async function handle(c,b={},method='GET'){
  const a=actor(c);if(method==='GET')return view(c,b.roomId);if(method!=='POST')fail(405,'method','请使用有效的聚会操作。');let r=b.roomId?service.room(b.roomId):current(c),result;
  if(b.action==='begin'){
   host(c);const previous=b.requestId&&service.read('creates',a.userId+':'+b.requestId);if(previous)return view(c,previous);
   if(r&&['loading','active','unknown'].includes(r.status))fail(409,'journey_active','已有旅程，请继续或先返航。');
   if(typeof b.goal!=='undefined'&&(typeof b.goal!=='string'||b.goal.length>1500))fail(400,'goal','关注方向最多 1,500 字。');
   const profile=b.virtual===true?validateTestProfile(b.profile):null,t=themeTemplate(b.templateId||'basketball',1);
   const p=domain.published(),pack=b.shareA===true&&p.confirmed?[{title:'我已确认的公开介绍',text:JSON.stringify({name:p.name,bio:p.bio,background:p.background,projects:p.projects})}]:[];
   // A copied context belongs only to the authenticated owner; private focus never enters anyone's pack.
   const context=resolve(c).internalContext;if(b.goal?.trim())context.filter={...context.filter,specialty:b.goal.trim(),focus:b.goal.trim()};
   const created=store.transaction(()=>{const room=service.create(c,{...b,templateId:t.id,templateVersion:t.version,duration:b.duration||120,nickname:config().personalization.npcNames.main||p.name,agents:b.agents||['archivist','specialist','curator'],pack});
    const saved=service.room(room.id);saved.members[a.userId].context=context;service.write('rooms',saved.id,saved);service.write('travellers',a.userId,{roomId:saved.id});
    if(profile){service.write('profiles',a.userId,profile);service.write('virtual',saved.id,{userId:'virtual:'+randomUUID(),profile});}return saved;});
   return view(c,created.id);
  }
  if(b.action==='join'){
   if(typeof b.invite!=='string'||b.invite.length>100)fail(400,'invite','邀请无效。');
   const previous=current(c);if(previous&&previous.id!==service.landing(b.invite).id&&['loading','active'].includes(previous.status))fail(409,'journey_active','请先离开当前聚会。');
   const p=validateTestProfile({...b.profile,reply:'',agents:false}),pack=p.share?participantPack(p):[];
   const joined=service.join(c,b.invite,{nickname:p.name,agents:a.islandId?(b.agents||[]):[],pack});r=service.room(joined.id);
   const m=r.members[a.userId];if(!m.arrived){const n=Object.keys(r.members).length-2;m.position={x:630+n%3*34,y:635-Math.floor(n/3)*26};m.arrived=true;}m.lastSeen=clock();service.write('rooms',r.id,r);service.write('travellers',a.userId,{roomId:r.id});return view(c,r.id);
  }
  if(!r)fail(404,'no_gathering','没有进行中的主题聚会。');service.member(r,a);
  if(b.action==='ready'){
   if(r.host===a.userId){service.ready(c,r.id,{version:r.version,templateId:r.templateId,templateVersion:r.templateVersion,walkable:true,inputReady:true});r=service.room(r.id);const v=service.read('virtual',r.id);
    if(v&&!r.members[v.userId]){service.join({kind:'virtual',roomId:r.id},r.invite,{nickname:v.profile.name,agents:[],pack:v.profile.share?participantPack(v.profile):[]});service.position({kind:'virtual',roomId:r.id},r.id,{x:630,y:635});}}
   else service.active(r);
  }
  else if(b.action==='approach'){const e=service.inviteExchange(c,r.id,{userId:b.userId});acceptedVirtual(c,r,e);}
  else if(b.action==='accept'||b.action==='decline'){const e=service.exchange(b.exchangeId,a);if(e.roomId!==r.id)fail(403,'exchange_room','交流不属于当前聚会。');service.decide(c,e.id,b.action==='accept');}
  else if(b.action==='say'){
   const e=service.exchange(b.exchangeId,a);if(e.roomId!==r.id)fail(403,'exchange_room','交流不属于当前聚会。');
   store.transaction(()=>{const v=service.read('virtual',r.id),fixed=v&&e.users.includes(v.userId);service.message(c,e.id,{requestId:b.requestId,text:b.text,deferBatch:!!fixed});if(fixed)service.message({kind:'virtual',roomId:r.id},e.id,{requestId:'reply:'+b.requestId,text:v.profile.reply});});
  }
  else if(b.action==='position')service.position(c,r.id,b.position);
  else if(b.action==='draft')result=service.draft(c,b.taskId,b.index||0,b.existing||'',b.questionIndex);
  else if(b.action==='end'||b.action==='stop'){const e=service.exchange(b.exchangeId,a);if(e.roomId!==r.id)fail(403,'exchange_room','交流不属于当前聚会。');service.end(c,e.id,{stop:b.action==='stop'});}
  else if(b.action==='retry'){const t=service.read('tasks',b.taskId);if(t?.userId!==a.userId||t.roomId!==r.id)fail(403,'private_task','只能重试自己的任务。');if(['failed','archive_failed'].includes(t.status))await service.retry(c,t.id);}
  else if(b.action==='leave'){
   store.transaction(()=>{if(r.host===a.userId){if(['loading','unknown'].includes(r.status))service.cancel(c,r.id);else service.manage(c,r.id,{action:'close'});}else service.leave(c,r.id);service.write('travellers',a.userId,{roomId:null});
    if(a.islandId){const s=life.read('owner');s.narrative.position={x:NORTH_DOCK.x,y:NORTH_DOCK.y+30,direction:'down',room:null};life.save('owner',s);}});pump();return {...view(c),room:null};
  }
  else if(['close','revoke','kick'].includes(b.action))service.manage(c,r.id,{action:b.action,userId:b.userId});
  else fail(400,'gathering_action','聚会操作不存在。');
  pump();return {...view(c,r.id),result};
 }
 function purgeVisitor(visitId){const userId='visit:'+visitId;store.transaction(()=>{const exchanges=service.all('exchanges').filter(e=>e.users.includes(userId)),ids=new Set(exchanges.map(e=>e.id));for(const t of service.all('tasks'))if(ids.has(t.exchangeId))store.remove(service.bucket('tasks'),t.id);for(const e of exchanges)store.remove(service.bucket('exchanges'),e.id);for(const a of store.all(gatheringArchiveBucket(config().islandId)))if(ids.has(a.exchangeId))store.remove(gatheringArchiveBucket(config().islandId),a.taskId);for(const room of service.all('rooms'))if(room.members[userId]){delete room.members[userId];room.version++;service.write('rooms',room.id,room);}store.remove(service.bucket('travellers'),userId);});}
 return {service,handle,view,archives,purgeVisitor,landing:invite=>service.landing(invite),pump,async drain(){pump();while(pending.size||service.all('tasks').some(t=>t.status==='queued')){await Promise.allSettled([...pending]);pump();}},async close(){closing=true;clearInterval(timer);await Promise.allSettled([...pending]);}};
}
