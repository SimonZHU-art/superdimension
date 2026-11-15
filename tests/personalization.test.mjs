import test from 'node:test';
import assert from 'node:assert/strict';
import { harness, OWNER_PASSWORD } from './helpers.mjs';
test('personalization persists publicly without changing owner identity or research filter',async()=>{
 const h=await harness();try{
  await h.login();const old=(await h.owner.request('/api/owner/config')).data;
  const saved=await h.owner.request('/api/owner/config',{method:'PUT',json:{personalization:{islandName:'TEST FIXTURE岛',npcNames:{main:'TEST主角',customs:'TEST海关'}}}});
  assert.equal(saved.status,200);assert.equal(saved.data.filterVersion,old.filterVersion);assert.deepEqual(saved.data.public,old.public);
  const world=(await h.client().request('/api/world')).data;assert.equal(world.npcNames.main,'朱珠');assert.equal(world.npcNames.curator,'黄四郎');assert.equal(world.island.name,'TEST FIXTURE岛');
  assert.equal((await h.client().request('/api/owner/config',{method:'PUT',json:{personalization:{}}})).status,401);
  assert.equal((await h.owner.request('/api/owner/config',{method:'PUT',json:{personalization:{npcNames:{main:''}}}})).status,200);
 }finally{await h.close()}
});
test('password change checks old password and confirmation, revokes sessions, stores only a hash and survives restart',async()=>{
 const h=await harness();let restarted;try{
  await h.login();const other=h.client();await other.request('/api/owner/login',{method:'POST',json:{password:OWNER_PASSWORD}});
  const newPassword='TEST FIXTURE new owner password';
  for(const payload of [{currentPassword:'wrong',newPassword,confirmPassword:newPassword},{currentPassword:OWNER_PASSWORD,newPassword:'short',confirmPassword:'short'},{currentPassword:OWNER_PASSWORD,newPassword,confirmPassword:'different'}]){
   assert.ok((await h.owner.request('/api/owner/password',{method:'POST',json:payload})).status>=400);
  }
  const result=await h.owner.request('/api/owner/password',{method:'POST',json:{currentPassword:OWNER_PASSWORD,newPassword,confirmPassword:newPassword}});assert.equal(result.status,200);
  assert.equal((await other.request('/api/owner/config')).status,401);assert.equal((await h.owner.request('/api/owner/config')).status,200);
  assert.equal((await h.client().request('/api/owner/login',{method:'POST',json:{password:OWNER_PASSWORD}})).status,401);
  const auth=h.app.store.read('auth','owner');assert.ok(auth.hash);assert.ok(!JSON.stringify(auth).includes(newPassword));
  assert.ok(!JSON.stringify((await h.owner.request('/api/owner/config')).data).includes(auth.hash));
  await h.app.close();restarted=await harness({directory:h.directory});
  assert.equal((await restarted.owner.request('/api/owner/login',{method:'POST',json:{password:newPassword}})).status,200);
 }finally{if(restarted)await restarted.close();else await h.close()}
});
