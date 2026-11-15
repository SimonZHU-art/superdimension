// Opening the home island is always a visitor arrival. Owner authentication is
// deliberately used only after the player chooses to log in during this visit.
export async function openGuestEntry(request,{invite=null}={}){
 await request('/api/visit',{});
 const arrival=invite?null:await request('/api/life/action?view=visitor',{action:'story-replay',restart:true});
 const [world,visit]=await Promise.all([request('/api/world?view=visitor'),request('/api/visit')]);
 return {world,visit,life:arrival?.life||null,panel:invite?'gathering-join':null};
}

export async function resumeOwnerEntry(request,storage){
 const formal=await request('/api/gatherings?view=owner').catch(()=>null);
 if(formal?.room&&formal.room.status!=='cancelled')return {formal};
 const voyage=await request('/api/voyage?view=owner');
 if(voyage.boat?.journey)return {voyage};
 const id=storage.getItem('yunting-gathering-demo');
 if(id){
  const demo=await request('/api/gathering-demo').catch(()=>null);
  if(demo?.room?.id===id&&demo.room.status!=='cancelled')return {demo,voyage};
  storage.removeItem('yunting-gathering-demo');
 }
 return {voyage};
}
