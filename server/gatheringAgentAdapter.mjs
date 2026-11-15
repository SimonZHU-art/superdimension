import {generateReport,ROLES,sourceParagraphs} from './agents.mjs';
import {fail} from './security.mjs';
import {gatheringSources,evidenceIndex} from './gatheringEvidence.mjs';
// Formal gatherings supply an already-authorized immutable task.
// Uses the same provider (including configured DeepSeek), schemas, duties and citation checks as the main island.
export function gatheringAgentAdapter(options){return {waitForArchivist:true,async analyze(task){const i=task.input,sources=gatheringSources(task);const paragraphs=sourceParagraphs(sources);
 if(task.agent==='customs'){const report={summary:'已接收本次双方确认的资料。',findings:paragraphs.map(p=>({text:p.text,kind:'self_report',source_refs:[p.ref]})),uncertainties:['登记不等于独立核验。'],source_refs:paragraphs.map(p=>p.ref)};return {simulated:false,report,sourceIndex:evidenceIndex(task,report),collaboration:[],findings:[]};}
 if(!ROLES[task.agent])fail(400,'unknown_agent','没有对应的主岛职能 Agent。');
 const archival=task.colleagueReports?.find(r=>r.agent==='archivist');
 const result=await generateReport(options,task.agent,{presentation:'gathering_briefing',islandId:task.islandId,visitId:task.exchangeId,inputVersion:task.inputVersion,filterVersion:1,visitor:{kind:'gathering_participant'},owner:i.internalContext?.owner||{},filter:i.internalContext?.filter||{},sources,corrections:[]},archival?{content:archival.report}:null);
 const fromParticipant=refs=>refs.some(ref=>paragraphs.some(p=>p.ref===ref&&p.kind!=='owner_chat'));
 if(result.value.findings.some(f=>['self_report','material_fact'].includes(f.kind)&&!fromParticipant(f.source_refs))||(result.value.project_cards||[]).some(p=>!fromParticipant(p.source_refs)))fail(502,'invalid_model_output','事实只引用了你的提问，没有引用来客资料。请重试这位助理。');
 return {simulated:false,report:result.value,sourceIndex:evidenceIndex(task,result.value),collaboration:archival?[{agent:'archivist',inputVersion:task.inputVersion,summary:archival.report.summary}]:[],model:result.model,usage:result.usage,findings:result.value.findings.filter(f=>f.source_refs.length).slice(0,3).map((f,n)=>({id:task.id+':'+n,agent:ROLES[task.agent].name,text:f.text,fact:f.kind==='inference'?'推断，尚待核实':f.text,inference:f.kind==='inference'?f.text:'暂无额外推断',sources:f.source_refs.map(ref=>({ref,title:paragraphs.find(p=>p.ref===ref)?.label,inputVersion:task.inputVersion})),relevance:result.value.relevance,question:result.value.next_steps?.[n]||result.value.next_steps?.[0]||''}))};}};}
