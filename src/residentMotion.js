// Advance by travelled distance, never by an old wall-clock schedule.
export function advanceResident(resident, dt, speed=24, paused=false) {
 const pose=resident.pose;pose.moving=false;
 const journey=resident.transition;
 const path=journey?.path||resident.route||[];
 if(paused||path.length<2)return pose;
 const state=journey||resident;
 state.walkIndex??=1;state.rest??=0;
 if(state.rest>0){state.rest=Math.max(0,state.rest-dt);return pose;}
 let distance=Math.max(0,Math.min(dt,.1))*speed;
 for(let guard=0;guard<path.length+1&&distance>0;guard++){
  const target=path[state.walkIndex];
  if(!target)break;
  const dx=target.x-pose.x,dy=target.y-pose.y,length=Math.hypot(dx,dy);
  if(length>.01){const step=Math.min(distance,length);pose.x+=dx/length*step;pose.y+=dy/length*step;pose.direction=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');pose.moving=true;distance-=step;}
  if(Math.hypot(target.x-pose.x,target.y-pose.y)>.01)break;
  pose.x=target.x;pose.y=target.y;
  state.walkIndex++;
  if(state.walkIndex>=path.length){
   if(journey){resident.atHome=true;resident.transition=null;pose.moving=false;break;}
   state.walkIndex=1;state.rest=2;break;
  }
 }
 return pose;
}

// Story actors do not always have the optional walking phase used by daily routines.
export function residentWalkFrame(actor,time){
 const seed=Number.isFinite(actor.seed)?actor.seed:0;
 const clock=Number.isFinite(time)?time:0;
 const step=actor.moving&&!actor.reducedMotion?Math.sin(clock*11+seed)*2:0;
 return {step,bob:Math.abs(step)*.45};
}
