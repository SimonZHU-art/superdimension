import {LIFE_LAMPS,LIFE_FACILITY,INDUSTRY_ENTRY,MUSEUM_ENTRY} from '../shared/lifeConfig.js';
// Every shape and sprite in this island is authored in code; no external game assets.
export const WORLD_SIZE = { width: 1440, height: 900 };
export const WORLD_PALETTE = {
  water: '#65a6a5', waterLight: '#82b6ae', deepWater: '#508d92',
  grass: '#91ad6b', grassLight: '#a8bc78', grassShade: '#7c9b5e',
  sand: '#dfc592', path: '#dfc18c', cedar: '#496644',
  ink: '#49372e', parchment: '#fff0d2', terracotta: '#b96b50',
  honey: '#dfb257', dusk: '#535d79',
};

export const SHORE = [
  [168,111],[206,88],[277,77],[335,66],[395,77],[458,60],[505,71],
  [555,62],[617,77],[658,65],[710,83],[758,81],[796,99],[839,113],
  [859,151],[870,177],[855,211],[877,235],[873,270],[893,296],
  [878,326],[884,358],[857,376],[866,410],[842,433],[835,465],
  [789,486],[762,508],[717,506],[677,532],[633,522],[593,539],
  [550,529],[508,544],[465,531],[420,545],[382,530],[329,541],
  [292,521],[254,526],[219,505],[180,499],[157,473],[128,457],
  [121,425],[100,406],[116,370],[104,341],[121,312],[112,279],
  [128,249],[124,223],[143,195],[139,158],[157,142],
];

export const WORLD_BUILDINGS = [
  { id:'main', label:'云舟的家', x:393, y:83, w:126, h:105, roof:'#667f82', wall:'#d6c598', doorX:455, doorY:190, mark:'云', kind:'house' },
  { id:'meeting', label:'主会议室', x:533, y:106, w:83, h:78, roof:'#8c8392', wall:'#d5c2a4', doorX:572, doorY:187, mark:'会', kind:'house' },
  { id:'archive', label:'林间档案馆', x:229, y:193, w:112, h:96, roof:'#a87954', wall:'#d0bc8c', doorX:285, doorY:291, mark:'书', kind:'library' },
  { id:'curator', label:'织夏的工坊', x:647, y:203, w:109, h:92, roof:'#b96b50', wall:'#ddc49a', doorX:701, doorY:297, mark:'绘', kind:'atelier' },
  { id:'liaison', label:'风铃邮局', x:661, y:381, w:113, h:91, roof:'#b97955', wall:'#e2cc9e', doorX:718, doorY:474, mark:'信', kind:'post' },
  { id:'customs', label:'码头登记处', x:232, y:397, w:109, h:80, roof:'#728d82', wall:'#d8c596', doorX:286, doorY:479, mark:'渡', kind:'gate' },
  { id:'specialist', label:'星禾的研究室', x:765, y:105, w:73, h:103, roof:'#6e8d8b', wall:'#ddd1ac', doorX:800, doorY:210, mark:'星', kind:'observatory' },
  { id:'gallery', label:'岛主作品小屋', x:454, y:397, w:115, h:70, roof:'#a78363', wall:'#d7bfa0', doorX:510, doorY:470, mark:'作', kind:'gallery' },
];

export const WORLD_NPCS = [
  {id:'main',label:'云舟',role:'主 Agent',x:442,y:216,coat:'#68846b',hair:'#4a3b31',route:[[442,216],[476,236],[494,278],[442,216]],pace:10},
  {id:'customs',label:'阿渡',role:'海关',x:316,y:478,coat:'#7494a6',hair:'#77533e',hat:'#527c8a',route:[[316,478],[347,454],[323,407],[316,478]],pace:9},
  {id:'archive',label:'知墨',role:'档案官',x:315,y:309,coat:'#af7956',hair:'#543e35',route:[[315,309],[348,303],[374,275],[315,309]],pace:8},
  {id:'curator',label:'织夏',role:'策展人',x:672,y:318,coat:'#b27b8c',hair:'#623e32',route:[[672,318],[630,334],[599,320],[672,318]],pace:10},
  {id:'liaison',label:'小邮',role:'联络官',x:678,y:483,coat:'#739567',hair:'#895c35',hat:'#647b50',route:[[678,483],[624,478],[588,449],[678,483]],pace:11},
  {id:'specialist',label:'星禾',role:'专项研究员',x:801,y:234,coat:'#9b93b5',hair:'#49444e',route:[[801,234],[772,259],[745,249],[801,234]],pace:8},
];

