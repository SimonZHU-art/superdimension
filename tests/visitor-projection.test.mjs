import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers.mjs';
import {latestVisitorProjection} from '../server/visitorProjection.mjs';
test('latest registration is selected by consent time, anonymous views cannot replace it',()=>{
 const visits=[{id:'old',kind:'registered',name:'old',createdAt:'2026-01-01',consentAt:'2026-01-05'},{id:'new',kind:'registered',name:'new',createdAt:'2026-01-02',consentAt:'2026-01-04'},{id:'anon',kind:'anonymous',createdAt:'2026-01-06'}];assert.equal(latestVisitorProjection(visits,[]).visitId,'old');
});
test('one owner-only visitor, style sources reach model, history removed on withdrawal',async()=>{
 const h=await harness({withProviders:true});try{
  const old=await h.visitor();await old.guest.request('/api/visit/register',{method:'POST',json:{name:'old fixture',background:'older visitor',purpose:'test',consent:true}});
  const {guest}=await h.visitor();const registered=await guest.request('/api/visit/register',{method:'POST',json:{name:'new fixture',background:'喜欢摄影',purpose:'test',text:'喜欢简短直接的表达，偶尔开玩笑。',consent:true}});assert.equal(registered.status,200);
  const v=(await guest.request('/api/visit')).data.visit;
  await h.login();const world=(await h.owner.request('/api/world')).data;assert.equal(world.projections.length,1);assert.equal(world.projections[0].visitId,v.id);
  assert.deepEqual((await guest.request('/api/world?view=visitor')).data.projections,[]);
  assert.equal((await guest.request('/api/owner/visitor-chat',{method:'POST',json:{visitId:v.id,message:'你好'}})).status,401);
  const reply=await h.owner.request('/api/owner/visitor-chat',{method:'POST',json:{visitId:v.id,message:'聊聊你的爱好'}});assert.equal(reply.status,200,reply.raw);assert.equal(reply.data.messages.length,2);
  const req=h.provider.modelRequests().at(-1),input=JSON.parse(req.body.input.find(x=>x.role==='user').content);assert.ok(input.sources.some(s=>s.text.includes('偶尔开玩笑')));assert.ok(JSON.stringify(req.body).includes('不从姓名或职业刻板推断性格'));
  const oldId=(await old.guest.request('/api/visit')).data.visit.id;assert.equal((await h.owner.request('/api/owner/visitor-chat',{method:'POST',json:{visitId:oldId,message:'hello'}})).status,409);
  await guest.request('/api/visit',{method:'DELETE'});assert.equal(h.app.store.read('visitor_chats',v.id),null);assert.equal((await h.owner.request('/api/world')).data.projections[0].visitId,oldId);
 }finally{await h.close();}
});
