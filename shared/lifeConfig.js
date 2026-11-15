export const LIFE_RULES=Object.freeze({initialMaterials:12,pickupReward:3,lampReward:1,repairCost:4,upgradeCosts:[8,16],decorCost:3,loss:2,eventAfterMinutes:45});
export const LIFE_LAMPS=[{id:'lamp-dock',type:'life',label:'码头路灯',x:328,y:483,r:18},{id:'lamp-garden',type:'life',label:'花园路灯',x:638,y:365,r:18},{id:'lamp-square',type:'life',label:'广场路灯',x:550,y:385,r:18},{id:'lamp-woods',type:'life',label:'林间路灯',x:215,y:303,r:18}];
export const LIFE_PICKUPS=[{id:'wood-shore',type:'life',label:'岸边漂木',x:207,y:488,r:16},{id:'wood-woods',type:'life',label:'林间木枝',x:348,y:303,r:16},{id:'wood-garden',type:'life',label:'花圃边的木料',x:614,y:394,r:16}];
export const LIFE_FACILITY={id:'flower-rack',type:'life',label:'广场花架',x:352,y:366,r:20};
export const INDUSTRY_ENTRY={id:'industry',type:'industry',label:'行业工坊 · 示例服务',x:611,y:424,r:20};
export const MUSEUM_ENTRY={id:'museum',type:'museum',label:'雾中生物展馆',x:580,y:475,r:20};
export const STORY_TRACE={id:'trace',type:'story-trace',label:'看看这处异常',x:418,y:306,r:24};
export const LIFE_POINTS=[...LIFE_LAMPS,...LIFE_PICKUPS,LIFE_FACILITY,INDUSTRY_ENTRY,MUSEUM_ENTRY,STORY_TRACE];
export const DECORATIONS=[{id:'flowers',name:'窗台花箱'},{id:'windbell',name:'海风风铃'},{id:'banner',name:'星光旗帜'},{id:'fog-medal',name:'雾夜纪念灯',reward:true}];
export const PERSONALITIES={customs:'热情',archive:'沉稳',curator:'好奇',liaison:'温柔',specialist:'好奇',main:'沉稳'};
export const STORY_STEPS=[{title:'雾中的邀请',hint:'去找海关居民，问问旧路灯的故事。'},{title:'居民协作',hint:'在夜雾中亲手点亮至少两盏路灯，再找档案官核对线索。'},{title:'留下一盏灯',hint:'修好居民花架，再请策展人挂上雾夜纪念灯。'},{title:'灯火相连',hint:'你已获得雾夜纪念灯，可以在家装中摆出来。'}];

// Every third game night: warning at 16:00, great fog from 18:00 until dawn.
export function greatFogAt(minutes){const m=((minutes%1440)+1440)%1440;return {active:m>=1140||m<360,warning:m>=1020&&m<1140,cycle:Math.floor((minutes+1080)/1440)};}

export function visibleLampIds(life,night,fog){if(!night)return [];if(fog)return life?.fogActive===false?[]:life?.lamps||[];return LIFE_LAMPS.filter(l=>!life?.lampOff?.includes(l.id)).map(l=>l.id);}

// Spread destinations, not sprite pixels.
for(const point of LIFE_POINTS){point.x*=1.5;point.y*=1.5;}

Object.assign(LIFE_LAMPS[0],{x:430,y:710});Object.assign(LIFE_LAMPS[1],{x:1000,y:420});Object.assign(LIFE_LAMPS[2],{x:655,y:285});Object.assign(LIFE_LAMPS[3],{x:430,y:440});

// Clear open verges beside the paths, never behind a house or tree.
Object.assign(LIFE_LAMPS[0],{x:490,y:720});Object.assign(LIFE_LAMPS[1],{x:960,y:500});Object.assign(LIFE_LAMPS[2],{x:690,y:350});Object.assign(LIFE_LAMPS[3],{x:390,y:490});
export const SHORE_TREASURES=[{id:'shore-pearl',type:'treasure',label:'拾起潮汐珠',x:260,y:700,r:22},{id:'shore-glass',type:'treasure',label:'拾起海玻璃',x:880,y:775,r:22},{id:'shore-shell',type:'treasure',label:'拾起星纹贝壳',x:1190,y:660,r:22}];
LIFE_POINTS.push(...SHORE_TREASURES);

// One visibly repairable landmark on the west side of the square.
Object.assign(LIFE_FACILITY,{x:535,y:418,r:37});

Object.assign(LIFE_LAMPS[0],{x:450,y:750});Object.assign(LIFE_LAMPS[1],{x:935,y:510});Object.assign(LIFE_LAMPS[3],{x:360,y:450});

import {NORTH_DOCK,SCREW_POINTS} from './voyageConfig.js';
LIFE_POINTS.push(NORTH_DOCK,...SCREW_POINTS);