export const WORLD_ENVIRONMENT = [
  {id:'well',type:'environment',label:'许愿井',x:418,y:285,r:19},
  {id:'cat',type:'environment',label:'晒太阳的猫',x:515,y:345,r:17},
  {id:'bench',type:'environment',label:'银杏树下的长椅',x:581,y:279,r:27},
  {id:'water',type:'environment',label:'南岸的海风',x:407,y:521,r:26},
];

export const WORLD_AREAS = [
  {label:'云汀广场',x:474,y:314,r:100},
  {id:'main',label:'云舟的家',x:465,y:186,r:74},
  {id:'archive',label:'林间档案馆',x:286,y:286,r:78},
  {id:'curator',label:'织夏的工坊',x:705,y:292,r:83},
  {id:'liaison',label:'风铃邮局',x:711,y:454,r:90},
  {id:'specialist',label:'星禾的研究室',x:803,y:212,r:68},
  {label:'作品小屋',x:515,y:433,r:65},
  {label:'南岸码头',x:288,y:477,r:125},
  {label:'银杏小径',x:580,y:277,r:76},
];

export const WORLD_TREES = [
  [165,176,1.25],[190,154,.9],[221,142,1.05],[254,115,1.1],[293,128,.85],
  [334,100,1.1],[357,135,.8],[365,202,.75],[185,262,1.25],[149,308,.9],
  [175,352,1.05],[200,397,.88],[158,438,.72],[189,477,.7],
  [598,258,1.16,'gold'],[589,207,.83],[639,151,.92],[685,124,1.04],
  [722,173,.82],[854,213,.9],[838,277,1.05],[860,337,.86],
  [820,380,.93],[817,459,.82],[786,489,.72],[588,495,.82],
  [390,486,.88],[354,515,.7],[431,528,.55],
];

export function pointInPolygon(x,y,points=SHORE) {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const [xi,yi]=points[i], [xj,yj]=points[j];
    if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
}

// Shared with rendering so water collision follows the visible creek.
export const CREEK=[[871,319],[827,327],[802,339],[768,347],[746,363],[773,377],[808,390],[842,404]];
export const CREEK_BRIDGE={x:739,y:350};
export function onCreekBridge(x,y){return x>=CREEK_BRIDGE.x-25&&x<=CREEK_BRIDGE.x+33&&y>=CREEK_BRIDGE.y-36&&y<=CREEK_BRIDGE.y+44;}
export function inCreek(x,y){return CREEK.slice(1).some(([bx,by],i)=>{const [ax,ay]=CREEK[i],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-ax-t*dx,y-ay-t*dy )<18;});}
export function canWalk(x,y) {
  if(x>864&&x<907&&y>131&&y<151)return false;
  if(!pointInPolygon(x,y)&&!onBoardingPath(x,y)&&!(x>799&&x<850&&y>35&&y<145)) return false;
  if(LIFE_LAMPS.some(l=>Math.hypot(x-l.x,y-l.y)<4))return false;
  if(Math.abs(x-LIFE_FACILITY.x)<33&&y>LIFE_FACILITY.y-17&&y<LIFE_FACILITY.y+6)return false;
  if(Math.abs(x-INDUSTRY_ENTRY.x)<19&&Math.abs(y-INDUSTRY_ENTRY.y)<6)return false;
  if(inCreek(x,y)&&!onCreekBridge(x,y))return false;
  for(const b of WORLD_BUILDINGS) {
    const wall=b.footprint||{left:b.x-5,right:b.x+b.w+5,top:b.y+23,bottom:b.y+b.h+1};
    if(x>wall.left&&x<wall.right&&y>wall.top&&y<wall.bottom) return false;
  }
  for(const [tx,ty,s] of WORLD_TREES) {
    if(Math.hypot(x-tx,y-ty)<8*s) return false;
  }
  const well=WORLD_ENVIRONMENT.find(e=>e.id==='well'),bench=WORLD_ENVIRONMENT.find(e=>e.id==='bench'),laundry=WORLD_ENVIRONMENT.find(e=>e.id==='laundry');
  if(Math.hypot(x-well.x,y-well.y)<25)return false;
  if(Math.abs(x-bench.x)<23&&y>bench.y-10&&y<bench.y+4)return false;
  if(laundry&&Math.abs(x-laundry.x)<46&&y>laundry.y-10&&y<laundry.y+5)return false;
  if(((x-937.5)/24)**2+((y-402)/13)**2<1) return false;
  return true;
}

