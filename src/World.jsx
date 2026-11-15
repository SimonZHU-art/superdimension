import {dailyObjects,dailySkeleton,dailyEnding} from '../shared/dailyStories.js';
import {drawDailyObjects,drawDailyGesture} from './dailyStoryArt.js';
import {advanceDailyCast,newDailyPerformance,dailyPresentationMinute} from './dailyStoryMotion.js';
import {NORTH_DOCK} from '../shared/voyageConfig.js';
import {drawNorthBoat} from './voyageArt.js';
import {STORY_RESIDENTS,COMBAT_RULES,strikeInRange} from '../shared/storyResidents.js';
import {createFogSound} from './fogSound.js';
import {drawCreature} from './fogCreatures.js';
import {storyDoorAllowed,chapterFor,CHAPTERS} from '../shared/fogStory.js';
import React, { useEffect, useRef, useState } from 'react';
import {
  WORLD_SIZE, WORLD_PALETTE as P, SHORE, WORLD_BUILDINGS, WORLD_NPCS,
  CREEK, CREEK_BRIDGE, WORLD_PATHS, canPlaceDecoration, WORLD_ENVIRONMENT, WORLD_TREES, buildingLabel, canWalk, moveWithCollision, locationAt, findWalkPath, BOAT_SPAWN, controlledCharacter, createLeisureRoute, swapControlledPosition, routePose,
} from './worldData.js';
import { LIFE_POINTS,LIFE_LAMPS,LIFE_PICKUPS,LIFE_FACILITY,INDUSTRY_ENTRY,SHORE_TREASURES,visibleLampIds } from '../shared/lifeConfig.js';
import { createTownMusic } from './townMusic.js';
import { createWeatherAudio } from './weatherAudio.js';
import { mixColor } from './islandWeather.js';
import { residentPresence } from './residentLife.js';
import { advanceResident, residentWalkFrame } from './residentMotion.js';
import { sceneViewport, roomView, scenePoint } from './sceneViewport.js';
import {speechLines,speechFrame} from './speechBubbles.js';

const {width:W,height:H}=WORLD_SIZE;
const VW=960,VH=600;
const square={x:716,y:478};
const paths=WORLD_PATHS;

const flowerBeds=[ [355,163,23,10,'#e5ca73'],[626,300,13,31,'#dea9a1'],[782,341,25,11,'#ead077'],[366,449,25,14,'#edd7b7'],[601,423,26,11,'#c58da7'],[252,357,34,17,'#d8c46b'] ];
const lanterns=[]; // Only the four playable guarding lamps are drawn.
const round=n=>Math.round(n);
const random=(n)=>{const v=Math.sin(n*78.233+18.19)*43758.5453;return v-Math.floor(v);};
const rect=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(round(x),round(y),round(w),round(h));};
function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(round(x),round(y)):c.moveTo(round(x),round(y)));c.closePath();c.fill();}
function line(c,points,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(round(x),round(y)):c.moveTo(round(x),round(y)));c.stroke();}
function ellipse(c,color,x,y,rx,ry){c.fillStyle=color;c.beginPath();c.ellipse(round(x),round(y),rx,ry,0,0,Math.PI*2);c.fill();}
function text(c,value,x,y,size=11,color=P.ink){c.font=`500 ${size}px "PingFang SC", "Microsoft YaHei", sans-serif`;c.textAlign='center';c.fillStyle=color;c.fillText(value,round(x),round(y));}
function shadow(c,x,y,w=15,h=6){ellipse(c,'rgba(57,77,57,.19)',x+4,y+2,w,h);}

function drawTerrain(c){
 rect(c,P.water,0,0,W,H);for(let i=0;i<180;i++)rect(c,'rgba(203,233,215,.18)',random(i)*W,random(i+2)*H,9,1);
 poly(c,SHORE.map(([x,y])=>[x+8,y+13]),'#518c82');line(c,[...SHORE,SHORE[0]],'#b9ccab',25);poly(c,SHORE,P.grass);line(c,[...SHORE,SHORE[0]],P.sand,14);
 c.save();c.beginPath();SHORE.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();
 for(let i=0;i<450;i++)rect(c,[P.grassLight,P.grassShade,'#9ab572'][i%3],random(i+8)*W,random(i+19)*H,2+i%3,1);c.restore();
 c.save();c.beginPath();c.rect(0,0,W,H);for(const b of WORLD_BUILDINGS)c.rect(b.x-7,b.y+20,b.w+14,b.h-15);c.clip('evenodd');
 // Draw the entire network in layers: intersections share one uninterrupted surface.
 for(const route of paths)line(c,route,'#a59678',42);
 for(const route of paths)line(c,route,'#c9bd9e',37);
 for(const route of paths)line(c,route,'#d8cfb6',31);
 const onRoad=(x,y)=>paths.some(route=>route.slice(1).some(([bx,by],i)=>{const [ax,ay]=route[i],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-ax-t*dx,y-ay-t*dy)<12;}));
 for(let y=245;y<745;y+=9)for(let x=285+(Math.floor(y/9)%2)*9;x<1210;x+=19)if(onRoad(x,y)&&onRoad(x+12,y+5)){rect(c,'#b6ab90',x,y,14,6);rect(c,['#d8ceb3','#d0c5a9','#e0d6bc'][Math.floor(random(x+y)*3)],x+1,y,12,5);}
 for(const b of WORLD_BUILDINGS){rect(c,'#a79a7e',b.doorX-21,b.doorY+2,42,13);rect(c,'#d9cfb4',b.doorX-20,b.doorY+2,40,10);line(c,[[b.doorX,b.doorY+2],[b.doorX,b.doorY+12]],'#b8ab8c',1);}
 c.restore();
 ellipse(c,'#b09e78',716,478,76,42);ellipse(c,'#dccb9f',716,476,73,39);for(let i=0;i<80;i++){const x=650+random(i)*132,y=441+random(i+80)*70;if(((x-716)/68)**2+((y-476)/34)**2<1)rect(c,'#c7b58f',x,y,10,5);}
 // Clip banks to dry land so both mouths merge with the coast, without circular caps.
 c.save();c.beginPath();SHORE.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();
 line(c,CREEK,'#b8b980',44);line(c,CREEK,P.water,36);
 line(c,CREEK.slice(12,-15),'rgba(192,223,207,.4)',2);c.restore();
 drawBridge(c,CREEK_BRIDGE.x,CREEK_BRIDGE.y);
 line(c,[[825,136],[784,136],[784,315],[858,315]],'#c4b58e',16);line(c,[[825,136],[784,136],[784,315],[858,315]],'#d9cda8',12);
 line(c,[[114,730.5],[132,693],[217.5,646.5]],'#735d44',18);line(c,[[114,730.5],[132,693],[217.5,646.5]],'#c5a377',14);for(let i=0;i<12;i++)line(c,[[133+i*6.5,686-i*3.5],[140+i*6.5,696-i*3.5]],'#8f7557',2);
 poly(c,[[81,730],[93,720],[134,720],[149,730],[134,741],[93,741]],'#795c43');poly(c,[[89,730],[98,724],[131,724],[141,730],[131,735],[98,735]],'#d3b786');
 for(const b of WORLD_BUILDINGS){const x=b.x-14,y=b.y+b.h+13;rect(c,'#9a805e',x-4,y-3,25,12);for(let i=0;i<6;i++)drawFlower(c,x+i*4,y-2,i%2?'#d4a7a2':'#e0ca8b');line(c,[[b.x-8,b.y+b.h+20],[b.x+22,b.y+b.h+20]],'#c4af7b',3);rect(c,'#8c7557',b.x-8,b.y+b.h+13,3,15);}

 for(const [x,y] of lanterns)drawLantern(c,x,y);
}

function drawBridge(c,x,y){
 shadow(c,x+5,y+36,29,7);rect(c,'#6f604b',x-23,y-36,52,80);rect(c,'#c9ae80',x-21,y-36,48,78);
 for(let i=0;i<13;i++)line(c,[[x-20,y-34+i*6],[x+26,y-34+i*6]],'#8f7658',2);
 for(const side of [-25,30]){line(c,[[x+side,y-38],[x+side,y+42]],'#795f43',4);for(const yy of [-35,-10,15,40])rect(c,'#8e7052',x+side-2,y+yy-9,5,12);}
}
function drawFlower(c,x,y,color){rect(c,'#607d47',x,y,1,5);rect(c,color,x-2,y-1,5,3);rect(c,color,x-1,y-2,3,5);rect(c,'#e8ce75',x,y,1,1);}
function drawBush(c,x,y,color){shadow(c,x,y,14,4);rect(c,color,x-11,y-8,22,10);rect(c,color,x-7,y-12,14,8);rect(c,'#a2b879',x-7,y-11,6,3);rect(c,'#607e4c',x+4,y-6,7,6);}
function drawLantern(c,x,y){shadow(c,x,y,6,2);rect(c,'#6d684d',x-1,y-26,3,27);rect(c,'#716c4c',x-5,y-29,11,2);rect(c,'#69746a',x-4,y-26,9,9);rect(c,'#7c8579',x-2,y-25,4,6);rect(c,'#6b644b',x-4,y-18,9,2);}
function drawMailbox(c,x,y){shadow(c,x,y,10,3);rect(c,'#76614c',x-2,y-16,4,17);rect(c,'#78948d',x-8,y-27,18,15);rect(c,'#aac2a6',x-8,y-27,18,3);rect(c,'#4d6b66',x-5,y-22,11,2);rect(c,'#d69565',x+8,y-29,5,2);rect(c,'#e9d4a2',x-4,y-18,8,3);}
function drawSign(c,x,y,label){rect(c,'#77614c',x-1,y-8,3,17);rect(c,'#b69868',x-15,y-16,33,12);rect(c,'#d8ba86',x-15,y-16,33,2);poly(c,[[x-5,y-8],[x-2,y-13],[x+6,y-13],[x+3,y-8]],'#5e7952');line(c,[[x-5,y-6],[x+4,y-12]],'#eee0b2',1);}
function drawWell(c){
 const x=418,y=285;shadow(c,x,y+3,29,9);
 ellipse(c,'#8a9180',x,y-4,25,13);rect(c,'#9da593',x-25,y-24,50,20);ellipse(c,'#c6c9b4',x,y-24,26,12);ellipse(c,'#354e4c',x,y-25,18,7);ellipse(c,'#597570',x,y-25,12,3);
 for(let row=0;row<2;row++)for(let i=0;i<4;i++){const xx=x-22+i*12+(row%2)*4;if(xx<x+22)rect(c,row?'#aeb59e':'#b9bea8',xx,y-19+row*8,10,6);}
 rect(c,'#745d42',x-24,y-65,5,43);rect(c,'#96764f',x+19,y-65,5,43);rect(c,'#ad8d5e',x-26,y-65,52,5);
 poly(c,[[x-33,y-64],[x,y-83],[x+33,y-64],[x+33,y-58],[x-33,y-58]],'#647e70');line(c,[[x-31,y-61],[x+31,y-61]],'#a4b49a',3);
 line(c,[[x-20,y-46],[x+22,y-46]],'#806440',5);rect(c,'#b49c72',x-3,y-50,8,8);line(c,[[x+1,y-45],[x+1,y-28]],'#c9b88f',1);
 rect(c,'#8b7052',x-42,y-12,13,14);rect(c,'#baa179',x-41,y-11,11,3);line(c,[[x-41,y-12],[x-39,y-19],[x-31,y-19],[x-30,y-12]],'#665c49',1);
}
function drawBench(c){const x=581,y=279;c.save();c.translate(x,y);c.scale(.72,.72);c.translate(-x,-y);shadow(c,x,y,32,7);for(const dx of [-25,23]){rect(c,'#626b5b',x+dx,y-9,4,13);rect(c,'#6e755f',x+dx,y-25,3,20);}for(let i=0;i<3;i++)rect(c,i===1?'#c0a475':'#a58a61',x-29,y-27+i*5,59,4);rect(c,'#cfb583',x-31,y-10,63,7);line(c,[[x-29,y-6],[x+30,y-6]],'#8e7957',1);c.restore();}
function drawLaundry(c,x,y,t,wet,reduced){
 shadow(c,x,y,49,9);ellipse(c,'#9eac88',x,y+1,51,12);
 for(const dx of [-44,44]){rect(c,'#806b4d',x+dx-2,y-54,5,56);rect(c,'#b3a073',x+dx-2,y-54,2,51);line(c,[[x+dx-7,y],[x+dx,y-17],[x+dx+7,y]],'#8e7854',3);}
 line(c,[[x-44,y-49],[x-20,y-46],[x+18,y-46],[x+44,y-49]],'#72694e',1);
 const sway=reduced?0:Math.sin(t*1.5)*1.5;
 poly(c,[[x-32,y-46],[x-24,y-48],[x-19,y-43],[x-11,y-46],[x-5,y-38],[x-11,y-31],[x-14,y-35],[x-14+sway,y-15],[x-32+sway,y-15],[x-33,y-35],[x-39,y-31],[x-42,y-39]],'#7696a0');
 line(c,[[x-25,y-43],[x-23+sway,y-17]],'#a5babc',1);
 for(const [dx,color] of [[1,'#e7dcc0'],[23,'#b8b7a3']]){poly(c,[[x+dx,y-46],[x+dx+14,y-47],[x+dx+14+sway,y-23],[x+dx+sway,y-24]],color);rect(c,'#977950',x+dx+3,y-49,2,6);}
 rect(c,'#ac8b5b',x-30,y-49,2,6);rect(c,'#ac8b5b',x-15,y-49,2,6);
 ellipse(c,'#879b93',x-22,y+1,17,5);ellipse(c,'#b8c3b4',x-22,y-2,18,5);ellipse(c,'#779d9d',x-22,y-3,14,3);
 if(wet)for(let i=0;i<3;i++){const drop=reduced?5:(t*17+i*5)%15;rect(c,'#b6ded4',x-29+i*6,y-15+drop,1,3);}
}

export function drawTree(c,[x,y,s,kind]) {
  c.save();c.translate(round(x),round(y));c.scale(s,s*1.7);
  shadow(c,3,3,24,8);rect(c,'#766546',-4,-30,8,31);rect(c,'#a08a56',-4,-25,3,25);line(c,[[-1,-17],[-13,-28]],'#766546',4);line(c,[[2,-23],[13,-33]],'#766546',4);
  const golden=kind==='gold';
  const dark=golden?'#a49b51':'#4f774e',mid=golden?'#c4b56c':'#688d57',light=golden?'#dac780':'#87a663';
  poly(c,[[-27,-31],[-29,-45],[-22,-45],[-22,-55],[-14,-55],[-14,-65],[-4,-68],[9,-64],[13,-56],[24,-54],[28,-42],[24,-31],[14,-26],[-15,-26]],dark);
  poly(c,[[-27,-42],[-20,-55],[-12,-62],[0,-66],[14,-58],[20,-49],[22,-38],[10,-33],[-7,-31],[-22,-34]],mid);
  poly(c,[[-21,-49],[-17,-57],[-9,-59],[-7,-64],[1,-64],[8,-57],[4,-51],[-2,-49],[-6,-42],[-17,-42]],light);
  rect(c,light,11,-49,6,4);rect(c,light,-21,-37,5,3);rect(c,dark,8,-33,10,5);rect(c,dark,-7,-38,5,3);
  c.restore();
}

