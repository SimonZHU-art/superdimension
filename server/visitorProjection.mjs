import {DEFAULT_AVATAR} from './domain.mjs';
// Select one registered identity; anonymous page views do not displace it.
export function latestVisitorProjection(visits,projections){
 const visit=[...visits].reverse().filter(v=>v.kind!=='anonymous'&&v.consentAt).sort((a,b)=>String(b.consentAt||b.createdAt).localeCompare(String(a.consentAt||a.createdAt))||String(b.createdAt).localeCompare(String(a.createdAt)))[0];
 if(!visit)return null;
 const saved=projections.find(p=>p.visitId===visit.id);
 return {id:'arrival:'+visit.id,visitId:visit.id,name:visit.name||'来访者',bio:visit.background||'',avatar:saved?.avatar||{...DEFAULT_AVATAR,body:'#d9af6c',hair:'#684c38',skin:'#e4bf8f',hat:'#c6a272'},accepted:saved?.accepted||false,public:false,inputVersion:visit.inputVersion};
}
