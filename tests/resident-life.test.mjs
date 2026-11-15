import test from 'node:test';
import assert from 'node:assert/strict';
import {residentPresence,RESIDENT_IDS} from '../src/residentLife.js';

test('first arrival keeps the archive open and leaves several residents outside',()=>{
  const clock=16*60+20;
  assert.equal(residentPresence('archive',clock).atHome,true);
  const homes=RESIDENT_IDS.filter(id=>residentPresence(id,clock).atHome);
  assert.ok(homes.length>0&&homes.length<RESIDENT_IDS.length);
  assert.equal(residentPresence('main',clock).phase,'leisure');
  assert.equal(residentPresence('archive',clock+100).atHome,true,'archive work period gives a visitor time to explore');
});

test('an absent resident has a definite return time that becomes a home period',()=>{
  for(const id of RESIDENT_IDS){
    for(let minute=360;minute<1320;minute+=7){
      const presence=residentPresence(id,minute);
      if(presence.atHome)continue;
      assert.ok(presence.returnMinute>minute&&presence.returnMinute<=1320);
      assert.equal(residentPresence(id,presence.returnMinute).atHome,true,`${id} returns at the hinted time`);
      assert.match(presence.returnHint,/\d{2}:\d{2}/);
    }
  }
});

test('residents go home at night and the schedule repeats across midnight',()=>{
  for(const id of RESIDENT_IDS){
    assert.equal(residentPresence(id,22*60).atHome,true);
    assert.equal(residentPresence(id,2*60).phase,'evening');
    assert.deepEqual(residentPresence(id,980),residentPresence(id,980+1440));
    assert.deepEqual(residentPresence(id,1439),residentPresence(id,-1));
  }
  assert.equal(residentPresence('unregistered'),null);
});