function drawBuilding(c,b,night,active=false,t=0) {
  const {x,y,w,h,roof,wall}=b;
  shadow(c,x+w/2+9,y+h+3,w*.59,14);
  if(b.facing&&b.facing!=='south'){drawSideHouse(c,b,night,active,t);return;}
  if(b.kind==='observatory'){drawObservatory(c,b,night);drawBuildingDetails(c,b,active,t);return;}
  rect(c,'#76684c',x+2,y+36,w-4,h-36);
  rect(c,wall,x+4,y+42,w-8,h-43);
  rect(c,'#aa9367',x+4,y+42,6,h-43);rect(c,'#bba373',x+w-11,y+42,7,h-43);
  for(let i=0;i<5;i++)rect(c,'rgba(126,98,62,.15)',x+10,y+48+i*8,w-20,1);
  rect(c,'#a69165',x,y+h-5,w,7);rect(c,'#dcc396',x+2,y+h-5,w-4,2);
  // Stepped overhang, shingle courses, and tile highlights.
  poly(c,[[x-8,y+30],[x+w/2-8,y-3],[x+w/2+10,y-3],[x+w+9,y+30],[x+w+9,y+49],[x-8,y+49]],'#725e47');
  poly(c,[[x-7,y+28],[x+w/2-7,y-5],[x+w/2+9,y-5],[x+w+7,y+28],[x+w+7,y+43],[x-7,y+43]],roof);
  line(c,[[x-5,y+29],[x+w+5,y+29]],'rgba(247,210,155,.27)',2);line(c,[[x-5,y+36],[x+w+5,y+36]],'rgba(60,54,42,.22)',1);
  for(let row=0;row<5;row++){
    const yy=y+8+row*7, inset=Math.max(0,27-row*7);
    line(c,[[x+inset,yy],[x+w-inset,yy]],'rgba(52,57,49,.15)',1);
    for(let xx=x+inset+(row%2)*7;xx<x+w-inset;xx+=15)rect(c,'rgba(243,211,162,.2)',xx,yy,7,1);
  }
  rect(c,'#d5ba88',x-9,y+44,w+18,3);rect(c,'#7d674b',x-7,y+47,w+14,3);
  const doorX=x+w/2-9;
  rect(c,'#866c4c',doorX-3,y+h-32,24,33);rect(c,'#6f644b',doorX,y+h-29,18,29);rect(c,'#9b895d',doorX+2,y+h-27,6,25);rect(c,'#c8b176',doorX+14,y+h-15,2,2);rect(c,'#d9c396',doorX-5,y+h+1,28,4);
  windowBox(c,x+17,y+h-37,18,19,night);windowBox(c,x+w-35,y+h-37,18,19,night);
  if(b.kind==='main'||b.id==='main'){
    poly(c,[[x+46,y+20],[x+62,y+8],[x+79,y+20],[x+79,y+36],[x+46,y+36]],'#d4bc8d');poly(c,[[x+42,y+20],[x+62,y+4],[x+84,y+20]],'#465f66');windowBox(c,x+56,y+19,13,14,night);
    rect(c,'#bca275',x+w-22,y-5,12,23);rect(c,'#8e7b5b',x+w-24,y-8,16,4);rect(c,'#8e7b5b',x+w-20,y+1,7,2);
  }
  if(b.kind==='library'){rect(c,'#b09061',x+8,y+h-14,24,9);for(let i=0;i<5;i++)rect(c,['#738b73','#b18060','#c7b27a'][i%3],x+10+i*4,y+h-14,3,7);}
  if(b.kind==='atelier'){
    poly(c,[[x+34,y+h-33],[x+76,y+h-33],[x+82,y+h-20],[x+29,y+h-20]],'#d5b174');for(let i=0;i<4;i++)rect(c,'#e7c996',x+32+i*13,y+h-31,6,10);
    rect(c,'#916b4c',x+15,y+h-14,20,7);drawFlower(c,x+20,y+h-17,'#e6b1aa');drawFlower(c,x+29,y+h-16,'#edce8f');
  }
  if(b.kind==='post'){rect(c,'#7d9784',x+w/2-17,y+54,34,13);rect(c,'#d4dbb4',x+w/2-7,y+58,14,6);line(c,[[x+w/2-7,y+58],[x+w/2,y+62],[x+w/2+7,y+58]],'#81927b',1);rect(c,'#816e4c',x+w-10,y+h-18,8,15);drawFlower(c,x+w-7,y+h-20,'#e9cc7f');}
  if(b.kind==='gallery'){
    [[x+11,'#9caca1'],[x+w-29,'#b58b7a']].forEach(([xx,color])=>{rect(c,'#7a6046',xx,y+h-35,20,27);rect(c,'#e7d7b5',xx+2,y+h-33,16,23);poly(c,[[xx+3,y+h-16],[xx+9,y+h-26],[xx+17,y+h-16]],color);});
  }
  poly(c,[[x+w-13,y+43],[x+w+8,y+34],[x+w+8,y+h-9],[x+w-13,y+h]],'#ad9874');line(c,[[x+w-13,y+43],[x+w-13,y+h]],'#8d7958',2);line(c,[[x+w,y+38],[x+w+8,y+34]],'#665d51',2);rect(c,'#aa9877',b.doorX-16,b.doorY-1,32,5);rect(c,'#c9b998',b.doorX-20,b.doorY+4,40,5);
  drawBuildingDetails(c,b,active,t);
  if(b.kind==='gate'){line(c,[[x-6,y+44],[x-6,y+h]],'#836f4b',3);line(c,[[x+w+6,y+44],[x+w+6,y+h]],'#836f4b',3);rect(c,'#dfce9c',x+41,y+52,28,9);poly(c,[[x+55,y+53],[x+59,y+57],[x+55,y+61],[x+51,y+57]],'#687d57');}
}
// A long side wall and a short gabled entrance keep side-facing cottages upright.
function drawSideHouse(c,b,night,active,t){
 const {x,y,w,h}=b,east=b.facing==='east',frontWidth=27;
 c.save();if(!east){c.translate(2*x+w,0);c.scale(-1,1);}
 const far=x+12,near=x+w-frontWidth,base=y+h;
 poly(c,[[far,y+38],[near,y+47],[near,base],[far,base-12]],b.wall);
 poly(c,[[near,y+47],[x+w+8,y+33],[x+w+8,base-13],[near,base]],'#bba37e');
 for(let row=0;row<5;row++)line(c,[[far+2,y+50+row*8],[near-2,y+59+row*8]],'rgba(91,72,48,.16)',1);
 poly(c,[[x-7,y+33],[x+24,y-7],[x+w+2,y+2],[x+w+15,y+33],[near,y+49]],b.roof);
 poly(c,[[x+24,y-7],[x+w+2,y+2],[x+w+15,y+33],[near,y+49]],'#65716a');
 line(c,[[x-7,y+33],[near,y+49],[x+w+15,y+33]],'#dec89b',3);
 for(let row=1;row<5;row++)line(c,[[x-5+row*6,y+33-row*7],[near+row*4,y+49-row*8]],'rgba(248,222,175,.21)',1);
 for(const xx of [far+14,near-27])windowBox(c,xx,base-45,15,19,night);
 const door=x+w-10;
 poly(c,[[door-5,base-43],[door+12,base-50],[door+12,base-13],[door-5,base-6]],'#796247');
 poly(c,[[door-2,base-40],[door+9,base-45],[door+9,base-15],[door-2,base-10]],'#645e48');
 rect(c,'#e2c28d',door+5,base-28,2,3);
 line(c,[[far,base-12],[near,base],[x+w+9,base-13]],'#95805e',4);
 // A small entrance canopy and a readable sign belong to the actual door face.
 poly(c,[[door-10,base-44],[door+8,base-53],[door+19,base-49],[door+2,base-39]],'#829783');
 c.restore();
 rect(c,'#a99573',b.doorX-12,b.doorY-1,24,14);rect(c,'#ddcfac',b.doorX-10,b.doorY+1,20,9);
 if(b.id==='archive'){rect(c,'#dbc99d',x+w/2-9,y+39,18,11);line(c,[[x+w/2,y+40],[x+w/2,y+49]],'#89714f',1);}
 if(b.id==='curator'||b.id==='industry'){const xx=b.doorX+(east?14:-21);rect(c,'#8e7454',xx,b.doorY-24,3,27);rect(c,'#e0d2ae',xx-6,b.doorY-24,16,18);poly(c,[[xx-4,b.doorY-10],[xx+2,b.doorY-19],[xx+8,b.doorY-10]],'#859982');}
 if(active){const g=c.createRadialGradient(b.doorX,b.doorY,0,b.doorX,b.doorY,25);g.addColorStop(0,'rgba(255,227,158,.5)');g.addColorStop(1,'rgba(255,227,158,0)');c.fillStyle=g;c.fillRect(b.doorX-25,b.doorY-25,50,50);}
}
// Architectural details stay inside each building's existing footprint and doorway.
function drawBuildingDetails(c,b,active,t){
  const{x,y,w,h}=b,m=x+w/2;
  if(b.kind==='library'){
    poly(c,[[x-7,y+29],[m,y-15],[x+w+7,y+29]],'#655c4c');
    poly(c,[[x-2,y+27],[m,y-9],[x+w+2,y+27]],'#876b53');
    rect(c,'#d7c698',m-12,y+7,24,15);line(c,[[m,y+9],[m,y+20]],'#7c694c',1);
    for(let i=0;i<3;i++){line(c,[[m-9,y+11+i*3],[m-3,y+12+i*3]],'#9e885d',1);line(c,[[m+3,y+12+i*3],[m+9,y+11+i*3]],'#9e885d',1);}
    for(const xx of [x+7,x+w-25]){rect(c,'#70593f',xx,y+h-35,18,29);for(let row=0;row<2;row++)for(let i=0;i<4;i++)rect(c,['#799078','#c49a65','#9e6d5f','#b9b38a'][i],xx+2+i*4,y+h-32+row*13,3,10);}
  }
  if(b.kind==='atelier'){
    poly(c,[[x+13,y+25],[x+36,y+6],[x+65,y+6],[x+82,y+25]],'#71594c');
    poly(c,[[x+20,y+22],[x+38,y+10],[x+62,y+10],[x+74,y+22]],'#9db5ad');
    line(c,[[x+46,y+10],[x+46,y+22]],'#e2d2a4',2);line(c,[[x+60,y+10],[x+63,y+22]],'#e2d2a4',2);
    line(c,[[x+6,y+h-27],[x+1,y+h]],'#76583e',2);line(c,[[x+8,y+h-27],[x+15,y+h]],'#76583e',2);
    rect(c,'#f0dbb1',x-1,y+h-29,17,20);poly(c,[[x+1,y+h-12],[x+7,y+h-23],[x+14,y+h-12]],'#7b997b');
  }
  if(b.id==='meeting'){
    poly(c,[[x-7,y+31],[m,y-10],[x+w+7,y+31]],'#766b88');
    line(c,[[x-6,y+33],[x+w+6,y+33]],'#e2cf9f',3);
    for(const xx of [x+6,x+w-12]){rect(c,'#ebd9b3',xx,y+47,6,h-47);rect(c,'#ab9471',xx-2,y+h-3,10,4);}
    c.beginPath();c.arc(m,y+22,8,0,Math.PI*2);c.fillStyle='#d7c798';c.fill();line(c,[[m,y+16],[m,y+22],[m+4,y+24]],'#76674d',1);
  }
  if(b.kind==='post'){
    rect(c,'#765e43',x+9,y+25,w-18,15);rect(c,'#719080',x+11,y+27,w-22,11);
    rect(c,'#f0dfb5',m-10,y+28,20,9);line(c,[[m-10,y+28],[m,y+34],[m+10,y+28]],'#8d9270',1);
    rect(c,'#746247',x+w-17,y+h-20,3,20);rect(c,'#a45f4d',x+w-23,y+h-29,15,14);rect(c,'#ead29b',x+w-21,y+h-26,11,2);
  }
  if(b.kind==='gate'){
    poly(c,[[x-7,y+42],[x+w+7,y+42],[x+w+3,y+58],[x-3,y+58]],'#758f91');
    for(let i=0;i<7;i++)rect(c,i%2?'#d6d0a7':'#7a9994',x-3+i*16,y+44,14,13);
    rect(c,'#826c4f',x+9,y+h-21,22,19);rect(c,'#e6d5a9',x+11,y+h-19,18,14);line(c,[[x+14,y+h-15],[x+25,y+h-15]],'#9a8864',1);
  }
  if(b.kind==='gallery'){
    rect(c,'#77604e',x-6,y+20,w+12,18);rect(c,'#829787',x-3,y+22,w+6,13);
    for(let i=0;i<6;i++){rect(c,'#c1ccac',x+3+i*19,y+24,14,9);rect(c,'#e3d2aa',x+17+i*19,y+22,2,14);}
    rect(c,'#d5bc91',x-8,y+37,w+16,5);
  }
  if(b.id==='main'){
    for(const xx of [x+15,x+w-38]){rect(c,'#8c694d',xx,y+h-14,25,7);drawFlower(c,xx+5,y+h-16,'#efc992');drawFlower(c,xx+18,y+h-16,'#d5a6a4');}
  }
  if(active){
    const glow=c.createRadialGradient(b.doorX,b.doorY,1,b.doorX,b.doorY,24);glow.addColorStop(0,'rgba(255,227,158,.5)');glow.addColorStop(1,'rgba(255,227,158,0)');c.fillStyle=glow;c.fillRect(b.doorX-24,b.doorY-24,48,48);
    line(c,[[b.doorX-8,b.doorY+8],[b.doorX,b.doorY+4],[b.doorX+8,b.doorY+8]],'#fff0c4',2);
  }
}
function drawBuildingName(c,b,active){
  c.font='500 10px "PingFang SC", sans-serif';const width=c.measureText(b.label).width+16,x=b.x+b.w/2,y=b.y+b.h+15;
  rect(c,'rgba(51,55,39,.22)',x-width/2+1,y-5,width,17);
  rect(c,active?'#f1dfae':'#e0d1a9',x-width/2,y-7,width,16);
  rect(c,active?'#b18e55':'#a28c62',x-width/2,y+8,width,2);
  rect(c,'#9c825c',x-width/2+3,y-1,2,2);rect(c,'#9c825c',x+width/2-5,y-1,2,2);
  text(c,b.label,x,y+4,10,'#494f39');
}
function windowBox(c,x,y,w,h,night){rect(c,'#8d7652',x-2,y-2,w+4,h+4);rect(c,mixColor('#7b9c90','#edcb78',night),x,y,w,h);rect(c,mixColor('#adc1a0','#f8df9a',night),x+1,y+1,w/2-1,h/2-2);rect(c,'#ded0a0',x+w/2-1,y,2,h);rect(c,'#ded0a0',x,y+h/2, w,2);rect(c,'#a58c61',x-4,y+h+2,w+8,3);}
function drawObservatory(c,b,night){
  const{x,y,w,h}=b;
  rect(c,'#968d6c',x+7,y+24,w-14,h-24);rect(c,b.wall,x+10,y+25,w-20,h-25);
  for(let i=0;i<7;i++){rect(c,i%2?'#c5bc96':'#cec5a2',x+10,y+35+i*8,w-20,1);rect(c,'#b4ab87',x+12+(i%2)*12,y+35+i*8,1,7);}
  poly(c,[[x+1,y+29],[x+1,y+17],[x+8,y+17],[x+8,y+6],[x+20,y+6],[x+20,y-2],[x+50,y-2],[x+50,y+6],[x+63,y+6],[x+63,y+17],[x+72,y+17],[x+72,y+29]],b.roof);
  rect(c,'#a5b5a1',x+14,y+9,9,15);rect(c,'#879f97',x+22,y+1,16,4);rect(c,'#4d706c',x+44,y+10,5,19);rect(c,'#cfbf8d',x-1,y+28,w+2,5);
  windowBox(c,x+28,y+43,17,20,night);rect(c,'#867957',x+26,y+h-26,21,27);rect(c,'#626d5b',x+29,y+h-24,15,24);rect(c,'#bbac78',x+41,y+h-12,2,2);rect(c,'#ddd0a2',x+21,y+h,31,4);
  line(c,[[x+37,y-1],[x+37,y-12]],'#667965',2);rect(c,'#d9c176',x+36,y-14,4,4);
  // Telescope is unmistakably a research instrument, never a seventh NPC.
  line(c,[[x-7,y+h-14],[x-14,y+h+5]],'#77745c',2);line(c,[[x-7,y+h-14],[x+1,y+h+5]],'#77745c',2);line(c,[[x-19,y+h-18],[x+4,y+h-28]],'#647d76',5);rect(c,'#bcc9a7',x-20,y+h-21,4,7);
}

export function drawPerson(c,actor,t,player=false) {
  const x=round(actor.x),y=round(actor.y),moving=actor.moving&&!actor.reducedMotion;
  const {step,bob}=residentWalkFrame(actor,t);
  c.save();c.globalAlpha*=actor.opacity??1;c.translate(x,round(y-bob));if(actor.downed)c.rotate(-Math.PI/2);if(actor.reaction?.target==='curator'&&actor.reactionAge<1.6&&actor.reaction.count>1)c.scale(1,.68);if(actor.reaction&&actor.id==='specialist')c.rotate(Math.sin(actor.reactionAge*9)*.12);
  shadow(c,0,2,8,3);
  const skin=actor.skin||'#e4bf8f',coat=actor.coat||'#d6aa68',hair=actor.hair||'#654936';
  rect(c,'#5a5945',-5,-5,4,6+step);rect(c,'#5a5945',2,-5,4,6-step);rect(c,'#8b7755',-5,0+step,4,2);rect(c,'#8b7755',2,0-step,4,2);
  rect(c,coat,-6,-16,13,12);rect(c,coat,-8,-14+step*.4,3,8);rect(c,coat,7,-14-step*.4,3,8);rect(c,skin,-8,-7+step*.4,3,3);rect(c,skin,7,-7-step*.4,3,3);rect(c,'rgba(255,239,188,.28)',-5,-15,3,8);
  rect(c,'#e9d59f',0,-15,2,9);rect(c,'#7c7855',-6,-5,13,2);
  rect(c,skin,-5,-25,11,10);rect(c,hair,-6,-28,13,7);rect(c,hair,-6,-22,3,5);rect(c,hair,4,-23,3,5);rect(c,'#f2d3a1',-4,-20,3,3);
  if(actor.direction!=='up'){rect(c,'#584c3e',actor.direction==='left'?-4:actor.direction==='right'?3:-3,-21,1,2);if(actor.direction==='down')rect(c,'#584c3e',3,-21,1,2);}
  else rect(c,hair,-5,-24,11,8);
  if(actor.hat){c.save();if(actor.reaction&&actor.id==='liaison')c.rotate(.22);if(actor.reaction&&actor.id==='wanderer')c.translate(0,-Math.max(0,6*(1-actor.reactionAge/.6)));rect(c,actor.hat,-7,-29,15,3);rect(c,actor.hat,-5,-32,11,4);rect(c,'#e9cc8b',-5,-30,11,1);c.restore();}
  if(player&&!actor.isOwner){rect(c,'#c5a475',-9,-15,4,10);rect(c,'#e5c594',-9,-15,3,2);}
  if(actor.id==='archive'){if(!actor.reaction||actor.reactionAge>1.2){rect(c,'#667b89',9,-14,7,10);rect(c,'#e9ddbd',10,-13,4,8);}if(actor.reaction&&actor.reactionAge<.75){rect(c,skin,-15,-17,9,3);rect(c,skin,8,-18,9,3);}}
  if(actor.id==='specialist'){line(c,[[-5,-22],[5,-22]],'#596d64',1);rect(c,'#819796',-5,-24,4,4);rect(c,'#819796',2,-24,4,4);}
  if(actor.id==='curator'&&(!actor.reaction||actor.reactionAge>1.9))line(c,[[10,-17],[12,-5]],'#c8a36c',2);
  if(actor.id==='liaison'&&(!actor.reaction||actor.reactionAge>1.9))rect(c,'#e8d8b1',9,-12,7,5);
  c.restore();
  if(player){
    ellipse(c,'rgba(249,237,151,.4)',x,y+3,13,5);line(c,[[x-12,y+2],[x-7,y+6],[x+7,y+6],[x+12,y+2]],'#fff2be',1);
    poly(c,[[x-4,y-39],[x+4,y-39],[x,y-33]],'#fff0b6');
  }
  if(!player&&actor.showLabel){
    c.font='500 9px "PingFang SC", sans-serif';const width=c.measureText(actor.label||actor.name||'来访投影').width+9;
    rect(c,'rgba(255,242,206,.92)',x-width/2,y-45,width,14);text(c,actor.label||actor.name||'来访投影',x,y-35,9);
    if(actor.projection){rect(c,'#8c91ab',x+width/2-2,y-46,4,4);}
  }
}
function drawCat(c,t,reducedMotion){
  const x=515,y=345;shadow(c,x,y,10,3);rect(c,'#b59b6d',x-8,y-6,16,7);rect(c,'#dac69c',x-8,y-8,11,7);rect(c,'#dac69c',x+4,y-10,8,8);rect(c,'#bb9d6e',x+4,y-13,3,5);rect(c,'#bb9d6e',x+10,y-13,3,5);rect(c,'#685c45',x+6,y-7,2,1);rect(c,'#685c45',x+10,y-7,2,1);rect(c,'#e5d8b1',x+7,y-4,4,2);rect(c,'#ae8c5c',x-12,y-5,6,3);rect(c,'#ae8c5c',x-13,y-8-(reducedMotion?0:Math.sin(t)*1.5),3,5);
}

