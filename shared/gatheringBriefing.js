export const BRIEFING_ORDER=['customs','archivist','curator','specialist','liaison'];
export const BRIEFING_STATUS={waiting:'等待开放资料',queued:'等待整理',running:'正在阅读与整理',complete:'已交付',failed:'处理失败',archive_failed:'等待归档重试',budget_exhausted:'本轮额度已用完'};
export function briefingRows(tasks){
 return BRIEFING_ORDER.flatMap(agent=>{
  const versions=tasks.filter(t=>t.agent===agent).sort((a,b)=>b.inputVersion-a.inputVersion||b.createdAt-a.createdAt);
  if(!versions.length)return [];
  return [{agent,latest:versions[0],content:versions.find(t=>t.status==='complete'&&t.report)||null}];
 });
}
