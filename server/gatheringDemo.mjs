import {randomUUID} from 'node:crypto';
import {Store} from './store.mjs';
import {Gatherings} from './gatherings.mjs';
import {gatheringAgentAdapter} from './gatheringAgentAdapter.mjs';
import {modelConfigured} from './agents.mjs';
import {themeTemplate,themeCanWalk} from '../shared/voyageConfig.js';
import {fail} from './security.mjs';
import {extractGatheringReport} from './gatheringEvidence.mjs';

const ROLE_NAMES={archivist:'Doctor Strange',specialist:'纳德',curator:'黄四郎',liaison:'混子'};
import {DEFAULT_PARTICIPANT as DEFAULT_B,validateParticipant as validateTestProfile,participantPack as profilePack,participantText as text} from './gatheringProfiles.mjs';
export {validateParticipant as validateTestProfile} from './gatheringProfiles.mjs';
// Only selected input is read. This deterministic substitute never invents a model result.
export function createGatheringDemo({getOwner=()=>({name:'测试参与者 A',avatar:{},context:{}}),modelOptions=null,latencyMs=700,batchMs=30000,schedulerMs=1000,initialProfile=null,onProfile}={}){
 const store=new Store(':memory:');let wall=Date.now(),now=wall,roomId=null,failAgent=null,failUser='test-A',profile=validateTestProfile(initialProfile||DEFAULT_B),mode='simulated',auto=false,closing=false;
 const pending=new Set(),automaticReplies=new Set();
 const actors={A:{userId:'test-A',islandId:'test-island-A',canHost:true,agents:Object.keys(ROLE_NAMES),internalContext:{}},B:{userId:'test-B',islandId:'test-island-B',canHost:true,agents:['archivist','specialist','curator'],internalContext:{}},C:{userId:'test-C',islandId:null,canHost:false,agents:[]}};
 const realAvailable=!!modelOptions&&modelConfigured(modelOptions.env||{}),real=realAvailable?gatheringAgentAdapter(modelOptions):null;
 const boats={reserve(island,room){const b=store.read('boats',island)||{status:'ready',materials:100,version:0,settled:[]};if(b.roomId&&b.roomId!==room)fail(409,'boat_reserved','测试船已预留。');if(b.status!=='ready')fail(409,'boat_unavailable','测试船需要修复。');b.roomId=room;b.status='reserved';store.write('boats',island,b)},sail(island,room){const b=store.read('boats',island);if(b.roomId!==room)fail(409,'boat_state','船预留不符');b.status='sailing';store.write('boats',island,b)},release(island,room){const b=store.read('boats',island);if(b.roomId===room){b.roomId=null;b.status='ready';store.write('boats',island,b)}},damage(island,room){const b=store.read('boats',island);if(b.settled.includes(room))return;b.settled.push(room);b.status='damaged';b.roomId=null;b.version++;store.write('boats',island,b)}};
 const service=new Gatherings(store,{clock:()=>now,auth:{resolve:c=>actors[c]},boats,namespace:'demo',batchMs,archive:{async write(island,key,record){store.write('demo-archive:'+island,key,record)}},model:{waitForArchivist:task=>task.input.sources.modelMode==='real',async analyze(task){if(failAgent===task.agent&&failUser===task.userId){failAgent=null;throw Error('isolated model failure')}if(task.input.sources.modelMode==='real')return real.analyze(task);if(latencyMs)await new Promise(resolve=>setTimeout(resolve,latencyMs+(task.agent==='specialist'?500:task.agent==='curator'?1000:0)));return extractGatheringReport(task)}}});
 // Freeze which pipeline a task uses, just like its selected input version.
 const flush=service.flush.bind(service);service.flush=(e,r)=>{flush(e,r);for(const t of service.all('tasks').filter(t=>t.exchangeId===e.id&&!t.input.sources.modelMode)){t.input.sources.modelMode=mode;service.write('tasks',t.id,t);}};
 function syncClock(){const current=Date.now();if(auto)now+=Math.max(0,current-wall);wall=current;}
 function pump(){if(!auto||closing)return;service.batch();for(const task of service.runnableTasks().slice(0,Math.max(0,2-pending.size))){const job=service.runTask(task.id);pending.add(job);job.catch(()=>{}).finally(()=>pending.delete(job));}}
 const scheduler=setInterval(()=>{if(!auto||closing)return;syncClock();service.expire();pump()},schedulerMs);scheduler.unref();
 function snapshot(who){syncClock();const a=actors[who];if(!a)fail(400,'actor','请选择测试参与者');service.expire();pump();const r=roomId&&service.read('rooms',roomId);return {mode:'isolated-simulation',analysisMode:mode,realAvailable,actor:who,now,profile:{...profile},owner:{name:getOwner().name||'你',avatar:getOwner().avatar||{}},room:r?.members[a.userId]?service.snapshot(who,roomId):null,landing:r?(r.invite?service.landing(r.invite):{status:r.status,title:r.title}):null,boat:store.read('boats',a.islandId),archives:a.islandId?store.all('demo-archive:'+a.islandId):[],roles:ROLE_NAMES};}
 const handle=async(b={},method='GET')=>{syncClock();const who=b.actor||'A';if(!actors[who])fail(400,'actor','测试身份不存在');const a=actors[who];if(method==='GET'||!b.action)return snapshot(who);let result;
 if(b.action==='begin'){
  if(who!=='A')fail(403,'host_only','从你自己的视角创建测试旅程。');
  const goal=text(b.goal||'',1500,'你的关注方向'),nextProfile=validateTestProfile(b.profile),t=themeTemplate(b.templateId||'basketball',1),owner=getOwner();
  const agents=b.agents||['archivist','specialist','curator'];if(!Array.isArray(agents)||agents.some(id=>!actors.A.agents.includes(id)))fail(400,'agents','请选择可用的私人助理。');
  if(b.analysisMode==='real'&&!realAvailable)fail(409,'model_unavailable','开发环境尚未配置真实模型，仍可使用模拟分析。');
  const previous=b.requestId&&service.read('creates','test-A:'+b.requestId);if(previous){if(previous!==roomId)fail(409,'old_request','请为新旅程使用新的请求标识');return snapshot('A')}
  if(roomId){const old=service.room(roomId);if(old.status==='active')service.manage('A',roomId,{action:'close'});else if(['loading','unknown'].includes(old.status))service.cancel('A',roomId);}
  profile=nextProfile;onProfile?.(profile);failAgent=null;mode=b.analysisMode==='real'?'real':'simulated';auto=true;
  actors.A.avatar=owner.avatar||{};actors.A.internalContext={...(owner.context||{}),filter:{...(owner.context?.filter||{}),focus:goal||owner.context?.filter?.focus||'',specialty:goal||owner.context?.filter?.specialty||''},note:goal};actors.B.avatar={body:'#9d725b',hair:'#514b47',hat:'#ddd4b1'};actors.B.internalContext={note:profile.projects};
  store.write('boats',actors.A.islandId,{status:'ready',materials:100,version:0,settled:[]});
  const r=service.create('A',{requestId:b.requestId||randomUUID(),title:b.title||'与你的虚拟来客相遇',purpose:'隔离试玩',templateId:t.id,templateVersion:t.version,duration:120,nickname:owner.name||'你',agents,pack:b.shareA&&owner.publicPack?owner.publicPack:[]});roomId=r.id;
  // The client confirms readiness after the actual canvas controller is mounted.
  return snapshot('A');
 }
 if(b.action==='ready'){
  const r=service.room(roomId);result=service.ready(who,roomId,{version:r.version,templateId:r.templateId,templateVersion:r.templateVersion,walkable:true,inputReady:true});
  if(auto&&!service.room(roomId).members['test-A'].present)service.join('A',result.invite,{});
  if(auto&&!service.room(roomId).members['test-B']){service.join('B',result.invite,{nickname:profile.name,agents:profile.agents?actors.B.agents:[],pack:profile.share?profilePack(profile):[]});service.position('B',roomId,{x:630,y:635});}
 }
 else if(b.action==='approach'){
  if(who!=='A')fail(403,'test_view','以你自己的视角发起交流。');const e=service.inviteExchange('A',roomId,{userId:'test-B'});result=service.decide('B',e.id,profile.accept);pump();
 }
 else if(b.action==='say'){
  if(who!=='A')fail(403,'test_view','测试发言属于你自己的视角。');const requestId=b.requestId;if(!requestId)fail(400,'request_id','发言需要请求标识');result=service.message('A',b.exchangeId,{requestId,text:b.text,deferBatch:true});
  const replyKey=b.exchangeId+':'+requestId;if(!automaticReplies.has(replyKey)){service.message('B',b.exchangeId,{requestId:'fixed-reply:'+requestId,text:profile.reply});automaticReplies.add(replyKey);}pump();
 }
 else if(b.action==='position'){const t=themeTemplate(service.room(roomId).templateId,1);if(!b.position||!themeCanWalk(t,b.position.x,b.position.y))fail(400,'position','位置无效。');result=service.position(who,roomId,b.position);}
 else if(b.action==='reset'){if(who!=='A')fail(403,'host_only','只有测试主持能重置');if(roomId){const r=service.room(roomId);if(r.status==='active')service.manage('A',roomId,{action:'close'});}pump();roomId=null;auto=false;return snapshot(who);}
 else if(b.action==='create'){auto=false;const r=service.create(who,{requestId:b.requestId||'test-create-'+now,title:b.title||'测试主题交流',purpose:'开发隔离演示',templateId:b.templateId||'basketball',templateVersion:1,duration:120,nickname:'测试参与者 A',agents:b.noAgents?[]:a.agents,pack:b.share?[{title:'A 自选简介',text:'我研究训练记录采集，喜欢简洁的表达。'}]:[]});roomId=r.id;}
 else if(b.action==='join'){const r=service.room(roomId);result=service.join(who,r.invite,{nickname:'测试参与者 '+who,agents:b.noAgents?[]:a.agents,pack:b.share?[{title:'B 自选项目',text:'我正在制作训练记录反馈项目，作品是一份教练反馈流程。'}]:[]});}
 else if(b.action==='invite')result=service.inviteExchange(who,roomId,{userId:actors[b.other||'B'].userId});
 else if(b.action==='accept'||b.action==='decline')result=service.decide(who,b.exchangeId,b.action==='accept');
 else if(b.action==='send')result=service.message(who,b.exchangeId,{requestId:b.requestId||String(now)+':'+Math.random(),text:b.text});
 else if(b.action==='end'||b.action==='stop')result=service.end(who,b.exchangeId,{stop:b.action==='stop'});
 else if(b.action==='advance'){if(who!=='A')fail(403,'host_only','仅测试主持可以推进时钟');now+=Math.max(0,Math.min(181,b.minutes||1))*60000;service.expire();service.batch();pump();}
 else if(b.action==='fail-next'){if(who!=='A'||!service.room(roomId).members[a.userId]?.agents.includes(b.agent))fail(400,'fault','请选择本次已携带的测试助理');failAgent=b.agent;failUser='test-A';}
 else if(b.action==='work'||b.action==='retry'){
  service.batch();const tasks=service.all('tasks').filter(t=>t.userId===a.userId&&['queued','failed','archive_failed'].includes(t.status));if(b.fail){failAgent=b.fail;failUser=a.userId;}
  const next=b.taskId?tasks.find(t=>t.id===b.taskId):b.fail?tasks.find(t=>t.agent===b.fail):tasks[0];if(next)await service.retry(who,next.id);
 }
 else if(b.action==='draft')result=service.draft(who,b.taskId,b.index||0,b.existing||'',b.questionIndex);
 else if(['close','revoke','kick'].includes(b.action))result=service.manage(who,roomId,{action:b.action,userId:actors[b.other||'B'].userId});
 else if(b.action==='leave')result=service.leave(who,roomId);
 else if(b.action==='repair'){const boat=store.read('boats',a.islandId);if(boat?.status!=='damaged'||boat.materials<20)fail(400,'repair','测试船未破损或木料不足');boat.materials-=20;boat.status='ready';boat.version++;store.write('boats',a.islandId,boat);}
 else fail(400,'action','测试操作不存在');return {...snapshot(who),result};
 };
 return {store,service,handle,async drain(){pump();while(pending.size||auto&&!closing&&service.runnableTasks().length){await Promise.allSettled([...pending]);pump()}},async close(){closing=true;clearInterval(scheduler);await Promise.allSettled([...pending]);store.close()}};
}
