import {DAILY_RULES as R,DAILY_STORIES,authoredDaily,dailySkeleton,dailyPhase} from '../shared/dailyStories.js';
import {STORY_RESIDENTS} from '../shared/storyResidents.js';
import {modelJson,modelConfigured} from './agents.mjs';
import {boatState} from './voyage.mjs';
import {canWalk} from '../src/worldData.js';
import {fail} from './security.mjs';
import {activityAt} from '../shared/dailyActivities.js';

const str={type:'string'},enumStr=values=>({type:'string',enum:values});
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const schema=obj({title:str,reason:str,clue:str,stages:{type:'array',items:obj({id:enumStr(R.phases.map(p=>p.id)),beats:{type:'array',items:obj({speaker:enumStr(Object.keys(STORY_RESIDENTS)),location:str,action:enumStr(['search','argue','point','give','shrug']),text:str,actionText:str})}})},encounters:{type:'array',items:obj({id:str,lines:{type:'array',items:obj({speaker:str,action:str,text:str})}})}});
export function validateDaily(value,skeleton){const ref=authoredDaily(skeleton.id),limit=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
 if(!value||!limit(value.title,30)||!limit(value.reason,100)||!limit(value.clue,110)||value.stages?.length!==R.phases.length)throw Error('invalid daily structure');
 for(let i=0;i<ref.stages.length;i++){const got=value.stages[i],expected=ref.stages[i];if(got.id!==expected.id||got.beats?.length!==expected.beats.length)throw Error('invalid daily phase');
  for(let j=0;j<expected.beats.length;j++){const a=got.beats[j],b=expected.beats[j];if(a.speaker!==b.speaker||a.location!==b.location||a.action!==b.action||!limit(a.text,80)||!limit(a.actionText,45))throw Error('invalid daily actor/action');}
 }
 if(value.encounters?.length!==ref.encounters.length)throw Error('invalid daily encounter');
 for(let i=0;i<ref.encounters.length;i++){const got=value.encounters[i],expected=ref.encounters[i];if(got.id!==expected.id||got.lines?.length!==expected.lines.length)throw Error('invalid daily encounter');for(let j=0;j<expected.lines.length;j++){const a=got.lines[j],b=expected.lines[j];if(a.speaker!==b.speaker||a.action!==b.action||!limit(a.text,80))throw Error('invalid daily response');}}
 const all=[value.title,value.reason,value.clue,...value.stages.flatMap(p=>p.beats.flatMap(b=>[b.text,b.actionText]))].join('\n');
 if(/昨天|前天|上个故事日|上一次帮忙|https?:|<script|奖励\s*\d|获得\s*\d|新建|建造.*(?:楼|屋|桥)|永久.*记住/.test(all))throw Error('invalid daily claim');
 if(skeleton.id==='sandmarks'&&/(?:南岸|脚边|这里).{0,6}(?:带齿)?贝壳|贝壳.{0,6}(?:在|就在)(?:南岸|脚边|这里)/.test(all))throw Error('invalid daily geography');
 // The executable clues cannot change: generated expression stays attached to the authored clue.
 // Geographic directions and call-and-response are executable anchors. AI cannot
 // move a clue through text while the real prop remains on the other coast.
 value.clue=skeleton.clue;value.encounters=ref.encounters;
 for(let i=0;i<ref.stages.length;i++)for(let j=0;j<ref.stages[i].beats.length;j++)if(/北岸|南岸|桥|溪岸|邮局|包裹|沙堆|花圃/.test(ref.stages[i].beats[j].text))value.stages[i].beats[j].text=ref.stages[i].beats[j].text;
 return value;
}

