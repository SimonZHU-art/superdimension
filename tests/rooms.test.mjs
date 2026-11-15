import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,fixtureOutput} from './helpers.mjs';
const ok=r=>{assert.equal(r.status,200,r.raw);return r.data};
async function setup(options={}){
 const h=await harness({withProviders:true,...options});await h.login();
 const config=ok(await h.owner.request('/api/owner/config'));
 ok(await h.owner.request('/api/owner/config',{method:'PUT',json:{...config,public:{...config.public,confirmed:true},private:{...config.private,contactEmail:'owner-fixture@example.org'},filter:{...config.filter,specialty:'数据科学'}}}));
 const {guest}=await h.visitor();
 const state=ok(await guest.request('/api/visit/register',{method:'POST',json:{name:'TEST FIXTURE PROJECT AUTHOR',background:'TEST FIXTURE 数据项目作者',purpose:'介绍项目',text:'TEST FIXTURE 访客预测项目：使用数据分析理解来访需求。',consent:true}}));
 return {...h,guest,visitId:state.visit.id};
}

test('owner shelves are protected and project cards trace to author and saved source',async()=>{
 const h=await setup({fixture:{modelOutput:body=>{
  const value=fixtureOutput(body);
  if(body.text.format.name==='report_specialist')value.project_cards=[{title:'TEST FIXTURE 访客预测项目',summary:'TEST FIXTURE 项目摘要',relevance:'TEST FIXTURE 数据科学关联',source_refs:value.source_refs}];return value;
 }}});
 try{
  await h.app.runQueue();
  for(const room of ['archive','customs','curator','specialist','liaison'])assert.equal((await h.guest.request('/api/owner/rooms/'+room)).status,401);
  const shelf=ok(await h.owner.request('/api/owner/rooms/specialist'));
  assert.equal(shelf.cards.length,1);assert.equal(shelf.cards[0].visitId,h.visitId);assert.equal(shelf.cards[0].author,'TEST FIXTURE PROJECT AUTHOR');
  const detail=ok(await h.owner.request('/api/owner/visits/'+shelf.cards[0].visitId));
  const known=detail.sources.flatMap(s=>s.paragraphs.map((p,i)=>`${s.id}:p${i+1}`));
  assert.ok(shelf.cards[0].source_refs.every(ref=>known.includes(ref)));
  await h.visitor();
  const archive=ok(await h.owner.request('/api/owner/rooms/archive'));assert.equal(archive.visits.length,1);assert.equal(archive.anonymousCount,1);
  ok(await h.guest.request('/api/visit/messages',{method:'POST',json:{npcId:'specialist',text:'TEST FIXTURE new project info'}}));
  assert.equal(ok(await h.owner.request('/api/owner/rooms/specialist')).cards.length,0,'stale reports cannot populate current project shelves');
 }finally{await h.close()}
});

test('old specialist reports can be rebuilt into cards without losing history or rerunning other roles',async()=>{
 const h=await setup();try{
  await h.app.runQueue();const report=h.app.store.all('reports').find(r=>r.roleId==='specialist');delete report.content.project_cards;delete report.project_cards;h.app.store.write('reports',report.id,report);
  ok(await h.owner.request('/api/owner/visits/'+h.visitId+'/projects',{method:'POST',json:{}}));
  ok(await h.owner.request('/api/owner/visits/'+h.visitId+'/projects',{method:'POST',json:{}}));
  await h.app.runQueue();assert.equal(h.provider.modelRequests().length,5);
  assert.ok(h.app.store.all('reports').some(r=>r.historical));assert.deepEqual(ok(await h.owner.request('/api/owner/rooms/specialist')).visits[0].report.content.project_cards,[]);
  ok(await h.owner.request('/api/owner/visits/'+h.visitId+'/projects',{method:'POST',json:{}}));await h.app.runQueue();assert.equal(h.provider.modelRequests().length,5);
 }finally{await h.close()}
});

async function verified(h){ok(await h.guest.request('/api/contact/verify',{method:'POST',json:{email:'visitor-fixture@example.org'}}));const code=h.provider.mailRequests().at(-1).body.text.match(/\b(\d{6})\b/)[1];ok(await h.guest.request('/api/contact/verify/confirm',{method:'POST',json:{code}}))}

test('owner outreach needs confirmed verified destination and repeated requests send once',async()=>{
 const h=await setup();try{
  const payload={visitId:h.visitId,requestId:'fixture-owner-outreach',subject:'TEST FIXTURE invitation',text:'TEST FIXTURE invitation body',confirmed:true};
  assert.equal((await h.guest.request('/api/owner/outreach',{method:'POST',json:payload})).status,401);
  assert.equal((await h.owner.request('/api/owner/outreach',{method:'POST',json:payload})).status,409);
  await verified(h);
  assert.equal((await h.owner.request('/api/owner/outreach',{method:'POST',json:{...payload,confirmed:false}})).status,400);
  ok(await h.owner.request('/api/owner/outreach',{method:'POST',json:payload}));ok(await h.owner.request('/api/owner/outreach',{method:'POST',json:payload}));
  ok(await h.owner.request('/api/owner/outreach',{method:'POST',json:{...payload,requestId:'new-ui-instance'}}));
  assert.equal(h.provider.mailRequests().length,2);assert.deepEqual(h.provider.mailRequests().at(-1).body.to,['visitor-fixture@example.org']);
  assert.equal((await h.owner.request('/api/owner/outreach',{method:'POST',json:{...payload,text:'changed'}})).status,409);
 }finally{await h.close()}
});

test('uncertain owner outreach cannot retry and deleted visit removes local letter content',async()=>{
 const h=await setup();try{
  await verified(h);h.provider.state.mailFailure=true;
  const payload={visitId:h.visitId,requestId:'fixture-uncertain-outreach',subject:'TEST FIXTURE',text:'TEST FIXTURE private invitation',confirmed:true};
  assert.equal((await h.owner.request('/api/owner/outreach',{method:'POST',json:payload})).data.code,'mail_uncertain');
  assert.equal((await h.owner.request('/api/owner/outreach',{method:'POST',json:payload})).data.code,'delivery_requires_review');
  assert.equal((await h.owner.request('/api/owner/outreach',{method:'POST',json:{...payload,requestId:'reopened-ui-instance'}})).data.code,'delivery_requires_review');
  assert.equal(h.provider.mailRequests().length,2);
  ok(await h.guest.request('/api/visit',{method:'DELETE'}));assert.equal(h.app.store.all('owner_outreach').length,0);assert.ok(h.app.store.all('delivery_audit').length);
 }finally{await h.close()}
});