function hitTarget(x,y,actors,chapter,daily=[]) {
  // Names and roofs are clickable as well as tiny character bodies.
  for(const actor of [...actors].reverse())if(Math.abs(x-actor.x)<20&&y>actor.y-48&&y<actor.y+8)return {id:actor.id,type:'npc',label:actor.label||actor.name||'来访投影'};
  for(const env of [...daily,...LIFE_POINTS.filter(p=>p.id!=='trace'||chapter!=='tide'),...WORLD_ENVIRONMENT])if(Math.hypot(x-env.x,y-env.y)<env.r||(['well','laundry','flower-rack'].includes(env.id)&&Math.abs(x-env.x)<(env.id==='laundry'?46:34)&&y>env.y-(env.id==='well'?84:64)&&y<env.y+8))return {...env};
  for(const b of [...WORLD_BUILDINGS].reverse())if(x>Math.min(b.x-8,b.doorX-16)&&x<Math.max(b.x+b.w+16,b.doorX+16)&&y>b.y-5&&y<b.y+b.h+24)return {id:b.id,type:'building',label:b.label};
  return null;
}
function nearestTarget(player,actors,decorations=[],chapter,daily=[]) {
  const targets=[...daily,...decorations.map(p=>({...p,type:'decoration',label:'收回装饰'})),...actors.map(a=>({id:a.id,type:'npc',label:a.label||a.name||'来访投影',x:a.x,y:a.y})),...WORLD_ENVIRONMENT,...LIFE_POINTS.filter(p=>p.id!=='trace'||chapter!=='tide'),...WORLD_BUILDINGS.map(b=>({id:b.id,type:'building',label:b.label,x:b.doorX,y:b.doorY}))];
  let result=null,distance=44;
  for(const target of targets){const d=Math.hypot(player.x-target.x,player.y-target.y);if(d<distance){result=target;distance=d;}}
  return result;
}

function drawAtmosphere(c,t,night,reducedMotion,fog=false){
  const time=reducedMotion?0:t;
  // The coastline stays calm; one-pixel wavelets quietly move through the sea.
  for(let i=0;i<24;i++){
    const x=38+random(i+300)*887,y=25+random(i+330)*540;
    if(!canWalk(x,y)&&!((x>90&&x<900)&&(y>75&&y<550)))line(c,[[x,y],[x+5,y-1],[x+13+Math.sin(time*.7+i)*3,y-1]],'rgba(231,239,212,.52)',1);
  }
  c.save();c.globalAlpha=night;{
    rect(c,'rgba(28,38,73,.48)',0,0,W,H);
    for(const [x,y] of lanterns.filter(([x,y])=>!fog&&!LIFE_LAMPS.some(l=>l.x===x&&l.y===y))){const glow=c.createRadialGradient(x,y-21,0,x,y-21,23);glow.addColorStop(0,'rgba(251,218,128,.39)');glow.addColorStop(1,'rgba(251,218,128,0)');c.fillStyle=glow;c.fillRect(x-23,y-44,46,46);rect(c,'#ffe2a3',x-2,y-24,4,6);}
  }c.restore();c.save();c.globalAlpha=1-night;{
    const sun=c.createLinearGradient(0,0,W,H);sun.addColorStop(0,'rgba(252,225,164,.13)');sun.addColorStop(.65,'rgba(251,217,140,0)');c.fillStyle=sun;c.fillRect(0,0,W,H);
    // Paper-light leaves drift along the paths, with a short quiet gull flight.
    for(let i=0;i<8;i++){const x=232+((random(i+44)*500+time*5)%555),y=172+random(i+55)*292+Math.sin(time*.4+i)*8;rect(c,'rgba(228,213,138,.8)',x,y,3,2);}
    if(!reducedMotion){for(let i=0;i<2;i++){const x=((time*9+i*65)%1150)-90,y=35+i*15+Math.sin(time*.4+i)*5;line(c,[[x-4,y-2],[x,y],[x+4,y-2]],'#edf0d8',1);}}
  }
  c.restore();
}

let fogLayer;
function drawWeather(c,t,rain,fog,light,reducedMotion,lit=[]){
  const time=reducedMotion?0:t;
  // Broad cloud shadows and a warm horizon bridge dawn and dusk continuously.
  const twilight=4*light*(1-light);
  rect(c,`rgba(237,159,99,${twilight*.15})`,0,0,W,H);
  rect(c,`rgba(50,70,88,${rain*.19})`,0,0,W,H);
  if(rain>.01){
    c.save();c.globalAlpha=rain;
    for(let i=0;i<110;i++){const x=(random(i+2100)*W-time*75%W+W)%W,y=(random(i+2400)*H+time*240)%H;line(c,[[x,y],[x-4,y+11]],'rgba(204,226,233,.46)',1);}
    for(let i=0;i<16;i++){const x=180+random(i+2700)*600,y=230+random(i+2800)*260,phase=(time*1.4+i*.17)%1;if(canWalk(x,y)){c.strokeStyle=`rgba(209,229,224,${(1-phase)*.35})`;c.beginPath();c.ellipse(x,y,2+phase*6,1+phase*2,0,0,Math.PI*2);c.stroke();}}
    c.restore();
  }
  if(fog>.01){
    fogLayer??=document.createElement('canvas');if(fogLayer.width!==W){fogLayer.width=W;fogLayer.height=H;}const fogCanvas=fogLayer,fogContext=fogCanvas.getContext('2d');fogContext.globalCompositeOperation='source-over';fogContext.clearRect(0,0,W,H);
    const worldContext=c;c=fogContext;
    // Low, separated banks follow shorelines and paths, leaving clear pockets.
    for(let i=0;i<9;i++){
      const x=110+random(i+3100)*750+Math.sin(time*.035+i*1.7)*65,y=125+random(i+3300)*405;
      c.save();c.translate(x,y);c.scale(1,.24+random(i+3400)*.12);
      const radius=95+random(i+3500)*75,mist=c.createRadialGradient(0,0,8,0,0,radius);
      const color=light>.4?'203,219,209':'133,157,174';
      mist.addColorStop(0,`rgba(${color},${fog*(.32+(1-light)*.2)})`);mist.addColorStop(.45,`rgba(${color},${fog*.22})`);mist.addColorStop(1,`rgba(${color},0)`);
      c.fillStyle=mist;c.fillRect(-radius,-radius,radius*2,radius*2);c.restore();
    }
    c.globalCompositeOperation='destination-out';
    for(const lamp of LIFE_LAMPS.filter(l=>lit.includes(l.id))){const clear=c.createRadialGradient(lamp.x,lamp.y,12,lamp.x,lamp.y,68);clear.addColorStop(0,'rgba(0,0,0,.97)');clear.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=clear;c.fillRect(lamp.x-68,lamp.y-68,136,136);}
    c=worldContext;c.drawImage(fogCanvas,0,0);
    for(const lamp of LIFE_LAMPS.filter(l=>lit.includes(l.id))){const glow=c.createRadialGradient(lamp.x,lamp.y-21,0,lamp.x,lamp.y-21,48);glow.addColorStop(0,'rgba(255,221,136,.65)');glow.addColorStop(1,'rgba(255,221,136,0)');c.fillStyle=glow;c.fillRect(lamp.x-48,lamp.y-69,96,96);rect(c,'#ffe7ac',lamp.x-2,lamp.y-24,4,6);}
    // Warm light scatters locally through mist, after the cool fog layer.
    if(light<.8)for(const b of WORLD_BUILDINGS){const x=b.doorX,y=b.doorY-17;
      const halo=c.createRadialGradient(x,y,1,x,y,34);halo.addColorStop(0,`rgba(255,216,131,${fog*(1-light)*.65})`);halo.addColorStop(.3,`rgba(244,195,103,${fog*(1-light)*.25})`);halo.addColorStop(1,'rgba(244,195,103,0)');c.fillStyle=halo;c.fillRect(x-34,y-34,68,68);rect(c,'#ffe8b1',x-13,y-5,3,5);
    }
  }
}

function drawPlacedDecoration(c,id,x,y,t,night){
 shadow(c,x,y+2,13,4);
 if(id==='flowers'){rect(c,'#977957',x-13,y-6,26,9);rect(c,'#c8a278',x-13,y-6,26,2);for(let i=0;i<5;i++)drawFlower(c,x-10+i*5,y-9,['#d98683','#e1b164','#a39bbc'][i%3]);}
 if(id==='windbell'){line(c,[[x-9,y],[x-9,y-33],[x+10,y-33]],'#88734f',3);const swing=Math.sin(t*2)*2;line(c,[[x+5,y-32],[x+5+swing,y-18]],'#c2b785',1);poly(c,[[x+1+swing,y-21],[x+9+swing,y-21],[x+11+swing,y-15],[x-1+swing,y-15]],'#b4c7a6');line(c,[[x+5+swing,y-15],[x+5+swing,y-4]],'#a5b497',2);}
 if(id==='banner'){line(c,[[x-8,y],[x-8,y-39]],'#84724e',3);poly(c,[[x-6,y-37],[x+15,y-35],[x+12,y-17],[x+3,y-22],[x-6,y-18]],'#9e93b7');text(c,'✦',x+4,y-27,9,'#eee1ac');}
 if(id==='fog-medal'){if(night){const g=c.createRadialGradient(x,y-10,1,x,y-10,32);g.addColorStop(0,'#ffe3a866');g.addColorStop(1,'#ffe3a800');c.fillStyle=g;c.fillRect(x-32,y-42,64,64);}rect(c,'#8e7956',x-8,y-2,16,4);rect(c,'#a68d5a',x-6,y-21,12,20);rect(c,'#f4d49a',x-4,y-18,8,13);rect(c,'#8e7956',x-8,y-23,16,3);}
}

function drawFlowerRack(c,x,y,damaged,progress=1){
 shadow(c,x,y+3,37,9);ellipse(c,'#829565',x,y+1,38,12);
 for(const dx of [-29,27]){rect(c,'#785f43',x+dx,y-61,5,63);rect(c,'#b89a6a',x+dx,y-61,2,59);}
 line(c,[[x-32,y-62],[x+33,y-62]],'#aa8b5e',6);
 for(let i=0;i<5;i++)line(c,[[x-23+i*11,y-56],[x-23+i*11,y-28]],'#a98f66',2);
 for(let i=0;i<3;i++)line(c,[[x-26,y-51+i*9],[x+27,y-51+i*9]],'#b49c72',2);
 const rebuild=!damaged&&progress<1;
 if(damaged||rebuild){c.save();c.globalAlpha=damaged?1:1-progress;line(c,[[x-29,y-24],[x-1,y-14]],'#be9a65',6);line(c,[[x+8,y-22],[x+29,y-31]],'#be9a65',6);line(c,[[x-12,y+5],[x+15,y+1]],'#aa8558',4);rect(c,'#ae7860',x+12,y-9,12,10);drawFlower(c,x+26,y+1,'#c79191');c.restore();}
 if(!damaged){c.save();c.globalAlpha=progress;c.translate(0,(1-progress)*14);rect(c,'#8a6c4b',x-32,y-26,66,6);rect(c,'#c8a879',x-33,y-28,68,3);for(const dx of [-21,0,21]){rect(c,'#a77d59',x+dx-7,y-40,14,12);rect(c,'#c79970',x+dx-8,y-41,16,3);drawBush(c,x+dx,y-42,'#789063');for(let i=0;i<3;i++)drawFlower(c,x+dx-5+i*5,y-47,['#c88e94','#dcb875','#b0a1bd'][Math.floor((dx+21)/21)]);}c.restore();}
 if(rebuild){const beat=Math.sin(progress*Math.PI*8);c.save();c.translate(x+10,y-22);c.rotate(beat*.3);rect(c,'#947049',0,-22,3,22);rect(c,'#7b8072',-7,-25,16,6);c.restore();}
 // A physical hanging tag identifies this repairable structure.
 rect(c,'#ded0a8',x-20,y+7,40,13);text(c,damaged?'花架 · 破损':'花架',x,y+17,8,'#655b42');
}

function drawLifeWorld(c,life,t,night,reduced=false,fog=false){
 const visible=visibleLampIds(life,night,fog);
 for(const lamp of LIFE_LAMPS){const lit=visible.includes(lamp.id);drawLantern(c,lamp.x,lamp.y);rect(c,lit?'#ffe3a2':'#b6bfa7',lamp.x-4,lamp.y-26,9,9);if(lit){const g=c.createRadialGradient(lamp.x,lamp.y-21,0,lamp.x,lamp.y-21,42);g.addColorStop(0,'rgba(255,216,126,.55)');g.addColorStop(1,'rgba(255,216,126,0)');c.fillStyle=g;c.fillRect(lamp.x-42,lamp.y-63,84,84);}}
 for(const p of SHORE_TREASURES)if(!life?.treasureFinds?.includes((life?.narrative?.number||1)+':'+p.id)){const pulse=reduced?1:.7+Math.sin(t*2+p.x)*.3;const g=c.createRadialGradient(p.x,p.y,1,p.x,p.y,20);g.addColorStop(0,'rgba(255,236,153,'+pulse*.7+')');g.addColorStop(1,'rgba(255,236,153,0)');c.fillStyle=g;c.fillRect(p.x-20,p.y-20,40,40);poly(c,[[p.x,p.y-6],[p.x+5,p.y],[p.x,p.y+6],[p.x-5,p.y]],'#f7e9bb');}
 for(const wood of LIFE_PICKUPS)if(!life?.pickups?.includes(wood.id)){shadow(c,wood.x,wood.y+2,10,3);line(c,[[wood.x-8,wood.y],[wood.x+8,wood.y-4]],'#a68153',5);line(c,[[wood.x-4,wood.y-5],[wood.x+7,wood.y+2]],'#d3b580',3);}
 const{x,y}=LIFE_FACILITY,damaged=life?.facility==='damaged',event=life?.event,age=!reduced&&event?.startedAt?Math.max(0,(Date.now()-event.startedAt)/1000):99,site={x,y};

 if(event?.type==='monster'){
   const retreat=event.driven?(reduced?1:Math.min(1,(Date.now()-(life.lastDriveAt||event.startedAt))/1800)):0;
   if(retreat<1){const approach=Math.max(0,1-age/2.5),mx=site.x+23+approach*35+retreat*50,my=site.y-8-Math.abs(Math.sin(t*5))*3-retreat*25;shadow(c,mx,my+4,11,3);ellipse(c,'#667a51',mx,my-9,12,11);poly(c,[[mx-10,my-13],[mx-13,my-26],[mx-3,my-17]],'#839568');poly(c,[[mx+5,my-17],[mx+13,my-25],[mx+11,my-11]],'#839568');rect(c,'#f4dfa0',mx-7,my-13,4,4);rect(c,'#f4dfa0',mx+3,my-13,4,4);rect(c,'#344c37',mx-5,my-12,2,2);rect(c,'#344c37',mx+4,my-12,2,2);line(c,[[mx-4,my-5],[mx+3,my-4]],'#344c37',2);line(c,[[mx-11,my-2],[mx+9,my-5]],'#b89a68',4);}
 }


 for(const p of life?.placements||[])drawPlacedDecoration(c,p.id,p.x,p.y,t,night);
 const b=WORLD_BUILDINGS[0];if(life?.protection){for(const xx of [b.x-6,b.x+b.w+3]){rect(c,life.protection===2?'#657e71':'#8c7855',xx,b.y+b.h-27,4,29);}line(c,[[b.x-6,b.y+b.h+1],[b.x+b.w+7,b.y+b.h+1]],life.protection===2?'#9fb9a1':'#c8b18b',3);}
 if(!life?.placements&&life?.decoration==='windbell'){line(c,[[b.x+20,b.y+49],[b.x+20,b.y+64]],'#8d7955',1);rect(c,'#dcca88',b.x+17,b.y+62,7,5);}
 if(!life?.placements&&life?.decoration==='banner')poly(c,[[b.x+90,b.y+40],[b.x+112,b.y+40],[b.x+108,b.y+67],[b.x+101,b.y+61],[b.x+94,b.y+67]],'#a593bd');
 if(!life?.placements&&life?.decoration==='fog-medal'){const x=b.doorX+26,y=b.doorY-12;rect(c,'#b5a472',x-4,y-13,9,13);rect(c,'#ffe2a4',x-2,y-11,5,9);}
 if(life?.lastRepairAt&&Date.now()-life.lastRepairAt<3000)for(let i=0;i<8;i++)rect(c,'#f1d88c',x+Math.sin(t*3+i)*23,y-10-Math.cos(t*2+i)*14,2,2);
}