export function moveWithCollision(position,dx,dy) {
  const next={...position};
  // Substeps prevent a slow frame from tunnelling across a wall.
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/3));
  for(let i=0;i<steps;i++) {
    if(canWalk(next.x+dx/steps,next.y)) next.x+=dx/steps;
    if(canWalk(next.x,next.y+dy/steps)) next.y+=dy/steps;
  }
  return next;
}

export function locationAt(x,y,names={}) {
  if(onBoardingPath(x,y)&&!pointInPolygon(x,y))return '靠岸的小船与码头';
  let nearest=null, distance=Infinity;
  for(const area of WORLD_AREAS) {
    const d=Math.hypot(x-area.x,y-area.y);
    if(d<area.r&&d<distance){nearest=area;distance=d;}
  }
  return nearest?.id?buildingLabel(nearest.id,names):nearest?.label||'云汀小径';
}

// Static ground geometry is shared by every route. Rechecking identical grid
// edges for several residents in one animation frame made stage changes stall.
const navigationCells=new Map(),navigationEdges=new Map();
export function clearNavigationCache(){navigationCells.clear();navigationEdges.clear();}
// A small A* grid keeps a click on the far side of a house from walking into it.
export function findWalkPath(from,to) {
  if(!canWalk(from.x,from.y)||!canWalk(to.x,to.y))return [];
  const unit=12,columns=120,rows=75;
  const safeSegment=(a,b)=>{
    const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.5));
    for(let i=0;i<=n;i++)if(!canWalk(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n))return false;
    return true;
  };
  if(safeSegment(from,to))return [to];
  function gridPoint(point){
    let closest=null,distance=Infinity;
    const cx=Math.round(point.x/unit),cy=Math.round(point.y/unit);
    for(let ox=-2;ox<=2;ox++)for(let oy=-2;oy<=2;oy++){
      const x=cx+ox,y=cy+oy,p={x:x*unit,y:y*unit};
      const d=Math.hypot(point.x-p.x,point.y-p.y);
      if(x>=0&&x<columns&&y>=0&&y<rows&&d<distance&&canWalk(p.x,p.y)&&safeSegment(point,p)){closest={...p,index:y*columns+x};distance=d;}
    }
    return closest;
  }
  const start=gridPoint(from),goal=gridPoint(to);if(!start||!goal)return [];
  const gridClear=p=>{if(!navigationCells.has(p.index))navigationCells.set(p.index,canWalk(p.x,p.y));return navigationCells.get(p.index);};
  const edgeClear=(a,b)=>{const key=a.index<b.index?a.index+':'+b.index:b.index+':'+a.index;if(!navigationEdges.has(key))navigationEdges.set(key,safeSegment(a,b));return navigationEdges.get(key);};
  const open=[{...start,g:0,f:Math.hypot(start.x-goal.x,start.y-goal.y)}],cost=new Map([[start.index,0]]),parents=new Map(),closed=new Set();
  let end=null;
  while(open.length){
    let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;
    const current=open.splice(best,1)[0];if(closed.has(current.index))continue;
    if(current.index===goal.index){end=current;break;}closed.add(current.index);
    for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++){
      if(!ox&&!oy)continue;
      const gx=current.x/unit+ox,gy=current.y/unit+oy,index=gy*columns+gx;
      const next={x:gx*unit,y:gy*unit,index};
      if(gx<0||gx>=columns||gy<0||gy>=rows||closed.has(index)||!gridClear(next)||!edgeClear(current,next))continue;
      const g=current.g+Math.hypot(ox,oy)*unit;if(g>=(cost.get(index)??Infinity))continue;
      cost.set(index,g);parents.set(index,current);open.push({...next,g,f:g+Math.hypot(next.x-goal.x,next.y-goal.y)});
    }
  }
  if(!end)return [];
  const route=[to];let cursor=end;while(cursor){route.unshift({x:cursor.x,y:cursor.y});cursor=parents.get(cursor.index);}
  // Remove grid stair-steps wherever the segment is actually clear.
  const result=[];let anchor=from,index=0;
  while(index<route.length){let far=index;while(far+1<route.length&&safeSegment(anchor,route[far+1]))far++;result.push(route[far]);anchor=route[far];index=far+1;}
  return result;
}

