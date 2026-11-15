import {boatState} from './voyage.mjs';
import {fail} from './security.mjs';
// Server-owned adapter: the identity router resolves an authenticated island to its inventory key.
export function gatheringBoatAdapter(life,resolveIsland){const mutate=(island,fn)=>life.store.transaction(()=>{const key=resolveIsland(island);if(!key)fail(403,'island_route','该主岛没有获准的库存路由。');const s=life.read(key),b=boatState(s);fn(b);b.version++;life.save(key,s);});return {
 reserve(island,room){mutate(island,b=>{if(b.reservedFor===room)return;if(b.status!=='ready'||b.stage!==3||b.remaining<1||b.journey||b.reservedFor)fail(409,'boat_reserved','船尚未可航行，或已有旅程。');b.reservedFor=room;b.status='reserved';});},
 sail(island,room){mutate(island,b=>{if(b.sailingFor===room)return;if(b.reservedFor!==room||b.status!=='reserved')fail(409,'boat_reservation','预留船与会话不符。');b.status='sailing';b.sailingFor=room;});},
 release(island,room){mutate(island,b=>{if(b.sailingFor===room)fail(409,'already_sailed','已经出航，必须正常结束后返航。');if(b.reservedFor===room){b.reservedFor=null;b.status='ready';}});},
 damage(island,room){mutate(island,b=>{b.settledVoyages??=[];if(b.settledVoyages.includes(room))return;if(b.sailingFor!==room)fail(409,'unverified_voyage','未验证的远航不能结算船。');b.settledVoyages.push(room);b.remaining=Math.max(0,b.remaining-1);b.status=b.remaining?'ready':'damaged';b.reservedFor=null;b.sailingFor=null;b.changedAt=Date.now();});}
};}