function roomCanWalk(x,y,room){
  if(x<270||x>744||y<226||y>489)return false;
  // Shelves stay against the wall. The central table is a real obstacle.
  if(room.id==='museum'){for(let i=0;i<CHAPTERS.length;i++){const xx=330+i%3*150,yy=285+Math.floor(i/3)*110;if(x>xx-38&&x<xx+38&&y>yy-56&&y<yy+5)return false;}return true;}
  if(room.id==='meeting')return ((x-485)/66)**2+((y-333)/35)**2>1;
  if(room.id==='gallery')return !(x>426&&x<558&&y>338&&y<360);
  return !(x>416&&x<550&&y>291&&y<341)&&!(x>579&&x<715&&y>255&&y<298);
}
function moveInside(position,dx,dy,room){
  const next={...position},steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/3));
  for(let i=0;i<steps;i++){if(roomCanWalk(next.x+dx/steps,next.y,room))next.x+=dx/steps;if(roomCanWalk(next.x,next.y+dy/steps,room))next.y+=dy/steps;}
  return next;
}
function roomWalkPath(from,to,room){
  const safe=(a,b)=>{const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2));for(let i=0;i<=steps;i++)if(!roomCanWalk(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps,room))return false;return true;};
  if(!roomCanWalk(to.x,to.y,room))return [];
  if(safe(from,to))return [to];
  const unit=12,points=[];
  for(let x=276;x<=744;x+=unit)for(let y=228;y<=480;y+=unit)if(roomCanWalk(x,y,room))points.push({x,y,key:`${x},${y}`});
  const nearest=point=>points.filter(p=>safe(point,p)).sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y))[0];
  const start=nearest(from),goal=nearest(to);if(!start||!goal)return [];
  const lookup=new Map(points.map(p=>[p.key,p])),open=[{...start,cost:0,estimate:Math.hypot(start.x-goal.x,start.y-goal.y)}],costs=new Map([[start.key,0]]),parents=new Map(),visited=new Set();
  let end=null;
  while(open.length){
    open.sort((a,b)=>a.estimate-b.estimate);const current=open.shift();if(visited.has(current.key))continue;
    if(current.key===goal.key){end=current;break;}visited.add(current.key);
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
      if(!dx&&!dy)continue;const next=lookup.get(`${current.x+dx*unit},${current.y+dy*unit}`);
      if(!next||visited.has(next.key)||!safe(current,next))continue;
      const cost=current.cost+Math.hypot(dx,dy)*unit;if(cost>=(costs.get(next.key)??Infinity))continue;
      costs.set(next.key,cost);parents.set(next.key,current);open.push({...next,cost,estimate:cost+Math.hypot(next.x-goal.x,next.y-goal.y)});
    }
  }
  if(!end)return [];
  const path=[to];for(let cursor=end;cursor;cursor=parents.get(cursor.key))path.unshift({x:cursor.x,y:cursor.y});
  const result=[];let anchor=from,index=0;
  while(index<path.length){let far=index;while(far+1<path.length&&safe(anchor,path[far+1]))far++;result.push(path[far]);anchor=path[far];index=far+1;}
  return result;
}
function routeToEnd(route,elapsed,speed=38){
  if(!route.length)return null;
  let remaining=Math.max(0,elapsed)*speed;
  for(let i=1;i<route.length;i++){
    const from=route[i-1],to=route[i],dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy);
    if(remaining<length){const fraction=remaining/Math.max(length,.01);return {x:from.x+dx*fraction,y:from.y+dy*fraction,moving:true,direction:Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'),done:false};}
    remaining-=length;
  }
  return {...route.at(-1),moving:false,direction:'up',done:true};
}
function walkableResidentRoute(npc){
  const points=npc.route.map(([x,y])=>({x,y})).filter(p=>canWalk(p.x,p.y));
  if(!points.length)return [];
  const path=[points[0]];for(let i=1;i<points.length;i++)path.push(...findWalkPath(path.at(-1),points[i]));
  if(path.length>1)path.push(...findWalkPath(path.at(-1),path[0]));
  return path;
}
function startResidentRoute(from,base){
  if(!base.length)return [from];
  const approach=findWalkPath(from,base[0]);
  if(!approach.length&&Math.hypot(from.x-base[0].x,from.y-base[0].y)>3)return [from];
  return [from,...approach,...base.slice(1),...findWalkPath(base.at(-1),from)];
}
function drawShelf(c,x,y,width=72,height=60){
  rect(c,'#645b44',x-3,y-3,width+6,height+6);rect(c,'#9b7c53',x,y,width,height);
  for(let row=0;row<3;row++){
    rect(c,'#605840',x+4,y+4+row*18,width-8,14);
    for(let col=0;col<Math.floor((width-8)/6);col++){const offset=col*6,height=7+random(row*64+col)*7;rect(c,['#b38a61','#80937a','#c6b87f','#9c7e7a','#d4c69a'][col%5],x+5+offset,y+17+row*18-height,4,height);rect(c,'#ddd1a4',x+5+offset,y+12+row*18,4,1);}
    rect(c,'#c1a16f',x,y+18+row*18,width,3);
  }
}
function drawDesk(c,x,y,width=130){
  shadow(c,x+width/2,y+34,width/2,10);rect(c,'#766344',x+7,y+17,7,26);rect(c,'#766344',x+width-14,y+17,7,26);
  rect(c,'#9a7b51',x,y,width,24);rect(c,'#c5a478',x,y,width,5);rect(c,'#ae8d61',x+3,y+7,width-6,13);rect(c,'#7a6746',x,y+23,width,4);
  rect(c,'#8c7955',x+width/2-13,y+15,27,8);rect(c,'#c5ab79',x+width/2-2,y+18,4,2);
}
function drawRoom(c,room,night){
  rect(c,mixColor('#6e8d77','#4e665c',night),0,0,W,H);
  // The surrounding quiet silhouette keeps the cottage distinct from an HTML panel.
  for(let i=0;i<55;i++){const x=random(i+1200)*W,y=random(i+1250)*H;rect(c,'rgba(170,186,137,.1)',x,y,16,2);}
  shadow(c,505,515,270,31);
  poly(c,[[247,159],[275,119],[740,119],[769,159],[769,509],[247,509]],'#5e5842');
  rect(c,'#bea577',255,164,506,337);rect(c,'#dfc995',266,171,484,80);rect(c,'#a38a60',266,239,484,12);
  for(let i=0;i<13;i++){rect(c,'rgba(117,96,61,.12)',269+i*37,178,1,61);rect(c,'#e9d5a7',272+i*37,177,2,59);}
  // Wide cedar floorboards with restrained grain and uneven seams.
  rect(c,'#b69461',266,252,484,246);
  for(let row=0;row<18;row++){
    const y=252+row*14;rect(c,row%3===0?'#c4a271':row%3===1?'#bd9a65':'#c9a979',267,y,482,12);rect(c,'#a18458',267,y+12,482,1);
    for(let i=0;i<4;i++){const x=267+((i*138+row*53)%481);rect(c,'#a98a5c',x,y+1,1,10);rect(c,'rgba(232,202,146,.36)',x+5,y+4,45,1);}
  }
  rect(c,'#7e704e',255,161,11,343);rect(c,'#d9bf8c',259,166,4,332);rect(c,'#7e704e',750,161,11,343);rect(c,'#b79c6e',753,166,4,332);
  rect(c,'#6f664a',250,144,516,19);rect(c,'#a48b5c',250,144,516,5);
  rect(c,'#8e7752',266,497,181,9);rect(c,'#8e7752',526,497,224,9);
  windowBox(c,376,182,61,47,night);windowBox(c,572,182,61,47,night);
  // Light falls from the windows instead of filling the whole room with an effect.
  c.save();c.globalAlpha=1-night;{poly(c,[[376,230],[437,230],[471,315],[401,315]],'rgba(254,225,163,.16)');poly(c,[[572,230],[633,230],[667,315],[596,315]],'rgba(254,225,163,.14)');}c.restore();
  if(room.id==='main'){rect(c,'#977c56',281,271,79,39);rect(c,'#d6c5a0',285,268,73,33);rect(c,'#74958d',285,268,25,33);rect(c,'#ab9476',316,222,23,35);text(c,'公开档案',485,327,10,'#57654e');}if(room.id==='customs'){for(let i=0;i<3;i++){rect(c,'#9a7652',284+i*22,284,18,22);line(c,[[284+i*22,288],[302+i*22,302]],'#c6ae81',2);}line(c,[[680,227],[686,259],[694,239],[704,258]],'#ad9465',3);}
  rect(c,'#9a724f',455,181,84,13);text(c,room.label,497,191,10,'#f2dfb0');
  // A little woven rug leaves a navigable ring around the worktable.
  rect(c,'#8f9875',383,370,214,86);rect(c,'#b6be94',389,376,202,74);rect(c,'#89966e',395,382,190,62);rect(c,'#b2b98b',402,388,176,50);
  for(let i=0;i<12;i++){rect(c,'#d6caa0',392+i*16,377,6,2);rect(c,'#d6caa0',392+i*16,450,6,2);}
  if(room.id==='meeting'){
    ellipse(c,'#6f5e44',490,346,73,36);ellipse(c,'#b4915f',485,333,68,35);ellipse(c,'#d0ae78',485,327,66,29);
    for(let i=0;i<4;i++){const x=417+i*45;rect(c,'#866d4b',x,370,22,13);rect(c,'#b69365',x,366,22,10);rect(c,'#705d41',x+2,379,3,13);}
    rect(c,'#ede0b9',471,319,20,12);rect(c,'#6b8972',497,320,8,8);drawShelf(c,291,185,53,56);drawShelf(c,671,185,54,56);
  }else if(room.id==='gallery'){
    [[293,'#6f947f'],[459,'#b09076'],[658,'#7b8997']].forEach(([x,color],i)=>{
      rect(c,'#846843',x,175,65,61);rect(c,'#e7d2a4',x+4,179,57,53);rect(c,'#e0d3b2',x+7,182,51,47);
      if(i===0){poly(c,[[x+8,220],[x+22,200],[x+34,214],[x+45,193],[x+57,220]],color);rect(c,'#d6b16b',x+16,190,7,6);}
      else if(i===1){rect(c,color,x+19,192,28,27);rect(c,'#ddbf80',x+26,185,13,15);rect(c,'#759681',x+13,221,42,4);}
      else {poly(c,[[x+10,222],[x+32,189],[x+56,222]],color);rect(c,'#d5c08e',x+32,192,1,35);}
      rect(c,'#d9cca1',x+18,241,28,4);
    });
    rect(c,'#7c6547',428,343,130,18);rect(c,'#c2a477',428,338,130,9);rect(c,'#8c7250',438,359,6,14);rect(c,'#8c7250',541,359,6,14);
  }else{
    drawShelf(c,290,183,54,56);drawDesk(c,420,297,130);drawDesk(c,584,262,129);
    rect(c,'#eee2bb',435,302,28,17);rect(c,'#7d8f75',432,306,3,10);rect(c,'#cbb98b',443,309,15,1);rect(c,'#cbb98b',443,313,12,1);
    rect(c,'#748f78',493,304,10,11);rect(c,'#e0cca0',495,304,6,2);rect(c,'#af845b',522,299,8,17);drawFlower(c,526,299,'#e9c882');
    if(room.id==='archive'){
      drawShelf(c,667,171,61,76);drawShelf(c,283,260,58,64);
      for(let i=0;i<4;i++){rect(c,['#a97d5e','#8a9c7b','#d3bc85'][i%3],595+i*21,267-i%2*5,18,5);rect(c,'#e0d2a9',597+i*21,268-i%2*5,14,2);}
      rect(c,'#b99662',354,220,11,20);rect(c,'#e2cd96',354,220,11,4);
    }else if(room.id==='curator'){
      rect(c,'#bca078',671,176,45,52);rect(c,'#f0dfba',675,180,37,44);poly(c,[[678,218],[691,190],[710,217]],'#a1aa81');rect(c,'#d3a880',684,188,8,7);
      for(let i=0;i<6;i++)rect(c,['#c47c65','#819d83','#e1c080','#a88eaa'][i%4],595+i*17,267,11,7);
      line(c,[[342,286],[328,329]],'#88724f',4);line(c,[[342,286],[357,329]],'#88724f',4);rect(c,'#997c53',321,249,43,43);rect(c,'#eaddb7',325,253,35,35);poly(c,[[325,285],[341,262],[359,285]],'#8d9e80');
    }else if(room.id==='liaison'){
      rect(c,'#886b48',667,177,62,58);
      for(let row=0;row<4;row++)for(let col=0;col<4;col++){rect(c,'#5d6048',671+col*14,181+row*13,11,10);rect(c,'#d9c99c',672+col*14,187+row*13,8,3);}
      for(let i=0;i<4;i++){rect(c,'#f2e4bc',594+i*25,265+i%2*4,21,14);line(c,[[594+i*25,265+i%2*4],[605+i*25,272+i%2*4],[615+i*25,265+i%2*4]],'#b99c77',1);}
      rect(c,'#a7805c',321,286,31,28);text(c,'信',336,305,16,'#ecd8a6');
    }else if(room.id==='specialist'){
      rect(c,'#718c88',664,175,67,61);rect(c,'#d0d6b8',668,179,59,53);
      ellipse(c,'#a6b696',697,206,20,15);line(c,[[678,206],[716,206]],'#71928a',1);line(c,[[697,188],[697,224]],'#71928a',1);
      for(let i=0;i<6;i++)rect(c,'#617e76',675+random(i+900)*43,184+random(i+910)*42,2,2);
      line(c,[[337,282],[321,327]],'#85774f',3);line(c,[[337,282],[354,327]],'#85774f',3);line(c,[[313,276],[359,254]],'#6b8983',11);rect(c,'#bdc4a2',309,270,8,13);ellipse(c,'#bba979',628,274,16,7);ellipse(c,'#899d83',628,271,10,9);
    }else if(room.id==='customs'){
      rect(c,'#927751',666,177,62,60);rect(c,'#ddcca0',670,181,54,52);
      for(let i=0;i<5;i++)line(c,[[676,190+i*7],[714,190+i*7]],'#bba77c',1);
      rect(c,'#f2e2b6',595,268,35,17);rect(c,'#889b85',640,266,26,21);text(c,'渡',651,281,12,'#ecdfb2');drawMailbox(c,324,313);
    }else{
      rect(c,'#9b9277',666,186,62,53);rect(c,'#80725b',674,210,46,24);rect(c,'#4d5e4d',680,214,34,21);rect(c,'#d1aa6a',691,224,13,7);rect(c,'#ead19a',696,219,4,11);rect(c,'#c7b88c',663,201,69,7);
      rect(c,'#a3b296',603,270,24,18);rect(c,'#e1d2a9',607,272,16,12);rect(c,'#8a7351',631,267,9,16);
    }
  }
  drawBush(c,286,466,'#6e915e');rect(c,'#957956',280,464,15,17);drawBush(c,730,467,'#779963');rect(c,'#ad8b61',724,466,15,17);
  // Open threshold: sunlight and the outdoor path are visible through the door.
  rect(c,'#716348',446,473,82,32);rect(c,mixColor('#d6c798','#77968d',night),452,477,70,23);rect(c,'#a69168',446,498,82,6);
  poly(c,[[481,487],[493,487],[487,494]],'#e3dbb4');
  if(night)rect(c,`rgba(53,53,68,${night*.13})`,255,163,506,342);
}

function namedBuilding(b,names={}){
 return {...b,label:buildingLabel(b.id,names)};
}
export default function World({initialSpawn=null,placing=null,onPlace,onCollectDecoration,conversationOpen=false,onStorySignal,lifeState=null,reception=null,musicMuted=false,musicVolume=.35,onInteract,onLocationChange,onRoomChange,onSelectPlayer,playerDetailsOpen=false,interactionOpen=false,gameMinutes=980,projections=[],visitorIdentity=null,ownerAvatar=null,isOwner=false,npcNames={},canEnterMeeting=false,storyComplete=false,processingRoles=[],daylight=1,weather='sunny',night=false,muted=true,reducedMotion=false,volume=.55}) {
  const [room,setRoom]=useState(null);
  const [roomAction,setRoomAction]=useState(null);
  const canvasRef=useRef(null), callbacks=useRef({onInteract,onLocationChange,onRoomChange,onSelectPlayer,onStorySignal,onPlace,onCollectDecoration}), options=useRef({placing,conversationOpen,lifeState,reception,musicMuted,musicVolume,volume,daylight,weather,night,muted,reducedMotion,projections,visitorIdentity,ownerAvatar,isOwner,npcNames,canEnterMeeting,storyComplete,processingRoles,interactionOpen,gameMinutes});
  callbacks.current={onInteract,onLocationChange,onRoomChange,onSelectPlayer,onStorySignal,onPlace,onCollectDecoration};options.current={placing,conversationOpen,lifeState,reception,musicMuted,musicVolume,volume,daylight,weather,night,muted,reducedMotion,projections,visitorIdentity,ownerAvatar,isOwner,npcNames,canEnterMeeting,storyComplete,processingRoles,interactionOpen,gameMinutes};
  const [strikeHint,setStrikeHint]=useState(null);
  const threatAudio=useRef(null);
  const audio=useRef(null),music=useRef(null),ambientGain=useRef(null), interacted=useRef(false);
  const state=useRef({player:{...(initialSpawn||BOAT_SPAWN),...controlledCharacter(isOwner,ownerAvatar||{}),direction:'up',seed:0},controlOwner:isOwner,leisureRoute:null,leisureSince:0,mainRelease:null,mainSince:0,outdoorMain:null,leisurePose:null,residents:{},scheduleMinutes:gameMinutes,roomSignature:'',room:null,keys:new Set(),target:null,waypoints:[],hover:null,hoverSince:0,nearKey:null,nearSince:0,actors:[],location:'',clickMark:null,blocked:0});

  function publishPosition(){
    const data=state.current,daily=options.current.lifeState?.daily;
    const positions=daily?Object.fromEntries(Object.entries(data.residents).filter(([id])=>Object.hasOwn(dailySkeleton(daily.skeleton).actors,id)).map(([id,r])=>[id,{x:r.pose.x,y:r.pose.y,direction:r.pose.direction,atHome:r.atHome}])):{};
    return callbacks.current.onStorySignal?.({action:'story-position',x:data.player.x,y:data.player.y,room:data.room?.id||null,daily:daily?{day:daily.day,positions,performance:data.dailyPerformance}:null});
  }
  function hitsPlayer(x,y){const player=state.current.player;return Math.abs(x-player.x)<16&&y>player.y-40&&y<player.y+8;}
  function stopPlayer(){const data=state.current;data.keys.clear();data.target=null;data.waypoints=[];data.clickMark=null;data.hover=null;data.blocked=0;data.player.moving=false;}
  function strikeResident(){
    const data=state.current,now=performance.now();if(options.current.interactionOpen||options.current.lifeState?.narrative?.downed||now<(data.lastSwing||0)+COMBAT_RULES.cooldown)return;
    data.lastSwing=now;data.swingUntil=now+330;beginAmbient();
    const target=data.actors.filter(a=>!a.projection&&STORY_RESIDENTS[a.id]&&!(a.id==='main'&&options.current.isOwner&&!options.current.lifeState?.narrative?.combatDemo)).find(a=>strikeInRange(data.player,a,{room:!!data.room,clear:canWalk}));
    threatAudio.current?.combat(target?'light':'miss',options.current.muted?0:options.current.volume);
    if(!target)return;
    const eventId='strike:'+Date.now()+':'+Math.random().toString(36).slice(2,8),player={x:data.player.x,y:data.player.y,direction:data.player.direction},room=data.room?.id||null;
    callbacks.current.onStorySignal?.({action:'story-position',x:player.x,y:player.y,room})?.then(()=>callbacks.current.onStorySignal?.({action:'resident-strike',id:target.id,eventId,player,target:{x:target.x,y:target.y},room}));
  }
  function selectPlayer(){stopPlayer();callbacks.current.onSelectPlayer?.();}
  function publishRoom(){
    const data=state.current,opts=options.current;
    if(!data.room){if(data.roomSignature){data.roomSignature='';callbacks.current.onRoomChange?.(null);}return;}
    const id=data.room.id,resident=data.residents[id],ownerDesk=id==='main'&&opts.isOwner,presence=resident?.presence||residentPresence(id,data.scheduleMinutes);
    const atHome=ownerDesk||Boolean(resident?.atHome);
    const info={id,label:data.room.label,residentId:presence?id:null,residentName:presence?opts.npcNames[id]||WORLD_NPCS.find(n=>n.id===id)?.label:null,atHome,
      activity:ownerDesk?'你的书桌就在房间中央':resident?.transition?'沿着小路回家':presence?.activity||'',
      returnHint:ownerDesk?'走到书桌前按 E，打开你的岛屿资料。':atHome?'走近居民，按 E 开始交谈。':resident?.transition?'正在沿着小路回来，很快到家。':presence?.returnHint||''};
    const signature=JSON.stringify(info);if(signature!==data.roomSignature){data.roomSignature=signature;callbacks.current.onRoomChange?.(info);}
  }
  function leaveRoom(){const data=state.current;if(!data.room)return;data.player={...data.player,...data.room.outside,moving:false};data.room=null;data.keys.clear();data.target=null;data.waypoints=[];data.hover=null;data.clickMark=null;setRoom(null);publishRoom();canvasRef.current?.focus({preventScroll:true});if(options.current.lifeState?.narrative?.prologue==='houseReady')callbacks.current.onStorySignal?.({action:'story-leave'});}
  function activateTarget(target){
    if(target.type==='decoration'){callbacks.current.onCollectDecoration?.(target.id);return;}
    const data=state.current;if(options.current.lifeState?.narrative?.downed)return;if(target.id==='cat'){target={...WORLD_ENVIRONMENT.find(e=>e.id==='cat')};data.catPauseUntil=performance.now()+4500;}if(['museum','industry'].includes(target.id)&&target.type!=='workspace')target={...target,type:'building'};data.keys.clear();data.target=null;data.waypoints=[];data.clickMark=null;
    const n=options.current.lifeState?.narrative;if(n&&!options.current.isOwner&&n.prologue!=='complete'&&target.type==='npc'&&target.id!=='customs')return;if(n&&!storyDoorAllowed(n,target.id,options.current.isOwner)&&!['npc','exit'].includes(target.type)){if(target.type==='building')callbacks.current.onStorySignal?.({action:'story-locked',message:n.prologue==='arrival'?'守码头的人正在走来，先在船边等一下。':'先跟着守码头的人，去主宅安顿。'});return;}
    if(data.room&&['daily-object','life','treasure','environment','story-trace','museum','industry'].includes(target.type))leaveRoom();
    if(data.room&&target.type==='building'&&data.room.id!==target.id)leaveRoom();
    if(!options.current.isOwner&&n?.prologue==='escort'&&target.type==='building'&&target.id==='main'){const home=WORLD_BUILDINGS[0];if(Math.hypot(data.player.x-home.doorX,data.player.y-home.doorY)<55&&(!data.guidePose||Math.hypot(data.guidePose.x-home.doorX,data.guidePose.y-home.doorY)>65)){data.enterAfter=target;return;}}
    if(target.type==='building'&&!data.room){const b=WORLD_BUILDINGS.find(b=>b.id===target.id);if(b&&Math.hypot(data.player.x-b.doorX,data.player.y-b.doorY)>50){const dest={x:b.doorX,y:b.doorY+8},path=findWalkPath(data.player,dest);data.target=path.shift()||null;data.waypoints=path;data.enterAfter=target;return;}}
    if(['daily-object','life','treasure','museum','industry','environment','story-trace','voyage'].includes(target.type)&&!data.room&&Number.isFinite(target.x)&&Math.hypot(data.player.x-target.x,data.player.y-target.y)>38){const candidates=[{x:target.x+12,y:target.y+28},{x:target.x-12,y:target.y+28},{x:target.x,y:target.y+32}],destination=candidates.find(p=>canWalk(p.x,p.y));if(destination){const path=findWalkPath(data.player,destination);data.target=path.shift()||null;data.waypoints=path;if(data.target)data.enterAfter=target;}return;}
    if(target.type==='museum'&&!data.room){const entered={id:'museum',label:'雾中生物展馆',outside:{x:data.player.x,y:data.player.y}};data.room=entered;Object.assign(data.player,{x:485,y:446});setRoom(entered);publishRoom();callbacks.current.onStorySignal?.({action:'story-museum-open'});return;}
    if(target.type==='exit'){leaveRoom();return;}
    if(target.type==='daily-object'){publishPosition()?.then(()=>callbacks.current.onInteract?.(target));return;}
    if(target.type==='npc'){
      const actor=data.actors.find(a=>a.id===target.id);if(!actor)return;
      if(data.room&&Math.hypot(actor.x-data.player.x,actor.y-data.player.y)>=46)return;
      if(!data.room&&Math.hypot(actor.x-data.player.x,actor.y-data.player.y)>46){const destination=[{x:actor.x,y:actor.y+22},{x:actor.x-22,y:actor.y},{x:actor.x+22,y:actor.y}].find(p=>canWalk(p.x,p.y));if(destination){const path=findWalkPath(data.player,destination);data.target=path.shift()||null;data.waypoints=path;data.enterAfter=target;}return;}
      const interaction={...target,coat:actor.coat,hair:actor.hair,context:data.room?'home':'outdoors',roomId:data.room?.id,activity:actor.activity,where:actor.where,moving:actor.moving};
      Promise.resolve(publishPosition()).then(()=>callbacks.current.onInteract?.(interaction));
      return;
    }
    if(target.type==='workspace'){
      if(workspaceTarget()?.id===target.id&&Math.hypot(data.player.x-485,data.player.y-(data.room?.id==='museum'?432:354))<46)callbacks.current.onInteract?.({...target,context:'home',roomId:data.room.id});
      return;
    }
    if(target.type==='building'&&data.room?.id===target.id&&residentPresence(target.id,data.scheduleMinutes))return;
    if(target.type==='building'&&data.room?.id!==target.id&&!(target.id==='meeting'&&!options.current.canEnterMeeting)){
      const building=WORLD_BUILDINGS.find(b=>b.id===target.id);
      if(building){const entered={...namedBuilding(building,options.current.npcNames),outside:data.room?.outside||{x:data.player.x,y:data.player.y,direction:data.player.direction}};data.room=entered;data.player={...data.player,x:485,y:446,direction:'up',moving:false};data.hover=null;data.nearKey=null;setRoomAction(null);setRoom(entered);publishRoom();canvasRef.current?.focus({preventScroll:true});if(['museum','industry'].includes(target.id)){if(target.id==='museum')callbacks.current.onStorySignal?.({action:'story-museum-open'});return;}if(residentPresence(target.id,data.scheduleMinutes))return;}
    }
    callbacks.current.onInteract?.(target);
  }
  function workspaceTarget(){
    const data=state.current,id=data.room?.id;
    if(id==='industry')return {id:'industry',type:'workspace',label:'查看行业工作台'};
    if(id==='museum')return {id:'museum',type:'workspace',label:'观察模型与守灯记录'};
    if(!id||!residentPresence(id,data.scheduleMinutes))return null;
    const name=options.current.npcNames[id]||WORLD_NPCS.find(n=>n.id===id)?.label;
    return{id,type:'workspace',label:id==='main'&&options.current.isOwner?'我的书桌':`${name}的书桌`};
  }
  function roomTarget(x,y){const data=state.current;if(data.room?.id==='museum'&&x>448&&x<525&&y>415&&y<450)return workspaceTarget();if(x>441&&x<533&&y>470&&y<511)return{id:'exit',type:'exit',label:'走出房间'};for(const actor of data.actors)if(Math.abs(x-actor.x)<22&&y>actor.y-47&&y<actor.y+9)return{id:actor.id,type:'npc',label:actor.label};if(x>416&&x<555&&y>289&&y<343)return workspaceTarget();return null;}
  function nearTarget(){const data=state.current;if(!data.room)return nearestTarget(data.player,data.actors,options.current.lifeState?.placements||[],options.current.lifeState?.narrative?.chapter,dailyObjects(options.current.lifeState?.daily));const npc=data.actors.find(a=>Math.hypot(a.x-data.player.x,a.y-data.player.y)<46);if(npc)return{id:npc.id,type:'npc',label:npc.label};if(workspaceTarget()&&Math.hypot(data.player.x-485,data.player.y-(data.room?.id==='museum'?432:354))<46)return workspaceTarget();if(data.player.y>456&&Math.abs(data.player.x-485)<65)return{id:'exit',type:'exit',label:'走出房间'};return null;}

  function beginAmbient(){
    interacted.current=true;
    if(options.current.muted&&options.current.musicMuted)return;
    try{
      if(audio.current){audio.current.resume();return;}
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      const context=new Audio();audio.current=context;ambientGain.current=createWeatherAudio(context);music.current=createTownMusic(context);threatAudio.current=createFogSound(context);
    }catch{/* Browsers without Web Audio still provide the complete quiet world. */}
  }
  useEffect(()=>{if(muted&&musicMuted)audio.current?.suspend();else if(interacted.current)beginAmbient();},[muted,musicMuted]);
  useEffect(()=>{const unlock=()=>beginAmbient();document.addEventListener('pointerdown',unlock);return()=>document.removeEventListener('pointerdown',unlock)},[]);
  useEffect(()=>()=>{audio.current?.close();},[]);
  useEffect(()=>{if(playerDetailsOpen)stopPlayer();},[playerDetailsOpen]);

  useEffect(()=>{
    const canvas=canvasRef.current, context=canvas.getContext('2d',{alpha:false});context.imageSmoothingEnabled=false;
    const terrain=document.createElement('canvas');terrain.width=W;terrain.height=H;drawTerrain(terrain.getContext('2d'));
    let raf,last=0,time=0,lastRender=0,alive=true,VW=960,VH=600;
    const resize=()=>{const bounds=canvas.getBoundingClientRect(),view=sceneViewport(bounds.width,bounds.height);VW=view.width;VH=view.height;canvas.width=VW;canvas.height=VH;context.imageSmoothingEnabled=false;state.current.viewport={width:VW,height:VH};};
    resize();const observer=new ResizeObserver(resize);observer.observe(canvas);

    const leisureRoute=createLeisureRoute();

    const data=state.current;
    const onBlur=()=>{data.keys.clear();data.player.moving=false;};
    const onKeyDown=e=>{
      if(document.activeElement!==canvas)return;
      if(options.current.interactionOpen)return;
      const key=e.key.toLowerCase();
      if(options.current.lifeState?.narrative?.downed)return;
      if(key==='k'){e.preventDefault();if(!e.repeat)strikeResident();return;}
      if(key==='escape'&&data.room){e.preventDefault();leaveRoom();return;}
      if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','e',' '].includes(key))e.preventDefault();
      if(key==='e'||key===' '){if(!e.repeat){const target=nearTarget();if(target)activateTarget(target);}return;}
      if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key)){data.player.direction=({w:'up',arrowup:'up',s:'down',arrowdown:'down',a:'left',arrowleft:'left',d:'right',arrowright:'right'})[key];data.keys.add(key);data.enterAfter=null;data.target=null;data.waypoints=[];data.clickMark=null;beginAmbient();}
    };
    const onKeyUp=e=>data.keys.delete(e.key.toLowerCase());
    canvas.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);window.addEventListener('blur',onBlur);canvas.addEventListener('blur',onBlur);
    const tick=now=>{
      if(!alive)return;
      const dt=Math.min((now-last)/1000||0,.06);last=now;
      const opts=options.current,player=data.player,narrative=opts.lifeState?.narrative;
      if(narrative?.replay&&data.replay!==narrative.replay){data.replay=narrative.replay;Object.assign(player,BOAT_SPAWN);data.room=null;setRoom(null);data.guidePhase=null;data.guidePose=null;data.introShown=false;}
      if(narrative?.restoreTag&&data.restoreTag!==narrative.restoreTag){data.restoreTag=narrative.restoreTag;data.restoredScope=undefined;data.keys.clear();data.target=null;data.waypoints=[];data.enterAfter=null;}
      if(narrative&&data.restoredScope!==opts.isOwner&&opts.isOwner===data.controlOwner){data.restoredScope=opts.isOwner;const p=narrative.position;if(p){Object.assign(player,p,{direction:p.direction||'up'});if(!p.room&&data.room){data.room=null;setRoom(null);publishRoom();}if(p.room){const b=p.room==='museum'?{id:'museum',label:'雾中生物展馆',doorX:LIFE_POINTS.find(e=>e.id==='museum').x,doorY:LIFE_POINTS.find(e=>e.id==='museum').y}:WORLD_BUILDINGS.find(b=>b.id===p.room);if(b){data.room={...namedBuilding(b,opts.npcNames),outside:{x:b.doorX,y:b.doorY+8}};setRoom(data.room);}}}}
      if(narrative&&data.rescueScope!==opts.isOwner){data.rescueScope=opts.isOwner;data.rescue=narrative.rescue||0;}
      if(narrative?.rescue&&(data.rescue||0)<narrative.rescue){data.rescue=narrative.rescue;const b=WORLD_BUILDINGS[0];data.room={...namedBuilding(b,opts.npcNames),outside:{x:b.doorX,y:b.doorY+8}};Object.assign(player,{x:485,y:446});setRoom(data.room);publishRoom();}
      if(narrative&&(!opts.interactionOpen&&now>(data.lastPosition||0)+4000||opts.interactionOpen&&!data.positionPaused)){data.lastPosition=now;publishPosition();}data.positionPaused=opts.interactionOpen;

      data.light??=opts.daylight;data.rain??=0;data.fog??=0;
      const ease=1-Math.exp(-dt/3);data.light+=(opts.daylight-data.light)*ease;data.rain+=((opts.weather==='rain'?1:0)-data.rain)*ease;data.fog+=((opts.weather==='fog'?1:0)-data.fog)*ease;
      const darkness=1-data.light;
      if(audio.current?.state==='running')ambientGain.current?.update({weather:opts.weather,volume:opts.muted?0:opts.volume,indoors:!!data.room,light:data.light});
      if(audio.current?.state==='running')threatAudio.current?.update({volume:opts.muted?0:opts.volume,fog:narrative?.phase==='fog',form:narrative?.chapter,indoors:!!data.room,threat:!data.room&&data.monster&&!narrative?.night?.dispelled&&!LIFE_LAMPS.some(l=>opts.lifeState?.lamps.includes(l.id)&&Math.hypot(player.x-l.x,player.y-l.y)<82)?Math.max(0,1-Math.hypot(data.monster.x-player.x,data.monster.y-player.y)/220):0,pan:data.monster?(data.monster.x-player.x)/180:0,steps:player.moving,wellNear:!data.room&&Math.hypot(player.x-WORLD_ENVIRONMENT.find(e=>e.id==='well').x,player.y-WORLD_ENVIRONMENT.find(e=>e.id==='well').y)<110,wellPan:(WORLD_ENVIRONMENT.find(e=>e.id==='well').x-player.x)/110});
      if(audio.current?.state==='running')music.current?.update({volume:opts.musicVolume,muted:opts.musicMuted,indoors:!!data.room,night:opts.night,fog:opts.weather==='fog'});
      data.nextStorm??=now+18000+Math.random()*14000;
      data.flash=Math.max(0,(data.flash||0)-dt*.7);
      if(opts.weather!=='rain'){data.nextStorm=now+14000+Math.random()*14000;}
      else if(now>data.nextStorm){data.nextStorm=now+26000+Math.random()*30000;data.flash=opts.reducedMotion?0:.22;if(audio.current?.state==='running'&&!opts.muted)ambientGain.current?.thunder(1.2+Math.random()*1.8);}

      canvas.style.backgroundColor=mixColor('#83b7ac','#273d50',darkness);
      if(!opts.interactionOpen){time+=dt;data.scheduleMinutes=opts.gameMinutes;}else {data.keys.clear();data.target=null;data.waypoints=[];data.player.moving=false;}
      if(opts.isOwner!==data.controlOwner){
        const released=data.room?{...player,...data.room.outside}:player;
        const other=opts.isOwner?(data.residents.main?.atHome?{x:WORLD_BUILDINGS[0].doorX,y:WORLD_BUILDINGS[0].doorY+6,direction:'down'}:data.outdoorMain||{x:663,y:324}):data.leisurePose||BOAT_SPAWN;
        const swapped=swapControlledPosition(released,other);
        Object.assign(player,swapped.controlled,{moving:false});
        if(opts.isOwner){data.leisureRoute=[swapped.released,...findWalkPath(swapped.released,leisureRoute[0]),...leisureRoute.slice(1),...findWalkPath(leisureRoute.at(-1),swapped.released)];data.leisureSince=time;}
        else {data.mainRelease=[swapped.released,...findWalkPath(swapped.released,{x:663,y:324}),...findWalkPath({x:663,y:324},{x:494,y:278}),...findWalkPath({x:494,y:278},swapped.released)];data.mainSince=time;data.residents.main={...data.residents.main,atHome:false,transition:null,pose:{...swapped.released,moving:false},route:data.mainRelease,routeSince:time};}
        data.controlOwner=opts.isOwner;data.restoredScope=narrative?opts.isOwner:undefined;data.room=null;setRoom(null);data.keys.clear();data.target=null;data.waypoints=[];data.clickMark=null;
        publishRoom();
      }
      Object.assign(player,controlledCharacter(opts.isOwner,opts.ownerAvatar||{},opts.npcNames.main||'云舟',opts.visitorIdentity?.name||opts.npcNames.wanderer||'松果'));
      let dx=0,dy=0;
      if(data.keys.has('arrowleft')||data.keys.has('a'))dx-=1;if(data.keys.has('arrowright')||data.keys.has('d'))dx+=1;
      if(data.keys.has('arrowup')||data.keys.has('w'))dy-=1;if(data.keys.has('arrowdown')||data.keys.has('s'))dy+=1;
      if(data.target&&!dx&&!dy){dx=data.target.x-player.x;dy=data.target.y-player.y;const distance=Math.hypot(dx,dy);if(distance<3){data.target=data.waypoints.shift()||null;if(!data.target)data.clickMark=null;dx=0;dy=0;}}
      if(narrative?.downed){dx=0;dy=0;data.keys.clear();data.target=null;data.waypoints=[];}
      const length=Math.hypot(dx,dy), speed=76;
      player.moving=length>0;
      if(length){
        player.direction=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
        const next=data.room?moveInside(player,dx/length*speed*dt,dy/length*speed*dt,data.room):moveWithCollision(player,dx/length*speed*dt,dy/length*speed*dt);
        if(Math.hypot(next.x-player.x,next.y-player.y)<.1&&data.target){data.blocked+=dt;if(data.blocked>.4){data.target=null;data.clickMark=null;data.blocked=0;}}else data.blocked=0;
        player.x=next.x;player.y=next.y;
      }
      if(data.enterAfter&&!data.target&&!data.keys.size&&!opts.interactionOpen){const target=data.enterAfter;data.enterAfter=null;activateTarget(target);}
      if(!data.room&&data.knockback&&now<data.knockback.until){const push=moveWithCollision(player,data.knockback.x*210*dt,data.knockback.y*210*dt);Object.assign(player,push);player.moving=false;}
      const cat=WORLD_ENVIRONMENT.find(e=>e.id==='cat');
      if(!data.catRoute){const stops=[{x:772.5,y:517.5},{x:805,y:480},{x:920,y:465},{x:780,y:550},{x:670,y:535},{x:772.5,y:517.5}];data.catRoute=[stops[0]];for(let i=1;i<stops.length;i++)data.catRoute.push(...findWalkPath(data.catRoute.at(-1),stops[i]));data.catClock=0;data.catIndex=1;}
      cat.moving=false;
      if(!data.room&&now>(data.catPauseUntil||0)&&Math.hypot(player.x-cat.x,player.y-cat.y)>38){const goal=data.catRoute[data.catIndex],dx=goal.x-cat.x,dy=goal.y-cat.y,d=Math.hypot(dx,dy);if(d<3){data.catIndex=(data.catIndex+1)%data.catRoute.length;if(data.catIndex===0)data.catPauseUntil=now+5000;}else{Object.assign(cat,moveWithCollision(cat,dx/d*Math.min(d,22*dt),dy/d*Math.min(d,22*dt)));cat.moving=true;cat.direction=dx<0?'left':'right';}}
      const place=data.room?`${data.room.label} · 室内`:locationAt(player.x,player.y,opts.npcNames);if(place!==data.location){data.location=place;callbacks.current.onLocationChange?.(place);}
      const actors=[];
      const daily=opts.lifeState?.daily,dayStage=!daily&&narrative?.prologue==='complete'&&narrative.phase==='day'&&!data.room?chapterFor(narrative).dayEvent:null;
      const dailyActive=daily&&daily.phase!=='ended'&&narrative?.prologue==='complete'&&['day','dusk'].includes(narrative.phase);
      const dailyScope=(opts.isOwner?'owner':'visitor')+':'+daily?.day+':'+daily?.skeleton;
      if(daily&&data.dailyScope!==dailyScope){data.dailyScope=dailyScope;data.dailyMinute=daily.clockMinutes;data.dailyPerformance=newDailyPerformance(daily);}
      if(daily){for(const [id,checkpoint] of Object.entries(daily.performance?.encounters||{}))if(['finished','missed'].includes(checkpoint.status))data.dailyPerformance.encounters[id]=checkpoint;}
      for(const [i,npc] of WORLD_NPCS.entries()){
        if(!data.residents[npc.id]){const presence=residentPresence(npc.id,data.scheduleMinutes,opts.weather),route=walkableResidentRoute(npc),building=WORLD_BUILDINGS.find(b=>b.id===npc.id);data.residents[npc.id]={atHome:presence.atHome,transition:null,route,routeSince:time-i*5,pose:{...(route[0]||{x:building.doorX,y:building.doorY+5}),moving:false,direction:'down'},presence};}
        const resident=data.residents[npc.id];
        if(dailyActive&&Object.hasOwn(dailySkeleton(daily.skeleton).actors,npc.id)&&resident.dailyScope!==dailyScope){const saved=daily.actorPositions?.[npc.id],b=WORLD_BUILDINGS.find(b=>b.id===npc.id);if(saved&&canWalk(saved.x,saved.y))resident.pose={...saved,moving:false};else if(resident.atHome)resident.pose={x:b.doorX,y:b.doorY+5,moving:false,direction:'down'};resident.dailyScope=dailyScope;}
        if(resident.overridePose){resident.pose={...resident.overridePose};resident.overridePose=null;resident.atHome=false;resident.transition=null;resident.needsResume=true;}
      }
      const unavailable=opts.reception?[opts.reception.npcId]:[];
      const dailyMinute=daily?dailyPresentationMinute(daily,data.scheduleMinutes,data.dailyMinute):data.scheduleMinutes;data.dailyMinute=dailyMinute;
      const dailyShow=dailyActive?advanceDailyCast(daily,data.residents,dailyMinute,dt,{paused:opts.interactionOpen||document.hidden,unavailable,performance:data.dailyPerformance}):{actors:{}};
      if(dailyShow.changed&&!opts.interactionOpen){data.lastPosition=now;publishPosition();}

      WORLD_NPCS.forEach((npc,i)=>{
        const presence=residentPresence(npc.id,data.scheduleMinutes,opts.weather),building=WORLD_BUILDINGS.find(b=>b.id===npc.id),door={x:building.doorX,y:building.doorY+5};
        let resident=data.residents[npc.id];
        if(!resident){const route=walkableResidentRoute(npc);resident=data.residents[npc.id]={atHome:presence.atHome,transition:null,route,routeSince:time-i*5,pose:{...(route[0]||door),moving:false,direction:'down'},presence};}
        resident.presence=presence;
        const dailyActor=dailyShow.actors[npc.id],priority=opts.reception?.npcId===npc.id||npc.id==='customs'&&['arrival','escort','warning'].includes(narrative?.prologue);
        const directed=!!dailyActor||!data.room&&((opts.reception?.npcId===npc.id)||(npc.id==='customs'&&['arrival','escort','warning'].includes(narrative?.prologue))||(dayStage&&opts.gameMinutes%1440>=dayStage.from&&opts.gameMinutes%1440<dayStage.to&&dayStage.participants.includes(npc.id)));
        if(resident.overridePose){resident.pose={...resident.overridePose};resident.overridePose=null;resident.atHome=false;resident.transition=null;resident.needsResume=true;}
        if(resident.needsResume&&!directed){resident.route=startResidentRoute(resident.pose,walkableResidentRoute(npc));resident.walkIndex=1;resident.rest=0;resident.needsResume=false;}


        if(dailyActor&&!priority&&!(opts.isOwner&&npc.id==='main')){
          resident.overridePose=null;resident.needsResume=false;
          const actor={...npc,...dailyActor,label:opts.npcNames[npc.id]||npc.label,seed:i,reducedMotion:opts.reducedMotion};
          resident.actor=actor;actors.push(actor);return;
        }
        if(resident.dailyKey){resident.dailyKey=null;resident.dailyPath=[];resident.needsResume=true;}
        if(!directed&&!opts.interactionOpen&&!(opts.isOwner&&npc.id==='main')){
          if(presence.atHome&&!resident.atHome&&!resident.transition){
            const path=findWalkPath(resident.pose,door);if(path.length)resident.transition={path:[{x:resident.pose.x,y:resident.pose.y},...path],since:time};
            // A resident already standing at their threshold can enter immediately.
            if(!path.length&&Math.hypot(resident.pose.x-door.x,resident.pose.y-door.y)<12){resident.atHome=true;resident.transition=null;}
          }else if(!presence.atHome&&resident.atHome){
            const base=walkableResidentRoute(npc);resident.atHome=false;resident.transition=null;resident.route=startResidentRoute(door,base);resident.routeSince=time;resident.walkIndex=1;resident.rest=0;resident.pose={...door,moving:false,direction:'down'};
          }else if(!presence.atHome&&resident.transition){resident.transition=null;resident.route=startResidentRoute(resident.pose,walkableResidentRoute(npc));resident.routeSince=time;resident.walkIndex=1;resident.rest=0;}
        }
        const wasOutside=!resident.atHome;
        if(wasOutside)advanceResident(resident,dt, resident.transition?32:24,directed||opts.interactionOpen||(!data.room&&Math.hypot(player.x-resident.pose.x,player.y-resident.pose.y)<38));
        if(wasOutside&&resident.atHome)resident.enteredAt=time;
        const doorwayFade=resident.atHome&&time-(resident.enteredAt??-10)<.45?1-(time-resident.enteredAt)/.45:0;
        const actor={...npc,...opts.lifeState?.npcStyles?.[npc.id],label:opts.npcNames[npc.id]||npc.label,activity:resident.transition?'沿着小路回家':presence.activity,...(npc.id==='main'&&opts.ownerAvatar?{coat:opts.ownerAvatar.body,hair:opts.ownerAvatar.hair,skin:opts.ownerAvatar.skin,hat:opts.ownerAvatar.hat}:{}),...resident.pose,opacity:doorwayFade||1,reducedMotion:opts.reducedMotion,seed:i};
        if(daily?.phase==='ended'&&npc.id===dailySkeleton(daily.skeleton).recipient&&!resident.atHome){
          if(!data.dailyPerformance.closures[npc.id]){data.dailyPerformance.closures[npc.id]=true;resident.closureUntil=data.scheduleMinutes+12;publishPosition();}
          if(data.scheduleMinutes<resident.closureUntil){actor.speech=dailyEnding(daily);actor.dailyAction='give';}
        }
        resident.actor=actor;
        if((!resident.atHome||doorwayFade>0)&&(!opts.isOwner||npc.id!=='main'))actors.push(actor);
      });
      if(opts.reception&&!data.room){
        const plan=opts.reception,npc=WORLD_NPCS.find(n=>n.id===plan.npcId)||WORLD_NPCS[1];
        if(data.receptionId!==plan.id){data.receptionId=plan.id;const home=WORLD_BUILDINGS.find(b=>b.id===npc.id);const from=data.residents[npc.id]?.atHome?{x:home.doorX,y:home.doorY+5}:data.residents[npc.id]?.pose||{x:npc.x,y:npc.y};const destination=plan.kind==='welcome'?{x:player.x,y:player.y}: {x:795,y:345};const path=findWalkPath(from,destination);data.receptionRoute=[from,...path];data.receptionSince=time;}
        const pose=routeToEnd(data.receptionRoute,time-data.receptionSince,30);
        const n=actors.findIndex(a=>a.id===npc.id);if(n>=0)actors.splice(n,1);
        if(pose)actors.push({...npc,...opts.lifeState?.npcStyles?.[npc.id],...pose,label:opts.npcNames[npc.id]||npc.label,activity:plan.kind==='welcome'?'前来欢迎旅人':'查看已授权资料，后台独立处理',seed:90});
      }
      // The director stages authored daytime meetings; missed facts remain available by asking.
      if(!daily&&narrative?.prologue==='complete'&&narrative.phase==='day'&&!data.room&&!opts.interactionOpen){
        const chapter=chapterFor(narrative),m=opts.gameMinutes%1440,event=chapter.dayEvent;
        if(m>=event.from&&m<event.to){
          const key=narrative.number+':'+chapter.id;
          if(data.dayEventKey!==key){data.dayEventKey=key;data.dayEventSince=time;data.dayRoutes=event.participants.map((id,i)=>{const npc=WORLD_NPCS.find(a=>a.id===id),home=WORLD_BUILDINGS.find(b=>b.id===id),from=data.residents[id]?.atHome?{x:home.doorX,y:home.doorY+8}:data.residents[id]?.pose||npc,to={x:657+i*31,y:447};return{id,path:[from,...findWalkPath(from,to)]};});}
          let together=true;
          for(let i=0;i<data.dayRoutes.length;i++){const entry=data.dayRoutes[i],npc=WORLD_NPCS.find(a=>a.id===entry.id),pose=routeToEnd(entry.path,time-data.dayEventSince,30);const index=actors.findIndex(a=>a.id===entry.id);if(index>=0)actors.splice(index,1);if(pose){const resident=data.residents[entry.id];if(resident){resident.pose=pose;resident.atHome=false;resident.transition=null;}actors.push({...npc,...pose,label:opts.npcNames[entry.id]||npc.label,activity:'在井边检查白天留下的异常',speech:pose.done?event.lines[i]:null});together&&=pose.done;}else together=false;}
          if(together&&!narrative.dayHeard?.includes(chapter.id)&&Math.hypot(player.x-657,player.y-447)<155&&now>(data.dayHeardAt||0)+3000){data.dayHeardAt=now;callbacks.current.onStorySignal?.({action:'story-day-seen'});}
        }
      }
      if(narrative&&!data.room&&['arrival','escort'].includes(narrative.prologue)){
        const npc=WORLD_NPCS.find(a=>a.id==='customs'),home=WORLD_BUILDINGS.find(b=>b.id==='customs'),main=WORLD_BUILDINGS[0];
        if(data.guidePhase!==narrative.prologue){data.guidePhase=narrative.prologue;const from=data.guidePose||{x:home.doorX,y:home.doorY+8};const destination=narrative.prologue==='arrival'?{x:BOAT_SPAWN.x+8,y:BOAT_SPAWN.y-3}:{x:main.doorX,y:main.doorY+10};data.guideRoute=[from,...findWalkPath(from,destination)];data.guideElapsed=0;}
        const distance=data.guidePose?Math.hypot(data.guidePose.x-player.x,data.guidePose.y-player.y):0;
        const end=data.guideRoute.at(-1);const ahead=end&&Math.hypot(player.x-end.x,player.y-end.y)<Math.hypot((data.guidePose?.x||0)-end.x,(data.guidePose?.y||0)-end.y);
        if(narrative.prologue==='arrival'||distance<95||ahead)data.guideElapsed+=opts.interactionOpen?0:dt;
        const pose=routeToEnd(data.guideRoute,data.guideElapsed,47);data.guidePose=pose;const old=actors.findIndex(a=>a.id==='customs');if(old>=0)actors.splice(old,1);if(pose)actors.push({...npc,...pose,label:opts.npcNames.customs||npc.label,activity:narrative.prologue==='escort'?'带路，等着旅人跟上':'从屋里出来接待',speech:narrative.prologue==='escort'&&distance>95?'慢慢走，我在这里等你。':null});
        if(narrative.prologue==='arrival'&&pose?.done&&!data.introShown){data.introShown=true;callbacks.current.onStorySignal?.({action:'story-intro'});}
      }
      if(narrative?.prologue==='arrival'&&data.introShown&&narrative.dialogues['arrival:customs']===undefined&&!opts.interactionOpen&&now>(data.introRetry||0)+5000){data.introRetry=now;callbacks.current.onStorySignal?.({action:'story-intro'});}
      if(narrative?.prologue==='complete'&&data.guidePhase==='arrival')data.introShown=false;
      if(narrative?.phase==='fog'&&narrative.night&&!data.room){
        if(data.monsterNight!==narrative.night.token){data.monsterNight=narrative.night.token;data.monster=null;data.monsterSeen=false;data.chasePath=[];data.nextChase=0;}
        if(!data.monster){const choices=[{x:player.x+140,y:player.y},{x:player.x-140,y:player.y},{x:player.x,y:player.y-130},{x:player.x,y:player.y+130}];const spawn=choices.find(p=>canWalk(p.x,p.y));if(spawn)data.monster={...spawn};}
        if(data.monster&&!opts.interactionOpen){const monster=data.monster,safe=LIFE_LAMPS.some(l=>opts.lifeState.lamps.includes(l.id)&&Math.hypot(player.x-l.x,player.y-l.y)<82),dispel=narrative.night.dispelled;
          if(!data.monsterSeen&&Math.hypot(monster.x-player.x,monster.y-player.y)<175&&!dispel){data.monsterSeen=true;callbacks.current.onStorySignal?.({action:'story-seen'});data.revealUntil=now+2400;}
          if(safe&&narrative.night.seen&&!narrative.night.lampRepelled&&Math.hypot(monster.x-player.x,monster.y-player.y)<160&&now>(data.repelAt||0)+2500){data.repelAt=now;callbacks.current.onStorySignal?.({action:'story-repel'});}
          if(now>data.nextChase){data.nextChase=now+1200;const retreat=safe||dispel;const dx=monster.x-player.x,dy=monster.y-player.y,d=Math.hypot(dx,dy)||1;const candidates=retreat?Array.from({length:8},(_,i)=>({x:monster.x+Math.cos(i*Math.PI/4)*90,y:monster.y+Math.sin(i*Math.PI/4)*90})).filter(p=>canWalk(p.x,p.y)).sort((a,b)=>Math.hypot(b.x-player.x,b.y-player.y)-Math.hypot(a.x-player.x,a.y-player.y)):[player];data.chasePath=[];for(const goal of candidates){const route=findWalkPath(monster,goal);if(route.length){data.chasePath=route;break;}}}
          const goal=data.chasePath[0];if(goal){const dx=goal.x-monster.x,dy=goal.y-monster.y,d=Math.hypot(dx,dy),step=Math.min(d,dt*(safe||dispel?58:48));if(d>1){const next=moveWithCollision(monster,dx/d*step,dy/d*step);Object.assign(monster,next);}if(d<3)data.chasePath.shift();}
          if(!narrative.downed&&!safe&&!dispel&&Math.hypot(monster.x-player.x,monster.y-player.y)<23&&now>(data.attackAt||0)+4000){data.attackAt=now;data.staggerUntil=now+700;const dx=player.x-monster.x,dy=player.y-monster.y,d=Math.hypot(dx,dy)||1;data.knockback={x:dx/d,y:dy/d,until:now+260};data.target=null;data.waypoints=[];data.enterAfter=null;threatAudio.current?.impact(opts.muted?0:opts.volume);callbacks.current.onStorySignal?.({action:'story-hit',room:null});}
        }
      }
      if(narrative?.prologue==='warning'&&!data.room){const npc=WORLD_NPCS.find(a=>a.id==='customs'),b=WORLD_BUILDINGS[0],pose={x:b.doorX+20,y:b.doorY+10,moving:false,direction:'left'};const index=actors.findIndex(a=>a.id==='customs');if(index>=0)actors.splice(index,1);actors.push({...npc,...pose,label:opts.npcNames.customs||npc.label,activity:'在门前检查暮色'});const resident=data.residents.customs;if(resident){resident.atHome=false;resident.pose=pose;resident.transition=null;}}
      // Story/reception movement owns the visible pose; resume ordinary life from it.
      for(const actor of actors){const resident=data.residents[actor.id];if(resident&&actor!==resident.actor)resident.overridePose={x:actor.x,y:actor.y,direction:actor.direction,moving:actor.moving};}
      const mainActor=actors.find(a=>a.id==='main');
      if(mainActor)data.outdoorMain={...mainActor};
      if(opts.isOwner&&!opts.projections.length&&data.leisureRoute?.length){
        if(data.wandererMotion?.route!==data.leisureRoute)data.wandererMotion={route:data.leisureRoute,pose:{...data.leisureRoute[0]},atHome:false};
        const pose=advanceResident(data.wandererMotion,dt,22,opts.interactionOpen||Math.hypot(player.x-data.wandererMotion.pose.x,player.y-data.wandererMotion.pose.y)<38);
        data.leisurePose=pose;
        actors.push({id:'wanderer',...controlledCharacter(false,{},'',opts.npcNames.wanderer||'松果'),...pose,label:opts.npcNames.wanderer||'松果',activity:pose.y>450?'听海浪':pose.x<240?'捡松果':'看树影',seed:77,reducedMotion:opts.reducedMotion});
      }

      if(narrative?.combatDemo){actors.splice(0,actors.length,...Object.keys(STORY_RESIDENTS).map((id,i)=>({...WORLD_NPCS.find(a=>a.id===id),id,label:STORY_RESIDENTS[id].name+(id==='main'?' · 剧情残影':''),x:620+i*50,y:500,coat:id==='main'?'#3e4258':WORLD_NPCS.find(a=>a.id===id)?.coat||'#c2a373',hair:'#6b5843',moving:false,direction:'down'})));Object.assign(player,controlledCharacter(false,{},'', '验收旅人'));}
      const projectionActors=(opts.isOwner?opts.projections.slice(0,1):[]).map(p=>{
        if(data.visitorWalk?.id!==p.id){const loop=createLeisureRoute(),start=p.visitId===opts.visitorIdentity?.id&&data.leisureRoute?.length?data.leisureRoute[0]:loop[0];data.visitorWalk={id:p.id,x:start.x,y:start.y,index:1,path:[start,...findWalkPath(start,loop[0]),...loop.slice(1),...findWalkPath(loop.at(-1),start)],direction:'down'};}
        const walk=data.visitorWalk;walk.moving=false;
        if(!opts.interactionOpen&&Math.hypot(player.x-walk.x,player.y-walk.y)>52){const goal=walk.path[walk.index]||walk.path[0],dx=goal.x-walk.x,dy=goal.y-walk.y,d=Math.hypot(dx,dy);if(d<3)walk.index=(walk.index+1)%walk.path.length;else{Object.assign(walk,moveWithCollision(walk,dx/d*Math.min(d,24*dt),dy/d*Math.min(d,24*dt)));walk.moving=true;walk.direction=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';}}
        if(p.visitId===opts.visitorIdentity?.id)data.leisurePose={x:walk.x,y:walk.y,direction:walk.direction};
        const appearance=p.appearance||p.avatar||{};
        return {...p,...walk,id:p.id,label:p.name||'来访投影',coat:appearance.coat||appearance.body||'#d9af6c',hair:appearance.hair||'#684c38',hat:appearance.hat||null,skin:appearance.skin||'#e4bf8f',projection:true,showLabel:true,seed:20};
      });
      if(data.room){
        const resident=data.residents[data.room.id],atHome=resident?.atHome&&!(data.room.id==='main'&&opts.isOwner);
        data.actors=(data.room.id==='main'&&['house','houseReady'].includes(narrative?.prologue))?[{...WORLD_NPCS.find(n=>n.id==='customs'),x:585,y:357,label:opts.npcNames.customs||WORLD_NPCS.find(n=>n.id==='customs').label,moving:false,direction:'left'}]:atHome?[{...resident.actor,x:585,y:357,moving:false,direction:'left'}]:data.room.id==='meeting'?projectionActors.filter(a=>a.accepted).map((a,i)=>({...a,x:588+(i%3)*26,y:368+Math.floor(i/3)*26})):[];
      }else data.actors=[...actors,...projectionActors];
      if(!data.room&&narrative?.phase==='morning')for(const id of narrative.injuries){if(id==='main'&&opts.isOwner)continue;const b=WORLD_BUILDINGS.find(b=>b.id===id),npc=WORLD_NPCS.find(a=>a.id===id);if(b&&npc){data.actors=data.actors.filter(a=>a.id!==id);const pose={x:b.doorX+20,y:b.doorY+20,direction:'left',moving:false};data.actors.push({...npc,...pose,label:opts.npcNames[id]||npc.label,injured:true,activity:'扶着手臂，清理门前的木片'});if(data.residents[id]){data.residents[id].atHome=false;data.residents[id].pose=pose;data.residents[id].transition=null;}}}

      if(narrative?.downed&&data.downedEvent!==narrative.downed.eventId){data.downedEvent=narrative.downed.eventId;if(Date.now()-narrative.downed.at<2000)threatAudio.current?.combat('heavy',opts.muted?0:opts.volume);}
      const reactions=narrative?.combat?.events||[];
      for(const event of reactions){
        const age=(Date.now()-event.at)/1000;data.reactionSounds??=new Set();if(age<2&&!data.reactionSounds.has(event.id)){data.reactionSounds.add(event.id);threatAudio.current?.combat(['customs','main','archive'].includes(event.target)?'shield':['curator','liaison'].includes(event.target)?'drop':'light',opts.muted?0:opts.volume);if(['customs','main'].includes(event.target)){const d=Math.hypot(player.x-event.x,player.y-event.y)||1;Object.assign(player,data.room?moveInside(player,(player.x-event.x)/d*7,(player.y-event.y)/d*7,data.room):moveWithCollision(player,(player.x-event.x)/d*7,(player.y-event.y)/d*7));}}
        if(event.damage&&!event.resolved&&Date.now()>=event.due){data.counterSent??=new Set();if(!data.counterSent.has(event.id)){data.counterSent.add(event.id);callbacks.current.onStorySignal?.({action:'resident-counter',eventId:event.id,player:{x:player.x,y:player.y},room:data.room?.id||null});}}
        if(event.hit&&Date.now()-event.hitAt<2500&&data.lastCounterHit!==event.id){data.lastCounterHit=event.id;const d=Math.hypot(player.x-event.x,player.y-event.y)||1,dx=(player.x-event.x)/d*28,dy=(player.y-event.y)/d*28;Object.assign(player,data.room?moveInside(player,dx,dy,data.room):moveWithCollision(player,dx,dy));data.staggerUntil=now+700;threatAudio.current?.combat('heavy',opts.muted?0:opts.volume);}
        if(age>=0&&age<2.4&&event.room===(data.room?.id||null)){const actor=data.actors.find(a=>a.id===event.target);if(actor){actor.reaction=event;actor.reactionAge=age;actor.moving=false;actor.x=event.x;actor.y=event.y;const shift=['curator','wanderer','liaison'].includes(actor.id)?Math.min(18,age*45):0;const away=Math.atan2(actor.y-player.y,actor.x-player.x);const to={x:actor.x+Math.cos(away)*shift,y:actor.y+Math.sin(away)*shift};if(data.room?roomCanWalk(to.x,to.y,data.room):canWalk(to.x,to.y))Object.assign(actor,to);}}
      }
      const attackable=data.actors.find(a=>!a.projection&&STORY_RESIDENTS[a.id]&&strikeInRange(player,a,{room:!!data.room,clear:canWalk}));if((attackable?.id||null)!==data.strikeHint){data.strikeHint=attackable?.id||null;setStrikeHint(attackable?.label||null);}
      publishRoom();
      // Reduced motion keeps the world still except when the visitor moves.
      if(now-lastRender>1000/(opts.reducedMotion&&!player.moving?15:50)){
        lastRender=now;context.setTransform(1,0,0,1,0,0);rect(context,P.water,0,0,VW,VH);if(!data.room){data.camera??={x:0,y:Math.max(0,H-VH)};const cx=Math.max(0,Math.min(W-VW,player.x-VW/2)),cy=Math.max(0,Math.min(H-VH,player.y-VH/2));data.camera.x+=(cx-data.camera.x)*(1-Math.exp(-dt*8));data.camera.y+=(cy-data.camera.y)*(1-Math.exp(-dt*8));data.view={zoom:1,offsetX:-Math.round(data.camera.x),offsetY:-Math.round(data.camera.y)};}else data.view=roomView(VW,VH,opts.conversationOpen);context.setTransform(data.view.zoom,0,0,data.view.zoom,data.view.offsetX,data.view.offsetY);if(data.room)drawRoom(context,data.room,darkness);else context.drawImage(terrain,0,0);
        const near=nearTarget(),hover=data.hover;
        const nearKey=near?`${near.type}:${near.id}`:null;
        if(nearKey!==data.nearKey){data.nearKey=nearKey;data.nearSince=now;setRoomAction(data.room&&near&&near.type!=='exit'?near:null);}
        const focus=hover||near;
        const promptVisible=data.room&&near&&near.type!=='exit'||(hover?now-data.hoverSince<3500:now-data.nearSince<3000);
        if(!data.room)drawNorthBoat(context,opts.lifeState?.boat,time);
        const sceneLayers=WORLD_ENVIRONMENT.filter(e=>['well','bench','laundry'].includes(e.id)).map(e=>({y:e.y,draw:()=>{if(e.id==='laundry'){drawLaundry(context,e.x,e.y,time,narrative?.chapter==='tide',opts.reducedMotion);return;}context.save();context.translate(e.x-(e.id==='well'?418:581),e.y-(e.id==='well'?285:279));if(e.id==='well')drawWell(context);else drawBench(context);context.restore();}}));
        sceneLayers.push({y:LIFE_FACILITY.y,draw:()=>drawFlowerRack(context,LIFE_FACILITY.x,LIFE_FACILITY.y,opts.lifeState?.facility==='damaged',opts.reducedMotion?1:Math.min(1,(Date.now()-(opts.lifeState?.lastRepairAt||0))/1800))});
        const layers=[...(data.room?[]:[...sceneLayers,...WORLD_TREES.map(tree=>({y:tree[1],draw:()=>{context.save();if([player,...data.actors].some(a=>Math.abs(a.x-tree[0])<30*tree[2]&&a.y>tree[1]-116*tree[2]&&a.y<tree[1]-12))context.globalAlpha=.55;drawTree(context,tree);context.restore();}})),...WORLD_BUILDINGS.map(b=>({y:b.y+b.h,draw:()=>{const behind=[player,...data.actors].some(a=>a.x>b.x-8&&a.x<b.x+b.w+15&&a.y>b.y-6&&a.y<b.y+24);context.save();if(behind)context.globalAlpha=.48;drawBuilding(context,namedBuilding(b,opts.npcNames),darkness,focus?.type==='building'&&focus.id===b.id,opts.reducedMotion?0:time);context.restore();}})),{y:cat.y,draw:()=>{context.save();context.translate(cat.x,cat.y);if(cat.direction==='left')context.scale(-1,1);context.translate(-515,-345);drawCat(context,time,opts.reducedMotion);if(cat.moving&&!opts.reducedMotion){rect(context,'#ad8b5d',510,345,3,2+Math.sin(time*12)*2);rect(context,'#ad8b5d',522,345,3,2-Math.sin(time*12)*2);}context.restore();}}]),...data.actors.map(a=>({y:a.y,draw:()=>{drawPerson(context,{...a,showLabel:opts.isOwner||narrative?.known.includes(a.id)},time);drawDailyGesture(context,a,opts.reducedMotion?0:time)}})),{y:player.y,draw:()=>drawPerson(context,{...player,downed:!!narrative?.downed,y:player.y+(now<(data.staggerUntil||0)?Math.sin(time*25)*3:0),reducedMotion:opts.reducedMotion},time,true)}].sort((a,b)=>a.y-b.y);
        layers.forEach(layer=>layer.draw()); 
        if(now<(data.swingUntil||0)){const facing={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[player.direction]||[0,1];line(context,[[player.x,player.y-14],[player.x+facing[0]*24,player.y-14+facing[1]*24]],'#efcb98',5);}
        for(const actor of data.actors)if(actor.reaction){const e=actor.reaction,age=actor.reactionAge,x=actor.x,y=actor.y;if(age<.35)for(let i=0;i<5;i++){const angle=i*1.25;line(context,[[x+Math.cos(angle)*9,y-15+Math.sin(angle)*9],[x+Math.cos(angle)*18,y-15+Math.sin(angle)*18]],'#efd6a0',2);}if(actor.id==='customs'||actor.id==='main'){context.strokeStyle=actor.id==='main'?'#556074':'#e1d8a4';context.lineWidth=2;context.beginPath();context.ellipse(x,y-14,18,24,0,0,Math.PI*2);context.stroke();}if(actor.id==='curator'&&age<2){line(context,[[e.x+12,e.y+5],[e.x+23,e.y+8]],'#b6915a',3);if(age>1.5)line(context,[[x,y-10],[e.x+16,e.y+6]],'#d9b889',3);}if(actor.id==='liaison'&&age<2){for(let i=0;i<3;i++)rect(context,'#eee0b8',e.x-13+i*13,e.y+4+(i%2)*4,9,5);if(age>1.5)line(context,[[x,y-8],[e.x+8,e.y+7]],'#d9b889',3);}if(actor.id==='archive'&&age<.75){rect(context,'#687e8a',e.x+15,e.y+5,8,10);text(context,'!',x,y-52,15,'#edce88');}if(actor.id==='archive'&&age>.75&&age<1.1)line(context,[[x,y-14],[player.x,player.y-14]],'#ead4aa',4);if(Date.now()-e.at<1800)text(context,STORY_RESIDENTS[actor.id].lines[(e.count-1)%STORY_RESIDENTS[actor.id].lines.length],x,y-60,10,'#ede2bf');}

        if(data.room?.id==='museum'){for(let i=0;i<CHAPTERS.length;i++){const ch=CHAPTERS[i],xx=330+i%3*150,yy=285+Math.floor(i/3)*110;rect(context,'#8c7c65',xx-37,yy-59,74,65);rect(context,'#c5cdbb',xx-32,yy-54,64,56);if(narrative?.collection[ch.id]){if(Date.now()-(narrative.lastRevealAt||0)<3000)rect(context,'#e9dba0',xx-33,yy-55,66,58);drawCreature(context,ch.id,xx,yy-2,0,.85);text(context,ch.form,xx,yy+12,9,'#edf0d5');}else{rect(context,'#a6aca1',xx-30,yy-52,60,52);text(context,'?',xx,yy-18,18,'#d2d8c8');}}rect(context,'#8b7556',464,427,42,5);rect(context,'#eee0bb',473,423,23,4);text(context,'观察册',485,420,9,'#ddd4b5');}

        for(const actor of data.actors)if(opts.processingRoles.includes(actor.id)){rect(context,'#efdfb6',actor.x+5,actor.y-20,6,9);rect(context,'#819375',actor.x+6,actor.y-18,4,1);}
        if(!data.room)drawDailyObjects(context,opts.lifeState?.daily,opts.reducedMotion?0:time);
        if(!data.room)drawLifeWorld(context,opts.lifeState,opts.reducedMotion?0:time,opts.night,opts.reducedMotion,opts.weather==='fog');
        if(!data.room&&opts.placing&&data.placementPoint){const p=data.placementPoint,valid=canPlaceDecoration(p.x,p.y,opts.lifeState?.placements||[],opts.placing);context.save();context.globalAlpha=.7;ellipse(context,valid?'#b9d488':'#d0927f',p.x,p.y,21,12);drawPlacedDecoration(context,opts.placing,p.x,p.y,time,opts.night);context.restore();}

        for(const actor of data.actors)if(opts.processingRoles.includes(actor.id)&&focus?.id===actor.id){for(let i=0;i<3;i++)rect(context,'#f0d897',actor.x-5+i*4,actor.y-53-(Math.sin(time*3+i)>0?1:0),2,2);}
        if(!data.room&&opts.storyComplete){const glow=context.createRadialGradient(328,462,0,328,462,20);glow.addColorStop(0,'rgba(255,218,116,.6)');glow.addColorStop(1,'rgba(255,218,116,0)');context.fillStyle=glow;context.fillRect(308,442,40,40);}
        if(!data.room&&!opts.reducedMotion&&!opts.night){
          const b=WORLD_BUILDINGS[0];for(let i=0;i<3;i++){const progress=(time*.14+i*.3)%1;rect(context,`rgba(244,231,199,${(1-progress)*.43})`,b.x+b.w-18+Math.sin(time+i)*2-progress*4,b.y-14-progress*28,5+progress*6,4);}
        }
        if(!data.room){drawAtmosphere(context,time,darkness,opts.reducedMotion,opts.weather==='fog');drawWeather(context,time,data.rain,data.fog,data.light,opts.reducedMotion,visibleLampIds(opts.lifeState,opts.night,opts.weather==='fog')); if(data.flash>0)rect(context,`rgba(214,229,247,${data.flash})`,0,0,W,H);for(const b of WORLD_BUILDINGS)if(opts.isOwner||narrative?.prologue==='complete'||narrative?.doors.includes(b.id))drawBuildingName(context,namedBuilding(b,opts.npcNames),focus?.type==='building'&&focus.id===b.id);}
        if(!data.room){
          const speaking=data.actors.filter(a=>a.speech);
          if(opts.reception){const host=data.actors.find(a=>a.id===opts.reception.npcId);if(host)speaking.push({...host,speech:opts.reception.kind==='welcome'?'远方的旅人，雾要来了。':'我带来了工作消息。'});}
          speaking.forEach((a,i)=>{context.font='500 10px "PingFang SC", sans-serif';const lines=speechLines(a.speech,s=>context.measureText(s).width,Math.min(300,VW-40));const frame=speechFrame(a,data.camera,VW,VH,Math.max(...lines.map(s=>context.measureText(s).width)),lines.length,i);if(!frame.visible)return;rect(context,'rgba(255,246,219,.96)',frame.left,frame.top,frame.w,frame.h);poly(context,[[frame.tailX-4,frame.top+frame.h],[frame.tailX+4,frame.top+frame.h],[frame.tailX,frame.top+frame.h+5]],'rgba(255,246,219,.96)');lines.forEach((s,j)=>text(context,s,frame.left+frame.w/2,frame.top+13+j*13,10,'#41503a'));});
        }
        if(!data.room&&narrative){
          const trace=LIFE_POINTS.find(p=>p.id==='trace'),tx=trace.x,ty=trace.y;
          if(narrative.chapter==='antler'){rect(context,'#8f7452',tx-2,ty-24,4,24);poly(context,[[tx-14,ty-24],[tx+13,ty-24],[tx+20,ty-18],[tx+13,ty-12],[tx-14,ty-12]],'#c0aa79');line(context,[[tx-8,ty-22],[tx+3,ty-16],[tx-2,ty-12]],'#675849',2);}

          if(narrative.chapter==='paper'){rect(context,'#d9d0b2',tx-13,ty-12,25,15);line(context,[[tx-8,ty-8],[tx+7,ty-8]],'#64756a',1);line(context,[[tx-8,ty-3],[tx+7,ty-3]],'#64756a',1);}
          if(narrative.chapter==='lantern'){rect(context,'#637370',tx-5,ty-10,10,10);line(context,[[tx-4,ty-25],[tx+4,ty-18]],'#304b50',1);}
          if(narrative.chapter==='doll'){rect(context,'#a28d68',tx-10,ty-11,20,12);line(context,[[tx-8,ty-11],[tx+1,ty-5],[tx-3,ty],[tx+12,ty+6]],'#d5d4b3',1);}
          if(narrative.chapter==='shell')for(let i=0;i<6;i++){ellipse(context,'#cbc6b0',tx-15+i*6,ty+Math.sin(i)*6,3,2);line(context,[[tx-15+i*6,ty+Math.sin(i)*6],[tx-16+i*6,ty+Math.sin(i)*6-3]],'#9fa79d',1);}

          if(narrative.phase==='fog'){
            const well=WORLD_ENVIRONMENT.find(e=>e.id==='well'),cat=WORLD_ENVIRONMENT.find(e=>e.id==='cat');line(context,[[well.x-5,well.y-22],[well.x+Math.cos(opts.reducedMotion?0:time)*10,well.y-22+Math.sin(opts.reducedMotion?0:time)*5]],'#b7bba0',3);if(opts.reducedMotion||Math.sin(time*.3)>0){rect(context,'#9fc4bd',cat.x-8,cat.y-7,2,2);rect(context,'#9fc4bd',cat.x-12,cat.y-7,2,2);}
            if(data.monster){const dispelled=narrative.night?.dispelled,age=dispelled?(Date.now()-narrative.night.dispelledAt)/1000:0;if(!dispelled||age<4){context.save();context.globalAlpha=dispelled?Math.max(0,1-age/4):1;const strike=Math.max(0,1-(now-(data.attackAt||0))/300),angle=Math.atan2(player.y-data.monster.y,player.x-data.monster.x);drawCreature(context,narrative.chapter,data.monster.x+Math.cos(angle)*strike*12,data.monster.y+Math.sin(angle)*strike*12,opts.reducedMotion?0:time);if(strike>0){line(context,[[player.x-13,player.y-24],[player.x+8,player.y-8]],'#dfc6a5',3);line(context,[[player.x-8,player.y-27],[player.x+13,player.y-11]],'#b26c57',2);}context.restore();}if(dispelled&&age<4)for(const lamp of LIFE_LAMPS){const halo=context.createRadialGradient(lamp.x,lamp.y,0,lamp.x,lamp.y,110);halo.addColorStop(0,'rgba(255,231,151,.35)');halo.addColorStop(1,'rgba(255,231,151,0)');context.fillStyle=halo;context.fillRect(lamp.x-110,lamp.y-110,220,220);}}
          }
          for(const damage of narrative.damage){const b=WORLD_BUILDINGS.find(b=>b.id===damage.id);if(b){line(context,[[b.x+10,b.y+b.h-24],[b.x+20,b.y+b.h-16],[b.x+14,b.y+b.h-8]],'#6d5545',3);line(context,[[b.doorX+16,b.doorY],[b.doorX+35,b.doorY+11]],'#a17d56',5);rect(context,'#94755e',b.doorX+13,b.doorY+14,7,2);}}
          if(narrative.phase==='morning'){const well=WORLD_ENVIRONMENT.find(e=>e.id==='well');for(let i=0;i<6;i++)ellipse(context,'#5c7975',well.x+23+i*6,well.y+17+i*3,2,4);for(const actor of data.actors.filter(a=>a.injured)){rect(context,'#e9ddc3',actor.x-3,actor.y-17,8,3);rect(context,'#9e766c',actor.x+5,actor.y-10,2,2);}}
        }
        if(data.clickMark){const{x,y}=data.clickMark;line(context,[[x-5,y],[x,y-3],[x+5,y],[x,y+3],[x-5,y]],'#fff0cf',1);}
        const selected=focus;
        if(selected&&promptVisible){
          let x,y;const b=WORLD_BUILDINGS.find(b=>b.id===selected.id&&selected.type==='building'),a=data.actors.find(a=>a.id===selected.id&&selected.type==='npc'),env=[...dailyObjects(opts.lifeState?.daily),...LIFE_POINTS,...WORLD_ENVIRONMENT].find(e=>e.id===selected.id);
          if(data.room&&selected.type==='exit'){x=485;y=516;}
          else if(data.room&&selected.type==='workspace'){x=485;y=353;}
          else if(data.room&&selected.type==='building'){x=485;y=279;}
          else if(b){x=b.doorX;y=b.doorY+43;}else if(a){x=a.x;y=a.y+16;}else if(env){x=env.x;y=env.y+26;}
          if(x!==undefined){const selectedLabel=selected.type==='building'?'进入':selected.label;const label=`${near?.id===selected.id?'E · ':''}${selectedLabel}`;context.font='500 10px "PingFang SC", sans-serif';const w=context.measureText(label).width+17;rect(context,'rgba(61,69,48,.86)',x-w/2,y-10,w,17);text(context,label,x,y+2,10,'#fff0d2');}
        }
      }
      if(!data.room&&now<(data.staggerUntil||0)){context.save();context.setTransform(1,0,0,1,0,0);context.strokeStyle='rgba(153,57,42,'+(Math.max(0,(data.staggerUntil-now)/700)*.5)+')';context.lineWidth=14;context.strokeRect(0,0,VW,VH);context.restore();}
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return()=>{observer.disconnect();alive=false;cancelAnimationFrame(raf);canvas.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp);window.removeEventListener('blur',onBlur);canvas.removeEventListener('blur',onBlur);data.keys.clear();};
  },[]);

  function pointerPoint(event){
    const bounds=canvasRef.current.getBoundingClientRect(),viewport=state.current.viewport||{width:VW,height:VH};
    return scenePoint((event.clientX-bounds.left)*viewport.width/bounds.width,(event.clientY-bounds.top)*viewport.height/bounds.height,state.current.view||{zoom:1,offsetX:0,offsetY:0});
  }
  function onPointerMove(event){const point=pointerPoint(event),data=state.current,overPlayer=hitsPlayer(point.x,point.y);const target=overPlayer?null:data.room?roomTarget(point.x,point.y):hitTarget(point.x,point.y,data.actors,options.current.lifeState?.narrative?.chapter,dailyObjects(options.current.lifeState?.daily));if(target?.id!==data.hover?.id||target?.type!==data.hover?.type)data.hoverSince=performance.now();data.hover=target;if(options.current.placing){data.placementPoint=point;canvasRef.current.style.cursor=canPlaceDecoration(point.x,point.y,options.current.lifeState?.placements||[],options.current.placing)?'copy':'not-allowed';return;}canvasRef.current.style.cursor=overPlayer||target?'pointer':(data.room?roomCanWalk(point.x,point.y,data.room):canWalk(point.x,point.y))?'crosshair':'default';}
  function onPointerDown(event){
    if(options.current.interactionOpen)return;
    const canvas=canvasRef.current;canvas.focus({preventScroll:true});beginAmbient();
    const point=pointerPoint(event),data=state.current;
    if(options.current.placing){if(data.room)return;callbacks.current.onPlace?.(point.x,point.y);return;}
    const placed=!data.room&&options.current.lifeState?.placements?.find(p=>Math.hypot(p.x-point.x,p.y-point.y)<22);if(placed){callbacks.current.onCollectDecoration?.(placed.id);return;}
    if(hitsPlayer(point.x,point.y)){selectPlayer();return;}
    const target=data.room?roomTarget(point.x,point.y):hitTarget(point.x,point.y,data.actors,options.current.lifeState?.narrative?.chapter,dailyObjects(options.current.lifeState?.daily));
    if(data.room&&(target?.type==='npc'||target?.type==='workspace')){
      const actor=target.type==='npc'?data.actors.find(a=>a.id===target.id):null,destination=actor?{x:actor.x-30,y:actor.y+12}:{x:485,y:data.room.id==='museum'?443:358};
      const route=roomWalkPath(data.player,destination,data.room);data.target=route.shift()||null;data.waypoints=route;data.clickMark=data.target?destination:null;data.blocked=0;return;
    }
    if(target)activateTarget(target);
    else if(data.room?roomCanWalk(point.x,point.y,data.room):canWalk(point.x,point.y)){const route=data.room?roomWalkPath(data.player,point,data.room):findWalkPath(data.player,point);data.target=route.shift()||null;data.waypoints=route;data.clickMark=data.target?point:null;data.blocked=0;}
  }
  return <>
    <canvas ref={canvasRef} width={VW} height={VH} tabIndex={0} role="application"
      aria-label={`你正在操控${isOwner?'岛主 '+(npcNames.main||'云舟'):'访客虚拟角色'}。头顶有小箭头、脚下有光圈的角色由你控制。点击这个角色查看介绍与操作说明。从小船沿木板上岛，点击地图后使用 WASD 或方向键行走，靠近居民按 E 交谈。`}
      onPointerMove={onPointerMove} onPointerDown={onPointerDown} onPointerLeave={()=>{state.current.hover=null;}}
      style={{display:'block',width:'100%',height:'100%',objectFit:'fill',imageRendering:'pixelated',background:'#76aca5',outlineOffset:-5}}
    />
    {strikeHint&&!interactionOpen&&!lifeState?.narrative?.downed&&<button className="strike-button" onClick={strikeResident} title="面向附近居民，打一下 · K">打一下 · {strikeHint} <kbd>K</kbd></button>}
    {room&&<button disabled={!!lifeState?.narrative?.downed} onClick={leaveRoom} aria-label={`走出${room.label}`} style={{position:'absolute',left:25,top:101,zIndex:5,border:'1px solid #aa986c',borderRadius:'50%',width:40,height:40,padding:0,background:'#fff0d2',color:'#49372e',fontSize:21,cursor:'pointer',boxShadow:'0 3px 0 rgba(66,76,47,.15)'}}>↶</button>}
    {room&&roomAction&&!interactionOpen&&<button onClick={()=>{const target=nearTarget();if(target&&target.id===roomAction.id&&target.type===roomAction.type)activateTarget(target);}} aria-label={`按 E 与${roomAction.label}互动`} style={{position:'absolute',bottom:70,left:'50%',transform:'translateX(-50%)',zIndex:5,border:'1px solid rgba(244,229,184,.55)',borderRadius:18,padding:'8px 16px',background:'rgba(53,68,45,.86)',color:'#fff0d2',fontSize:13,cursor:'pointer'}}>E · {roomAction.type==='workspace'?'打开书桌':'交谈'}</button>}
    <div style={{position:'absolute',width:1,height:1,overflow:'hidden',clipPath:'inset(50%)'}} aria-label="地图地点的键盘入口">
      <button onClick={selectPlayer}>查看当前角色</button>
      {isOwner&&projections.slice(0,1).map(p=><button key={p.id} disabled={interactionOpen} onClick={()=>activateTarget({id:p.id,type:'npc',label:p.name})}>{'与'+p.name+'交谈'}</button>)}
      {lifeState?.daily&&Object.keys(dailySkeleton(lifeState.daily.skeleton).actors).map(id=><button key={'daily-npc:'+id} disabled={interactionOpen} onClick={()=>activateTarget({id,type:'npc',label:npcNames[id]||STORY_RESIDENTS[id].name})}>{'与'+(npcNames[id]||STORY_RESIDENTS[id].name)+'交谈'}</button>)}
      {WORLD_BUILDINGS.map(b=><button key={b.id} disabled={interactionOpen} onClick={()=>activateTarget({id:b.id,type:'building',label:namedBuilding(b,npcNames).label})}>{isOwner||lifeState?.narrative?.doors.includes(b.id)?namedBuilding(b,npcNames).label:'敲门 · 小屋 '+(WORLD_BUILDINGS.indexOf(b)+1)}</button>)}
      {dailyObjects(lifeState?.daily).map(e=><button key={e.id} disabled={interactionOpen} onClick={()=>activateTarget(e)}>{e.label}</button>)}
      {LIFE_POINTS.filter(p=>!['industry','museum'].includes(p.id)&&(p.id!=='trace'||lifeState?.narrative?.chapter!=='tide')).map(e=><button key={e.id} disabled={interactionOpen} onClick={()=>activateTarget(e)}>{e.label}</button>)}
      {!room&&(lifeState?.placements||[]).map(p=><button key={'placed:'+p.id} onClick={()=>onCollectDecoration?.(p.id)}>{'收回'+({flowers:'窗台花箱',windbell:'海风风铃',banner:'星光旗帜','fog-medal':'雾夜纪念灯'})[p.id]}</button>)}
      {WORLD_ENVIRONMENT.map(e=><button key={e.id} onClick={()=>activateTarget(e)}>{e.label}</button>)}
    </div>
  </>;
}
