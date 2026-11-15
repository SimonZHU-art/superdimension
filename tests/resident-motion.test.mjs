import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceResident,residentWalkFrame} from '../src/residentMotion.js';
import {WORLD_BUILDINGS,BOAT_SPAWN,canWalk,findWalkPath} from '../src/worldData.js';
test('a resident pauses in place during dialogue and resumes without a schedule jump',()=>{
 const r={pose:{x:0,y:0},route:[{x:0,y:0},{x:100,y:0},{x:0,y:0}],atHome:false};
 for(let i=0;i<60;i++)advanceResident(r,1/60);
 assert.ok(Math.abs(r.pose.x-24)<.001);
 const x=r.pose.x;for(let i=0;i<600;i++)advanceResident(r,1/60,24,true);
 assert.equal(r.pose.x,x);advanceResident(r,1/60);assert.ok(Math.abs(r.pose.x-x-.4)<.001);assert.equal(r.pose.moving,true);
});
test('returning residents remain outside until the final doorstep is reached',()=>{
 const r={pose:{x:0,y:0},route:[],atHome:false,transition:{path:[{x:0,y:0},{x:20,y:0}]}};
 for(let i=0;i<30;i++){advanceResident(r,1/60,24);assert.equal(r.atHome,false);}
 while(r.transition)advanceResident(r,1/60,24);
 assert.equal(r.atHome,true);assert.equal(r.pose.x,20);
});
test('every oriented doorway remains reachable and its physical side wall blocks movement',()=>{
 for(const b of WORLD_BUILDINGS){
  assert.ok(findWalkPath(BOAT_SPAWN,{x:b.doorX,y:b.doorY+8}).length,b.id);
  const f=b.footprint;assert.equal(canWalk(f.right-1,(f.top+f.bottom)/2),false,b.id);
  if(b.facing==='east')assert.ok(b.doorX>f.right);
  if(b.facing==='west')assert.ok(b.doorX<f.left);
 }
});

test('moving story guides without a daily-route seed always have drawable body coordinates',()=>{
 for(const id of ['customs','archive','curator','main'])for(let t=0;t<4;t+=.016){
  const actor={id,x:480,y:370,moving:true};const frame=residentWalkFrame(actor,t);
  assert.ok(Number.isFinite(actor.y-frame.bob));assert.ok(Number.isFinite(6+frame.step));
  assert.ok(Math.abs(frame.step)<=2);assert.ok(frame.bob<=.9);
 }
 assert.deepEqual(residentWalkFrame({moving:true,reducedMotion:true},1),{step:0,bob:0});
});
