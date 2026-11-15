import React,{useEffect,useRef,useState} from 'react';
import Icon,{PixelPerson} from './Icons.jsx';
import {roles,roleLabels} from './content.js';
import {briefingRows,BRIEFING_STATUS} from '../shared/gatheringBriefing.js';

const ANGLES={customs:'先确认这次收到的资料',archivist:'这个人是谁，做过什么',curator:'值得先聊的项目与作品',specialist:'方法、成果和可以深挖的方向',liaison:'下一步怎样继续了解他'};
const kindLabels={self_report:'材料自述',material_fact:'材料事实',inference:'分析推断',unconfirmed:'待确认'};

export default function GatheringBriefing({tasks,name,names={},npcNames={},analysisMode,waitingChat,busy,onSuggest,onRetry,onClose,chat}){
 const rows=briefingRows(tasks),[active,setActive]=useState(rows[0]?.agent),[playing,setPlaying]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches),[expanded,setExpanded]=useState(false),[fullSpeech,setFullSpeech]=useState(false),heard=useRef(new Set());
 const row=rows.find(r=>r.agent===active)||rows[0],task=row?.content,latest=row?.latest,report=task?.report;
 const resident=roles[row?.agent==='archivist'?'archive':row?.agent]||roles.archive;
 const label=id=>npcNames[id==='archivist'?'archive':id]||names[id]||roleLabels[id]||'随行助理';
 const nextUnheard=()=>rows.find(r=>r.content?!heard.current.has(r.content.id):['queued','running'].includes(r.latest.status));
 const currentId=task?.id,unheard=nextUnheard();
 useEffect(()=>{setFullSpeech(false)},[currentId]);
 useEffect(()=>{if(playing&&unheard&&(!task||heard.current.has(task.id))){setActive(unheard.agent);setExpanded(false)}},[playing,unheard?.agent,unheard?.content?.id,currentId]);
 useEffect(()=>{
  if(!playing||!chat||!task||expanded||heard.current.has(task.id))return;
  const timer=setTimeout(()=>{heard.current.add(task.id);const next=nextUnheard();if(next)setActive(next.agent)},Math.min(24000,Math.max(12000,(report.summary?.length||120)*65)));
  return()=>clearTimeout(timer);
 },[playing,chat,currentId,expanded]);
 function select(agent){setActive(agent);setPlaying(false);setExpanded(false)}
 if(!row)return null;
 const facts=report?.findings||[],questions=(report?.next_steps||[]).map((text,index)=>({text,index})).filter(q=>q.text.trim());
 const references=[...(report?.source_refs||[]),...facts.flatMap(f=>f.source_refs||[])],sourceIndex=task?.sourceIndex||[];
 const evidence=sourceIndex.filter(p=>references.includes(p.ref));
 const archiving=latest.status==='archive_failed',failed=['failed','archive_failed'].includes(latest.status);
 const waitingForArchive=analysisMode==='real'&&row.agent!=='archivist'&&rows.some(r=>r.agent==='archivist'&&['queued','running'].includes(r.latest.status))&&latest.status==='queued';
 return <aside className="gathering-briefing" aria-label={`随行助理轮流介绍${name}`}>
  <header className="briefing-heading"><div><strong>随行圆桌</strong><small>正在了解{name} · 仅你可见</small></div><button aria-label="收起随行圆桌" onClick={onClose}>×</button></header>
  <nav className="briefing-speakers" aria-label="选择汇报的随行助理">{rows.map(r=>{const meta=roles[r.agent==='archivist'?'archive':r.agent]||roles.archive;return <button key={r.agent} aria-pressed={r.agent===row.agent} onClick={()=>select(r.agent)} className={r.agent===row.agent?'selected':''}><span className="briefing-portrait"><PixelPerson size={31} coat={meta.color} hair={meta.hair}/>{r.latest.status==='running'&&<i className="briefing-reading" aria-hidden="true"/>}</span><strong>{label(r.agent)}</strong><small>{BRIEFING_STATUS[r.latest.status]}</small></button>})}</nav>
  <div className="briefing-scroll">
   <div className="briefing-speaker"><PixelPerson size={45} coat={resident.color} hair={resident.hair}/><div><strong>{label(row.agent)}</strong><small>{ANGLES[row.agent]}</small></div>{report&&<span className="briefing-speaking" aria-hidden="true">···</span>}</div>
   {!report?<div className="briefing-pending" role="status"><p>{failed?latest.error:waitingForArchive?'等档案官核对这份资料，再继续读原文。':latest.status==='running'?'我正在阅读这次开放的资料，整理好就告诉你。':latest.status==='waiting'?'还没有收到开放资料。你们的交流内容会成为后续线索。':latest.status==='budget_exhausted'?'本轮额度已用完，已有报告保留。':'资料已收到，轮到我时会开始整理。'}</p><small>{latest.sourceTitles?.join('、')||'本次获准对话'}</small></div>:<>
    <p className={'briefing-speech'+(fullSpeech?' expanded':'')} aria-live="polite">{report.summary||report.title}</p>
    {(report.summary?.length||0)>140&&<button className="briefing-expand-speech" onClick={()=>{setFullSpeech(!fullSpeech);setPlaying(false)}}>{fullSpeech?'收起这段介绍':'展开这段介绍'}</button>}
    <p className="briefing-version">资料 v{task.inputVersion} · {task.simulated?'本地原文摘录':'模型提炼'} · 含 {task.messageCount||0} 条获准对话{latest.id!==task.id&&<span>新的交流正在整理，先保留这份汇报。</span>}</p>
    {task.collaboration?.length>0&&<p className="briefing-collaboration"><Icon name="book" size={12}/>已参考{task.collaboration.map(c=>label(c.agent)).join('、')}的同版档案，继续核对原文。</p>}
    {facts.length>0&&<section className="briefing-facts" aria-label="这位助理提炼的具体信息">{facts.slice(0,6).map((f,i)=><div key={i}><small>{kindLabels[f.kind]||'材料记录'}</small><p>{f.text}</p>{f.source_refs?.length>0&&<details onToggle={ev=>{if(ev.currentTarget.open){setPlaying(false);setExpanded(true)}}}><summary>看这条的原文</summary>{f.source_refs.map(ref=>{const p=sourceIndex.find(s=>s.ref===ref);return <blockquote key={ref}><cite>{p?.title||ref}</cite>{p?.text||'此旧版报告保留了引用编号，原文可在聚会档案中查看。'}</blockquote>})}</details>}</div>)}</section>}
    {questions.length>0&&<section className="briefing-questions"><h4>可以接着问他</h4>{questions.slice(0,3).map(question=><button key={question.index} disabled={busy} onClick={()=>{setPlaying(false);onSuggest({t:task,index:0,questionIndex:question.index})}}><span>{question.text}</span><Icon name="arrow" size={14}/></button>)}<small>点一下加入草稿，由你检查后发送。</small></section>}
    <details className="briefing-full" onToggle={ev=>{setExpanded(ev.currentTarget.open);if(ev.currentTarget.open)setPlaying(false)}}><summary>关联、待确认与资料来源</summary>{report.relevance&&<p>{report.relevance}</p>}{report.uncertainties?.map((u,i)=><p className="briefing-uncertainty" key={i}>{u}</p>)}{report.project_cards?.map((p,i)=><section key={i}><strong>{p.title}</strong><p>{p.summary}</p><p>{p.relevance}</p></section>)}<p>依据：{[...new Set(evidence.map(p=>p.title).length?evidence.map(p=>p.title):task.sourceTitles||[])].join('、')||'本次获准对话'}。</p><p>未接收来客 Agent 的对话；这次分析依据已开放的材料和双方聊天。</p></details>
   </>}
   {failed&&<div className="briefing-retry"><p>{archiving?'报告已经生成，正在等待归档重试。':latest.error}</p><button disabled={busy} onClick={()=>onRetry(latest.id)}>重试{label(row.agent)}</button></div>}
  </div>
  <footer className="briefing-controls"><button onClick={()=>{if(!playing){heard.current.clear();setExpanded(false)}setPlaying(!playing)}}>{playing?'暂停轮流汇报':'轮流听大家介绍'}</button><button onClick={()=>select(rows[(rows.indexOf(row)+1)%rows.length].agent)}>听下一位</button>{waitingChat&&<small>新对话已收下，稍后补充。</small>}</footer>
 </aside>;
}