export class DailyDirector{
 constructor(store,options={},islandId='island'){this.store=store;this.options=options;this.islandId=islandId;this.enabled=options.env?.DAILY_STORIES_ENABLED!=='0';this.pending=new Map();this.closed=false;}
 key(day){return this.islandId+':'+day;}
 migratePack(record){if(record?.frozen&&record.schema!==R.schema){record={...record,schema:R.schema,pack:authoredDaily(record.skeleton),source:'authored',reason:'geography_patch',previousSource:record.source};this.store.write('daily-packs',record.id,record);}return record;}
 choose(day){const previous=[day-1,day-2].map(n=>this.store.read('daily-packs',this.key(n))?.skeleton),start=((day-R.startDay)%DAILY_STORIES.length+DAILY_STORIES.length)%DAILY_STORIES.length;for(let offset=0;offset<DAILY_STORIES.length;offset++){const story=DAILY_STORIES[(start+offset)%DAILY_STORIES.length];if(!previous.includes(story.id))return story;}}
 fallback(day,reason='unconfigured'){const skeleton=this.choose(day),record={id:this.key(day),day,schema:R.schema,skeleton:skeleton.id,pack:authoredDaily(skeleton.id),source:'authored',reason,attempts:1,frozen:true};this.store.write('daily-packs',record.id,record);return record;}
 async prepare(day){if(this.closed||!this.enabled)return null;const key=this.key(day),cached=this.migratePack(this.store.read('daily-packs',key));if(cached?.frozen)return cached;if(this.pending.has(key))return this.pending.get(key);
  const work=(async()=>{const skeleton=this.choose(day);if(cached)return this.fallback(day,'interrupted');if(!modelConfigured(this.options.env||{}))return this.fallback(day);
   this.store.write('daily-packs',key,{id:key,day,skeleton:skeleton.id,attempts:1,frozen:false,source:'generating'});
   const input={fiction:true,people:Object.fromEntries(Object.entries(skeleton.actors).map(([id])=>[id,{name:STORY_RESIDENTS[id].name,tone:STORY_RESIDENTS[id].tone}])),skeleton:authoredDaily(skeleton.id),geography:{places:Object.fromEntries(Object.entries(skeleton.places).map(([id,p])=>[id,p.label||id])),objects:skeleton.objects.map(o=>({id:o.id,label:o.label,availableAt:o.availableAt??480})),activities:skeleton.schedule.activities},clue:skeleton.clue,ending:skeleton.end.text,allowedActions:['search','argue','point','give','shrug'],world:{fogAtNight:true,daylight:true}};
   let timer;try{const result=await Promise.race([modelJson({...this.options,env:{...this.options.env,MODEL_TIMEOUT_MS:String(R.timeoutMs)},system:'这是独立的虚构小镇日常故事，不是人物档案。严格沿用输入骨架的各阶段 id、每个 speaker、location、action 和顺序。只改写标题、缘由、短动作和短对白。居民只记得当天的事件，不提昨天的剧情或过去的帮助。居民固定人设、物件、线索与结局不变。角色不承诺奖励，不增加建筑、物件、长期记忆，不替整个雾夜谜团给出答案。对白每句最多80字，动作最多45字。ended阶段物件必须归还，不再说尚未找到。只输出JSON，没有工具或执行权限。',input,schema,name:'fictional_daily_story',maxTokens:R.maxTokens}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),R.timeoutMs);})]);
    const pack=validateDaily(result.value,skeleton);if(this.closed)return null;const live=this.store.read('daily-packs',key);if(live?.frozen)return live;const record={id:key,day,schema:R.schema,skeleton:skeleton.id,pack,source:'model',model:result.model,attempts:1,frozen:true};this.store.write('daily-packs',key,record);return record;
   }catch(error){if(this.closed)return null;return this.store.read('daily-packs',key)?.frozen?this.store.read('daily-packs',key):this.fallback(day,error.message==='timeout'?'timeout':'invalid_or_unavailable');}finally{clearTimeout(timer);}
  })();this.pending.set(key,work);try{return await work;}finally{this.pending.delete(key);}
 }
 sync(s){if(!this.enabled)return;const n=s.narrative;if(n.prologue!=='complete'||n.number<(s.dailyStart??R.startDay))return;
  if(!s.daily||s.daily.day!==n.number){const record=this.migratePack(this.store.read('daily-packs',this.key(n.number)));const frozen=record?.frozen?record:this.fallback(n.number,'start_without_ready_model');s.daily={schema:R.schema,day:n.number,version:1,skeleton:frozen.skeleton,pack:structuredClone(frozen.pack),phase:dailyPhase(s.minutes),accepted:false,items:[],observed:[],completed:false,helped:false,requests:{},performance:{encounters:{},closures:{}}};n.dialogues={};delete n.dayHeard;s.sceneVisits={};}
  if(s.daily.schema!==R.schema){s.daily.schema=R.schema;s.daily.pack=authoredDaily(s.daily.skeleton);s.daily.performance??={encounters:{},closures:{}};s.daily.version++;}
  s.daily.clockMinutes=((s.minutes%1440)+1440)%1440;
  for(const e of dailySkeleton(s.daily.skeleton).schedule.encounters){const p=s.daily.performance.encounters[e.id];if(s.daily.clockMinutes>=e.to&&!['finished','missed'].includes(p?.status))s.daily.performance.encounters[e.id]={...p,status:p?.status==='playing'?'finished':'missed',endedAt:e.to};}
  const d=s.daily,phase=dailyPhase(s.minutes);if(n.phase==='morning'||n.phase==='fog'||phase==='ended'){if(d.phase!=='ended'){d.resolution=d.helped?'player-helped':d.items.length?'held-returned':'resident-solved';d.returnedIds=[...d.items];d.phase='ended';d.items=[];d.observed=[];d.version++;d.endedAt=s.minutes;}}else if(d.phase!==phase){d.phase=phase;d.version++;}
 }
 checkpoint(s,body){const d=s.daily;if(!d||body.daily?.day!==d.day)return;const sk=dailySkeleton(d.skeleton),valid=new Set(Object.keys(sk.actors));
  d.actorPositions={...(d.actorPositions||{}),...Object.fromEntries(Object.entries(body.daily.positions||{}).filter(([id,p])=>valid.has(id)&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&canWalk(p.x,p.y)).map(([id,p])=>[id,{x:p.x,y:p.y,direction:['up','down','left','right'].includes(p.direction)?p.direction:'down',atHome:p.atHome===true}]))};
  d.performance??={encounters:{},closures:{}};
  for(const e of sk.schedule.encounters){const incoming=body.daily.performance?.encounters?.[e.id],prior=d.performance.encounters[e.id];if(!incoming||['finished','missed'].includes(prior?.status)||!['playing','finished','missed'].includes(incoming.status))continue;
   const m=d.clockMinutes??s.minutes;if(m+5<e.start)continue;
   if(incoming.status==='missed'&&m+5<e.to)continue;
   if(incoming.status==='playing'&&!Number.isFinite(incoming.startedAt))continue;
   if(incoming.status==='finished'&&(!Number.isFinite(incoming.endedAt)||incoming.endedAt>m+5||incoming.endedAt<e.to-.2&&(!Number.isFinite(incoming.startedAt)||incoming.endedAt-incoming.startedAt<e.lines.length*e.turnMinutes-.2)))continue;
   const startedAt=Number.isFinite(incoming.startedAt)?Math.max(e.start,Math.min(m+5,e.to,incoming.startedAt)):undefined;
   d.performance.encounters[e.id]={status:incoming.status,...(startedAt!==undefined?{startedAt}:{}),...(Number.isFinite(incoming.endedAt)?{endedAt:Math.max(e.start,Math.min(m+5,e.to,incoming.endedAt))}:{}),turn:Math.max(0,Math.min(e.lines.length,Number(incoming.turn)||0))};
  }
  for(const id of valid)if(body.daily.performance?.closures?.[id]&&d.phase==='ended')d.performance.closures[id]=true;
 }
 action(s,b){if(!b.action?.startsWith('daily-'))return null;if(!this.enabled)fail(404,'daily_disabled','这座快速造船试玩岛没有每日故事。');this.sync(s);const d=s.daily;if(!d||b.day!==d.day)fail(409,'story_day_changed','这件事已经换到新的一天了。');const sk=dailySkeleton(d.skeleton);
  if(typeof b.requestId!=='string'||!b.requestId||b.requestId.length>100)fail(400,'request_id','请带上本次互动标识。');if(d.requests[b.requestId])return d.requests[b.requestId];
  if(b.version!==d.version)fail(409,'story_changed','现场已经有变化，看看现在的物件再来。');if(d.phase==='ended')fail(409,'story_ended','今天的事已经收尾，天黑前大家收好了东西。');if(d.completed)return '这件事已经记进今天的记录。';
  const p=s.narrative.position,close=(point)=>p&&!p.room&&Math.hypot(p.x-point.x,p.y-point.y)<=64;let message='';
  if(b.action==='daily-help'){d.accepted=true;message='他点了点头，把线索指给你。';}
   else if(['daily-observe','daily-pickup'].includes(b.action)){const o=sk.objects.find(o=>o.id===b.id);if(!o)fail(400,'story_object','今天没有这件东西。');if(!close(o))fail(400,'story_distance','先走到这个物件前，再按 E。');d.accepted=true;
   if(d.clockMinutes<(o.availableAt??480))fail(409,'story_object_not_exposed','潮水或风还没让这件东西露出来，过一会儿再看看。');
   if(['ripple','shell'].includes(o.kind)){if(!d.observed.includes(o.id))d.observed.push(o.id);message=({ripple:'你记下这片海岸沙纹的方向和间距。',shell:'北岸木桩旁的贝壳有齿缘；还不能据此解释大雾。'})[o.kind];}
   else{if(!d.items.includes(o.id))d.items.push(o.id);message=o.kind==='rope'?'缆绳理顺了 · 去向阿斯伽德确认':o.label.replace(/^(拾起|翻找沙堆里的|检查邮局门边)/,'')+' · 已放入当天物品袋';}
  }else if(b.action==='daily-deliver'){
   if(b.id!==sk.recipient)fail(400,'story_recipient','这件东西要交给负责它的居民。');const actor=d.actorPositions?.[sk.recipient],planned=activityAt(d,sk.recipient)?.goal;
   if(!(p?.room===sk.recipient&&actor?.atHome||actor&&canWalk(actor.x,actor.y)&&close(actor)||!actor&&planned&&close(planned)))fail(400,'story_distance','走到这位居民当前的位置，再把东西交给他。');
   if(!sk.objects.every(o=>['ripple','shell'].includes(o.kind)?d.observed.includes(o.id):d.items.includes(o.id)))fail(400,'story_incomplete','还有物件没有查看完整，先顺着线索找一找。');
   s.dailyRewards??={};const reward=R.rewards[sk.reward];if(!s.dailyRewards[d.day]){s.materials+=reward.wood;const boat=boatState(s);boat.screws+=reward.screws;boat.version++;s.dailyRewards[d.day]={skeleton:sk.id,wood:reward.wood,screws:reward.screws};}d.completed=true;d.helped=true;d.recordedIds=[...d.observed];d.items=[];d.observed=[];message=sk.end.thanks+`\n木料 +${reward.wood}${reward.screws?' · 螺丝 +'+reward.screws:''} · 已收入背包`;
  }else fail(400,'daily_action','这件事没有这个互动。');
  d.version++;d.requests[b.requestId]=message;return message;
 }
 async close(){this.closed=true;await Promise.allSettled([...this.pending.values()]);}
}
