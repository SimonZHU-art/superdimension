import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,fixtureOutput} from './helpers.mjs';
const ok=r=>{assert.equal(r.status,200,r.raw);return r.data};
async function setup(){
 const h=await harness({withProviders:true,fixture:{modelOutput:body=>{const value=fixtureOutput(body),input=JSON.parse(body.input.find(m=>m.role==='user').content);value.relevance=input.visitor?.name==='专题访客'?'与岛主关注的 AI 工作流相关。':'暂无相关线索。';return value;}}});
 await h.login();const c=ok(await h.owner.request('/api/owner/config'));ok(await h.owner.request('/api/owner/config',{method:'PUT',json:{...c,filter:{...c.filter,focus:'AI 工作流'}}}));
 const guests=[];
 for(const name of ['专题访客','其他访客']){const {guest}=await h.visitor();const v=ok(await guest.request('/api/visit/register',{method:'POST',json:{name,background:'TEST FIXTURE',purpose:'TEST FIXTURE',consent:true}}));guests.push({guest,visitId:v.visit.id})}
 await h.visitor();await h.app.runQueue();return {...h,guests};
}
test('council is private, recommendations explain saved reports and browsing makes no model calls',async()=>{
 const h=await setup();try{
  assert.equal((await h.guests[0].guest.request('/api/owner/council')).status,401);
  const count=h.provider.modelRequests().length;
  const council=ok(await h.owner.request('/api/owner/council'));
  assert.equal(council.visits.length,2);assert.equal(council.anonymousCount,1);assert.equal(council.recommendedId,h.guests[0].visitId);
  const top=council.visits.find(v=>v.id===council.recommendedId);assert.ok(top.recommendation.reasons.some(r=>r.includes('AI 工作流')));
  assert.equal(top.reports.length,4);assert.equal(top.recommendation.completed,4);
  ok(await h.owner.request('/api/owner/council'));assert.equal(h.provider.modelRequests().length,count);
 }finally{await h.close()}
});
test('new visitor version and incomplete reports do not recommend stale analysis',async()=>{
 const h=await setup();try{
  const first=h.guests[0];ok(await first.guest.request('/api/visit/messages',{method:'POST',json:{npcId:'curator',text:'TEST FIXTURE new information'}}));
  const council=ok(await h.owner.request('/api/owner/council'));const changed=council.visits.find(v=>v.id===first.visitId);
  assert.equal(changed.recommendation.completed,0);assert.ok(changed.reports.every(r=>r.report===null));assert.equal(council.recommendedId,h.guests[1].visitId);
 }finally{await h.close()}
});