export const BOAT_SPAWN = {x:114,y:730.5};
export function controlledCharacter(isOwner,avatar={},name='岛主',visitorName='松果'){
 return isOwner?{coat:avatar.body||'#68846b',hair:avatar.hair||'#4a3b31',skin:avatar.skin||'#efbc91',hat:avatar.hat||null,label:`${name} · 你`,isOwner:true}:{coat:'#d9af6c',hair:'#684c38',skin:'#e4bf8f',hat:'#c6a272',label:`${visitorName} · 你`,isOwner:false};
}
function nearBoardingSegment(x,y,a,b,r=9){
 const dx=b[0]-a[0],dy=b[1]-a[1];const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
 return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)<=r;
}
export function onBoardingPath(x,y){
 return x>=81&&x<=144&&y>=720&&y<=739.5||nearBoardingSegment(x,y,[114,730.5],[132,693],10.5)||nearBoardingSegment(x,y,[132,693],[217.5,646.5],12);
}

export function createLeisureRoute(){
 const stops=[{x:442,y:216},{x:374,y:300},{x:208,y:327},{x:178,y:398},{x:208,y:480},{x:335,y:500},{x:442,y:216}];
 stops.forEach(p=>{p.x*=1.5;p.y*=1.5;});const route=[stops[0]];
 for(let i=1;i<stops.length;i++)route.push(...findWalkPath(route.at(-1),stops[i]));
 return route;
}

