import {visitorPublic,jobPublic} from './domain.mjs';
const roleIds=['archivist','curator','liaison','specialist'];
const unavailable=/资料不足|没有相关|无相关|未提供|无法确认|未配置|未设置|暂无|无明确|相关性有限/;
export function councilShelf(store,domain){
 const config=domain.config();
 const interests=[config.filter.focus,config.filter.specialty].flatMap(v=>Array.isArray(v)?v:String(v||'').split(/[\n,，;；]/)).map(x=>x.trim()).filter(Boolean);
 const all=store.all('visits'), saved=store.all('reports');
 const visits=all.filter(v=>v.kind!=='anonymous').reverse().map(v=>{
  const jobs=domain.jobs(v.id,true);
  const reports=roleIds.map(roleId=>{
   const job=jobs.find(j=>j.roleId===roleId);
   const report=saved.filter(r=>r.visitId===v.id&&r.roleId===roleId&&r.inputVersion===v.inputVersion&&r.filterVersion===job?.filterVersion&&!r.historical).at(-1);
   return {roleId,job:job?jobPublic(job):null,report:report||null};
  });
  const completed=reports.filter(r=>r.report&&r.job?.status==='succeeded');
  const relevant=completed.filter(r=>r.roleId!=='archivist'&&r.report.content.relevance&&!unavailable.test(r.report.content.relevance));
  const text=relevant.map(r=>`${r.report.content.relevance} ${r.report.content.findings.map(f=>f.text).join(' ')}`).join(' ');
  const matches=interests.filter(topic=>text.includes(topic));
  const projects=completed.find(r=>r.roleId==='specialist')?.report.content.project_cards||[];
  const reasons=[];
  if(matches.length)reasons.push(`已完成的分析涉及你的关注：${matches.join('、')}。`);
  if(projects.length)reasons.push(`研究员提取了 ${projects.length} 个有原始来源的相关项目。`);
  if(relevant.length)reasons.push(...relevant.slice(0,2).map(r=>`${{curator:'策展人',liaison:'联络官',specialist:'研究员'}[r.roleId]}：${r.report.content.relevance}`));
  if(!reasons.length)reasons.push(completed.length?`已有 ${completed.length} 份报告可供阅读；兴趣匹配仍需你判断。`:'报告尚未完成，可以先查看来访资料。');
  const score=matches.length*4+projects.length*3+relevant.length*2+completed.length;
  return {...visitorPublic(v),avatar:domain.projection(v.id)?.avatar||null,reports,recommendation:{score,reasons,completed:completed.length}};
 });
 const ranked=visits.filter(v=>v.recommendation.completed>0).slice().sort((a,b)=>b.recommendation.score-a.recommendation.score);
 return {visits,recommendedId:ranked[0]?.id||null,anonymousCount:all.filter(v=>v.kind==='anonymous').length,method:'根据当前资料版本的已完成报告，优先查看涉及关注主题、有来源项目及相关理由的来访者；信息相同时按最近登记排序。此推荐是阅读次序建议，你可以自行选择。'};
}
