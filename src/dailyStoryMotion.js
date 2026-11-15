import {findWalkPath,moveWithCollision,canWalk} from './worldData.js';
import {DAILY_LIFE,activityAt} from '../shared/dailyActivities.js';
import {STORY_RESIDENTS} from '../shared/storyResidents.js';
export function advanceDailyActor(resident,goal,key,dt,{paused=false,speed=34,neighbors=[]}={}){
 if(resident.dailyKey!==key){resident.dailyKey=key;resident.dailyPath=findWalkPath(resident.pose,goal);resident.dailyGoal={...goal};resident.dailyRetry=0;resident.atHome=false;resident.transition=null;}
 const pose=resident.pose;pose.moving=false;if(paused)return {...pose,done:Math.hypot(pose.x-goal.x,pose.y-goal.y)<5};
 let distance=Math.max(0,Math.min(dt,.1))*speed;resident.dailyRetry=(resident.dailyRetry||0)+dt;
 if(!resident.dailyPath?.length&&Math.hypot(pose.x-goal.x,pose.y-goal.y)>5&&resident.dailyRetry>2){resident.dailyPath=findWalkPath(pose,goal);resident.dailyRetry=0;}
 const clear=next=>neighbors.every(other=>Math.hypot(next.x-other.x,next.y-other.y)>=17||Math.hypot(next.x-other.x,next.y-other.y)>=Math.hypot(pose.x-other.x,pose.y-other.y));
 for(let guard=0;guard<12&&resident.dailyPath?.length&&distance>0;guard++){const point=resident.dailyPath[0],dx=point.x-pose.x,dy=point.y-pose.y,d=Math.hypot(dx,dy);if(d<.1){resident.dailyPath.shift();continue;}const step=Math.min(distance,d);let next=moveWithCollision(pose,dx/d*step,dy/d*step);
  if(!clear(next)){// A small walking sidestep, never a coordinate snap or a water shortcut.
   const alternatives=[moveWithCollision(pose,-dy/d*step,dx/d*step),moveWithCollision(pose,dy/d*step,-dx/d*step)];next=alternatives.find(p=>clear(p)&&Math.hypot(p.x-pose.x,p.y-pose.y)>.001)||pose;
  }
  if(Math.hypot(next.x-pose.x,next.y-pose.y)<.001){resident.dailyPath=[];break;}Object.assign(pose,next);pose.direction=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';pose.moving=true;distance-=step;if(Math.hypot(pose.x-point.x,pose.y-point.y)<.1)resident.dailyPath.shift();}
 return {...pose,done:Math.hypot(pose.x-goal.x,pose.y-goal.y)<5};
}

export function newDailyPerformance(daily){return structuredClone({encounters:{},closures:{},...daily.performance});}
const facing=(pose,other)=>Math.abs(other.x-pose.x)>Math.abs(other.y-pose.y)?other.x>pose.x?'right':'left':other.y>pose.y?'down':'up';
const visibleBetween=(a,b)=>Array.from({length:9},(_,i)=>({x:a.x+(b.x-a.x)*(i+1)/10,y:a.y+(b.y-a.y)*(i+1)/10})).every(p=>canWalk(p.x,p.y));
export function dailyPresentationMinute(daily,visualMinute,previousMinute){
 const authoritative=daily.clockMinutes;
 if(!Number.isFinite(authoritative))return visualMinute;
 // A newly authenticated identity may still have the old view's time for a render.
 // Only interpolate one heartbeat ahead; never skip today's encounter windows.
 return Math.max(authoritative,Math.min(authoritative+5,Math.max(visualMinute,previousMinute??authoritative)));
}
export function meetingGoal(life,meeting,id){const base=life.places[meeting.place],i=meeting.actors.indexOf(id),offset=(i-(meeting.actors.length-1)/2)*34;return {x:base.x+offset,y:base.y+Math.abs(offset)*.12,label:base.label};}

// Mutable checkpoints contain only today's performance, never task progress.
// All windows use the same game clock as story deadlines; missed meetings expire.
export function advanceDailyCast(daily,residents,minutes,dt,{paused=false,unavailable=[],performance=newDailyPerformance(daily)}={}){
 const life=DAILY_LIFE[daily?.skeleton],m=((minutes%1440)+1440)%1440,result={actors:{},performance,changed:false};
 if(!life||daily.phase==='ended'||m>=1080)return result;
 performance.encounters??={};performance.closures??={};
 const current={...daily,performance,clockMinutes:m};
 for(const e of life.encounters){const state=performance.encounters[e.id];if(m>=e.to&&!['finished','missed'].includes(state?.status)){performance.encounters[e.id]={...state,status:state?.status==='playing'?'finished':'missed',endedAt:e.to};result.changed=true;}}
 let meeting=life.encounters.find(e=>m>=e.from&&m<e.to&&!['finished','missed'].includes(performance.encounters[e.id]?.status));
 for(const id of Object.keys(life.activities)){
  const r=residents[id],activity=activityAt(current,id,m);if(!r||!activity||unavailable.includes(id))continue;
  const inMeeting=meeting?.actors.includes(id),goal=inMeeting?meetingGoal(life,meeting,id):activity.goal;
  const key=daily.day+':'+daily.skeleton+':'+(inMeeting?'meeting:'+meeting.id:'job:'+activity.index);
  const pose=advanceDailyActor(r,goal,key,dt,{paused,speed:34,neighbors:Object.entries(residents).filter(([peer,other])=>peer!==id&&!other.atHome&&!unavailable.includes(peer)).map(([,other])=>other.pose)});
  result.actors[id]={...pose,activity:activity.activity,where:goal.label,dailyAction:pose.done?activity.action:null,speech:null};
 }
 if(meeting&&!paused){
  let state=performance.encounters[meeting.id];
  const actors=meeting.actors.map(id=>result.actors[id]);
  const together=actors.every(Boolean)&&actors.every(a=>a.done)&&actors.every(a=>Math.hypot(a.x-actors[0].x,a.y-actors[0].y)<90)&&actors.slice(1).every(a=>visibleBetween(actors[0],a));
  if(m>=meeting.start&&together&&!state){state=performance.encounters[meeting.id]={status:'playing',startedAt:m,turn:0};result.changed=true;}
  if(state?.status==='playing'){
   const lines=(daily.pack.encounters||[]).find(e=>e.id===meeting.id)?.lines||meeting.lines,turn=Math.max(0,Math.floor((m-state.startedAt)/meeting.turnMinutes));
   if(turn>=lines.length||m>=meeting.to){state.status='finished';state.endedAt=m;result.changed=true;}
   else if(together){
    if(state.turn!==turn){state.turn=turn;result.changed=true;}
    const cue=lines[turn];
    for(const id of meeting.actors){const a=result.actors[id],partner=actors.find(p=>p!==a);a.direction=facing(a,partner);residents[id].pose.direction=a.direction;a.activity='与'+meeting.actors.filter(peer=>peer!==id).map(peer=>STORY_RESIDENTS[peer].name).join('、')+'短暂交谈';a.dailyAction=id===cue.speaker?cue.action:'shrug';}
    const speaker=result.actors[cue.speaker];speaker.speech=daily.completed?'今天的东西已收好。我接着去'+activityAt(current,cue.speaker,meeting.to+1).goal.label+'。':cue.text;
   }
  }
 }
 // Idle work does not repeatedly broadcast the same task request. Only the meeting
 // has a speech queue; a brief work gesture accompanies each meaningful stop.
 return result;
}