export function swapControlledPosition(controlled,free){
 const pose=actor=>({x:actor.x,y:actor.y,direction:actor.direction||'down'});
 return {controlled:pose(free),released:pose(controlled)};
}
export function routePose(route,elapsed,reducedMotion=false,speed=14){
 const segments=route.slice(1).map((to,i)=>({from:route[i],to,length:Math.hypot(to.x-route[i].x,to.y-route[i].y)}));
 const duration=segments.reduce((sum,s)=>sum+s.length/speed+4,0);
 if(!segments.length||reducedMotion)return {...route[0],moving:false,direction:'down'};
 let phase=Math.max(0,elapsed)%duration,segment=segments[0];
 for(const candidate of segments){segment=candidate;const length=candidate.length/speed+4;if(phase<=length)break;phase-=length;}
 const walking=segment.length/speed,progress=Math.min(1,phase/Math.max(.01,walking)),dx=segment.to.x-segment.from.x,dy=segment.to.y-segment.from.y;
 return {x:segment.from.x+dx*progress,y:segment.from.y+dy*progress,moving:phase<walking,direction:Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up')};
}


export function buildingLabel(id,names={}) {
  const building=WORLD_BUILDINGS.find(b=>b.id===id);
  const suffix={main:'的家',archive:'的档案馆',curator:'的工坊',liaison:'的邮局',customs:'的登记处',specialist:'的研究室'}[id];
  return suffix&&names[id]?`${names[id]}${suffix}`:building?.label||'';
}

// Expanded ground plan retains native sprite sizes and original character identities.
SHORE.forEach(p=>{p[0]*=1.5;p[1]*=1.5;});
WORLD_BUILDINGS.forEach(b=>{b.x=b.x*1.5;b.y=b.y*1.5;b.doorX=b.x+b.w/2;b.doorY=b.y+b.h+3;});
WORLD_NPCS.forEach(n=>{n.x*=1.5;n.y*=1.5;n.route=n.route.map(([x,y])=>[x*1.5,y*1.5]);});
WORLD_ENVIRONMENT.forEach(p=>{p.x*=1.5;p.y*=1.5;});
WORLD_AREAS.forEach(p=>{p.x*=1.5;p.y*=1.5;p.r*=1.3;});
WORLD_TREES.forEach(p=>{p[0]*=1.5;p[1]*=1.5;});
CREEK.forEach(p=>{p[0]*=1.5;p[1]*=1.5;});CREEK_BRIDGE.x*=1.5;CREEK_BRIDGE.y*=1.5;

// Public venues have the same doors, walls and collision rules as resident homes.
for (const b of [
 {id:'industry',label:'行业工坊',x:820,y:610,w:116,h:82,roof:'#558b88',wall:'#d9cba3',mark:'工',kind:'atelier'},
 {id:'museum',label:'雾中生物展馆',x:510,y:560,w:120,h:88,roof:'#747797',wall:'#c9c8b3',mark:'雾',kind:'library'},
]) {b.doorX=b.x+b.w/2;b.doorY=b.y+b.h+3;WORLD_BUILDINGS.push(b);Object.assign(b.id==='industry'?INDUSTRY_ENTRY:MUSEUM_ENTRY,{x:b.doorX,y:b.doorY});}

// An open woodland creek separates the laboratory bank and drains into the sea.
// Sample smooth cubic bends once; drawing, collision and pathfinding share them.
const creekBends=[
 [[1065,85],[1070,145],[1105,165],[1100,220]],
 [[1100,220],[1095,277],[1125,319],[1185,326]],
 [[1185,326],[1240,334],[1280,310],[1320,348]],
 [[1320,348],[1340,365],[1360,370],[1390,382]],
];
CREEK.splice(0,CREEK.length,...creekBends.flatMap(([a,b,c,d],segment)=>Array.from({length:25},(_,i)=>{
 const t=i/24,u=1-t;return [0,1].map(k=>u*u*u*a[k]+3*u*u*t*b[k]+3*u*t*t*c[k]+t*t*t*d[k]);
}).slice(segment?1:0)));
CREEK_BRIDGE.x=1185;CREEK_BRIDGE.y=326;
const scientist=WORLD_NPCS.find(n=>n.id==='specialist');Object.assign(scientist,{x:1185,y:280,route:[[1185,280],[1210,280],[1195,293],[1155,280],[1185,280]]});

// Doors face the streets they actually meet; walls share this footprint with drawing.
for(const b of WORLD_BUILDINGS){
 b.facing=({archive:'east',curator:'west',industry:'east'})[b.id]||'south';
 b.footprint={left:b.x-5,right:b.x+b.w+9,top:b.y+23,bottom:b.y+b.h+1};
 if(b.facing!=='south'){b.doorX=b.facing==='east'?b.footprint.right+5:b.footprint.left-5;b.doorY=b.y+b.h-15;}
}
// Human-scale cottages: keep every doorway fixed while tightening the mass around it.
for(const b of WORLD_BUILDINGS){
 b.w=Math.round(b.w*.9);b.h=Math.round(b.h*.88);
 if(b.facing==='south'){b.x=b.doorX-b.w/2;b.y=b.doorY-b.h-3;}
 else {b.x=b.facing==='east'?b.doorX-b.w-14:b.doorX+10;b.y=b.doorY-b.h+15;}
 b.footprint={left:b.x-5,right:b.x+b.w+9,top:b.y+23,bottom:b.y+b.h+1};
}
Object.assign(INDUSTRY_ENTRY,{x:WORLD_BUILDINGS.find(b=>b.id==='industry').doorX,y:WORLD_BUILDINGS.find(b=>b.id==='industry').doorY});

// Decorations sit on clear ground, away from thresholds, crossings and interactive props.
export function canPlaceDecoration(x,y,placements=[],id=null){
 if(!Number.isFinite(x)||!Number.isFinite(y))return false;
 for(const [dx,dy] of [[0,0],[-18,0],[18,0],[0,-18],[0,18]])if(!canWalk(x+dx,y+dy))return false;
 if(WORLD_BUILDINGS.some(b=>Math.hypot(x-b.doorX,y-b.doorY)<48))return false;
 if(Math.hypot(x-CREEK_BRIDGE.x,y-CREEK_BRIDGE.y)<65)return false;
 if([...LIFE_LAMPS,LIFE_FACILITY,INDUSTRY_ENTRY,MUSEUM_ENTRY].some(p=>Math.hypot(x-p.x,y-p.y)<35))return false;
 return !placements.some(p=>p.id!==id&&Math.hypot(x-p.x,y-p.y)<40);
}

// Set dressing stays off the road and has matching interaction/collision anchors.
Object.assign(WORLD_ENVIRONMENT.find(e=>e.id==='well'),{x:604,y:355,r:36,label:'广场石井'});
Object.assign(WORLD_ENVIRONMENT.find(e=>e.id==='bench'),{x:885,y:445,r:26});
WORLD_ENVIRONMENT.push({id:'laundry',type:'environment',label:'邮局旁的晾衣架',x:1160,y:705,r:48});
const southernTree=WORLD_TREES.find(p=>p[0]===585&&p[1]===729);if(southernTree){southernTree[0]=615;southernTree[1]=770;}
export const WORLD_PATHS=[
 [[218,647],[300,710],[402,725],[1048,725]],
 [[400,478],[1185,478]],
 [[486,478],[486,725]],[[965,478],[965,725]],
 ...WORLD_BUILDINGS.map(b=>b.facing==='south'?[[b.doorX,b.doorY<478?478:725],[b.doorX,b.doorY+6]]:[[b.id==='archive'?486:965,Math.max(478,b.doorY+8)],[b.id==='archive'?486:965,b.doorY+8],[b.doorX,b.doorY+8]])
];
