import test from 'node:test';
import assert from 'node:assert/strict';
import {canWalk, moveWithCollision, findWalkPath, WORLD_BUILDINGS} from '../src/worldData.js';
test('water and building interiors cannot be crossed in the outdoor world',()=>{
  assert.equal(canWalk(0,0),false);
  for(const b of WORLD_BUILDINGS) assert.equal(canWalk(b.x+b.w/2,b.y+b.h/2),false,b.id);
  assert.equal(canWalk(WORLD_BUILDINGS[0].doorX,WORLD_BUILDINGS[0].doorY+10),true);
});
test('a long movement cannot tunnel through a house wall',()=>{
  const b=WORLD_BUILDINGS[0],p=moveWithCollision({x:b.doorX,y:b.doorY+30},0,-140);
  assert.ok(p.y>=b.y+b.h); assert.ok(canWalk(p.x,p.y));
});
test('click route goes around a house with every segment walkable',()=>{
  const b=WORLD_BUILDINGS.find(b=>b.id==='archive'),start={x:b.x-18,y:b.y+b.h-10},end={x:b.x+b.w+18,y:b.y+b.h-10};
  const route=findWalkPath(start,end); assert.ok(route.length>1); assert.deepEqual(route.at(-1),end);
  let previous=start;
  for(const next of route){
    const steps=Math.ceil(Math.hypot(next.x-previous.x,next.y-previous.y));
    for(let i=0;i<=steps;i++) assert.ok(canWalk(previous.x+(next.x-previous.x)*i/steps,previous.y+(next.y-previous.y)*i/steps));
    previous=next;
  }
  assert.deepEqual(findWalkPath(start,{x:0,y:0}),[]);
});

test('a visitor can walk from the boat over the gangway to the island without entering open water',async()=>{
 const {BOAT_SPAWN}=await import('../src/worldData.js');
 assert.ok(canWalk(BOAT_SPAWN.x,BOAT_SPAWN.y));assert.equal(canWalk(76,520),false);
 const end={x:190,y:455},route=findWalkPath(BOAT_SPAWN,end);assert.ok(route.length);assert.deepEqual(route.at(-1),end);
 let previous=BOAT_SPAWN;
 for(const next of route){const steps=Math.ceil(Math.hypot(next.x-previous.x,next.y-previous.y));for(let i=0;i<=steps;i++)assert.ok(canWalk(previous.x+(next.x-previous.x)*i/steps,previous.y+(next.y-previous.y)*i/steps));previous=next;}
});
test('controlled identity changes to configured owner and restores the visitor on logout',async()=>{
 const {controlledCharacter}=await import('../src/worldData.js');
 const avatar={body:'#112233',hair:'#223344',skin:'#334455',hat:'#445566'};
 const guest=controlledCharacter(false,avatar,'TEST岛主');assert.equal(guest.label,'松果 · 你');assert.notEqual(guest.coat,avatar.body);
 const owner=controlledCharacter(true,avatar,'TEST岛主');assert.equal(owner.label,'TEST岛主 · 你');assert.equal(owner.coat,avatar.body);assert.equal(owner.hat,avatar.hat);
 assert.deepEqual(controlledCharacter(false),guest);
});
test('leisure resident route reaches woodland and beach without crossing obstacles',async()=>{
 const {createLeisureRoute}=await import('../src/worldData.js');const route=createLeisureRoute();assert.ok(route.some(p=>p.x<330));assert.ok(route.some(p=>p.y>=720));
 for(let n=1;n<route.length;n++){const a=route[n-1],b=route[n],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y));for(let i=0;i<=steps;i++)assert.ok(canWalk(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps));}
});

test('control exchange preserves both character positions, and the released visitor starts there',async()=>{
 const {swapControlledPosition,routePose,createLeisureRoute}=await import('../src/worldData.js');
 const guest={x:190,y:455,direction:'right'},owner={x:442,y:216,direction:'down'};
 const swapped=swapControlledPosition(guest,owner);assert.deepEqual(swapped.controlled,owner);assert.deepEqual(swapped.released,guest);
 const route=[swapped.released,...findWalkPath(swapped.released,owner),...createLeisureRoute().slice(1),...findWalkPath(owner,swapped.released)];
 const start=routePose(route,0);assert.equal(start.x,guest.x);assert.equal(start.y,guest.y);
 const moving=routePose(route,2);assert.ok(Math.hypot(moving.x-guest.x,moving.y-guest.y)>0);assert.ok(canWalk(moving.x,moving.y));
 const reverted=swapControlledPosition(owner,moving);assert.equal(reverted.controlled.x,moving.x);assert.deepEqual(reverted.released,owner);
});

test('creek blocks wading while its bridge permits crossing',async()=>{
 const {CREEK,inCreek,onCreekBridge,pointInPolygon}=await import('../src/worldData.js');
 assert.equal(pointInPolygon(...CREEK[0]),false);assert.equal(pointInPolygon(...CREEK.at(-1)),false);
 assert.ok(Math.hypot(CREEK[0][0]-CREEK.at(-1)[0],CREEK[0][1]-CREEK.at(-1)[1])>300,'creek is open, not a circular moat');
 for(const [x,y] of CREEK)if(!onCreekBridge(x,y))assert.equal(canWalk(x,y),false);
 assert.ok(canWalk(1185,326));
 const blocked=moveWithCollision({x:1050,y:240},200,0);assert.ok(blocked.x<1100);
 const across=moveWithCollision({x:1185,y:280},0,90);assert.ok(Math.abs(across.y-370)<.001);
 const scientist=WORLD_BUILDINGS.find(b=>b.id==='specialist'),goal={x:scientist.doorX,y:scientist.doorY+8},start={x:716,y:478};const route=findWalkPath(start,goal);assert.ok(route.length);
 let last=start,crossed=false;for(const point of route){const n=Math.ceil(Math.hypot(point.x-last.x,point.y-last.y));for(let i=0;i<=n;i++){const x=last.x+(point.x-last.x)*i/n,y=last.y+(point.y-last.y)*i/n;assert.ok(canWalk(x,y));if(inCreek(x,y)){assert.ok(onCreekBridge(x,y));crossed=true;}}last=point;}
 assert.ok(crossed,'laboratory bank can only be reached over the bridge');
});

test('expanded escort and four guarding lamps all have walkable approaches',async()=>{
 const {BOAT_SPAWN,WORLD_SIZE}=await import('../src/worldData.js');const {LIFE_LAMPS}=await import('../shared/lifeConfig.js');assert.deepEqual(WORLD_SIZE,{width:1440,height:900});
 const house=WORLD_BUILDINGS.find(b=>b.id==='main');const goals=[{x:house.doorX,y:house.doorY+8},...LIFE_LAMPS.map(l=>({x:l.x+12,y:l.y+12}))];let from=BOAT_SPAWN;
 for(const goal of goals){const route=findWalkPath(from,goal);assert.ok(route.length,JSON.stringify(goal));let previous=from;for(const p of route){const n=Math.ceil(Math.hypot(p.x-previous.x,p.y-previous.y));for(let i=0;i<=n;i++)assert.ok(canWalk(previous.x+(p.x-previous.x)*i/n,previous.y+(p.y-previous.y)*i/n));previous=p;}from=goal;}
});

test('public workshop and museum have solid walls and reachable real doors',()=>{
 for(const id of ['industry','museum']){const b=WORLD_BUILDINGS.find(b=>b.id===id);assert.ok(b);assert.equal(canWalk(b.x+b.w/2,b.y+b.h/2),false);const goal={x:b.doorX,y:b.doorY+8};assert.ok(canWalk(goal.x,goal.y));const route=findWalkPath({x:716,y:478},goal);assert.ok(route.length,id);assert.ok(Math.hypot(route.at(-1).x-goal.x,route.at(-1).y-goal.y)<15,id);}
});

test('shore treasure glints are on reachable dry land',async()=>{
 const {SHORE_TREASURES}=await import('../shared/lifeConfig.js');for(const t of SHORE_TREASURES){assert.ok(canWalk(t.x,t.y),t.id);assert.ok(findWalkPath({x:716,y:478},{x:t.x,y:t.y}).length,t.id);}
});

test('town landmarks have reachable approaches and road centres avoid building walls',async()=>{
 const {WORLD_ENVIRONMENT,WORLD_PATHS}=await import('../src/worldData.js');const {LIFE_FACILITY}=await import('../shared/lifeConfig.js');
 for(const p of [LIFE_FACILITY,...WORLD_ENVIRONMENT.filter(p=>['well','laundry','bench'].includes(p.id))]){assert.equal(canWalk(p.x,p.y),false,p.id+' has a solid base');const goal={x:p.x,y:p.y+32};assert.ok(canWalk(goal.x,goal.y),p.id);assert.ok(findWalkPath({x:716,y:478},goal).length,p.id+' reachable');}
 for(const path of WORLD_PATHS)for(let i=1;i<path.length;i++){const [ax,ay]=path[i-1],[bx,by]=path[i],n=Math.ceil(Math.hypot(bx-ax,by-ay));for(let j=0;j<=n;j++){const x=ax+(bx-ax)*j/n,y=ay+(by-ay)*j/n;for(const b of WORLD_BUILDINGS)assert.ok(!(x>b.x-5&&x<b.x+b.w+5&&y>b.y+23&&y<b.y+b.h+1),'road through '+b.id);}}
});
