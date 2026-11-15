import React,{useEffect,useState} from 'react';
import {api} from './api.js';
import Icon,{PixelPerson} from './Icons.jsx';
import {personalizedRoles,statusLabels} from './content.js';

const order=['customs','archive','curator','specialist','liaison','wanderer'];
const seats=[[30,23],[50,20],[70,23],[27,72],[50,78],[73,72]];
const roleKey=id=>id==='archive'?'archivist':id;
export default function MeetingHall(props){return props.owner?<OwnerHall {...props}/>:<GuestHall {...props}/>}
function GuestHall({world,visit,onContact}){
 const unlocked=visit?.contact?.status==='sent'&&visit?.contact?.decision==='accepted';
 const residents=personalizedRoles(world?.npcNames);
 return <div className="meeting-hall"><CouncilStage residents={residents} world={world} visitor={unlocked?visit.visit:null} guest/><section className="hall-welcome"><Icon name={unlocked?'check':'lock'} size={24}/><h3>{unlocked?'你的来访已被岛主接受':'会议室等待岛主的邀请'}</h3><p>{unlocked?'欢迎来到会议室。岛主可以在自己的世界中继续了解你留下的资料。这里不是实时多人会议。':'先在邮局联系岛主。邮件寄出并被岛主接受后，你的会议室入口会解锁。'}</p>{!unlocked&&<button className="primary" onClick={onContact}>去邮局联系岛主</button>}<p className="small-note">这里展示会议室与来访状态。居民的私人分析仅供岛主阅读。</p></section></div>
}
function OwnerHall({world,onNavigate}){
 const [shelf,setShelf]=useState(null),[selected,setSelected]=useState(''),[error,setError]=useState('');
 const residents=personalizedRoles(world?.npcNames);
 useEffect(()=>{let alive=true;async function load(){try{const d=await api('/api/owner/council');if(alive)setShelf(d)}catch(e){if(alive)setError(e.message)}}load();const timer=setInterval(load,6000);return()=>{alive=false;clearInterval(timer)}},[]);
 const visitor=shelf?.visits.find(v=>v.id===selected),recommended=shelf?.visits.find(v=>v.id===shelf.recommendedId);
 return <div className="meeting-hall">{error&&<div className="notice error" role="alert">{error}</div>}{visitor?<CouncilSession key={visitor.id} visitor={visitor} world={world} residents={residents} onBack={()=>setSelected('')} onNavigate={onNavigate}/>:<>
 <CouncilStage residents={residents} world={world}/><div className="hall-welcome"><span className="hall-note">你的私人来访讨论室</span><h3>先了解谁，由你决定。</h3><p>选一位来访者，请居民带着已经整理好的札记入场。</p></div>
 {!shelf?<p role="status">正在整理来访目录…</p>:<>{recommended&&<article className="hall-recommendation"><div className="hall-recommendation-person"><PixelPerson size={62} coat={recommended.avatar?.body} hair={recommended.avatar?.hair}/><div><span>根据居民报告，建议先读这一位</span><h4>{recommended.name}</h4><p>{recommended.purpose}</p></div></div><ul>{recommended.recommendation.reasons.map((r,i)=><li key={i}>{r}</li>)}</ul><button className="primary" onClick={()=>setSelected(recommended.id)}>请大家入场，了解{recommended.name}</button><details><summary>这次推荐依据什么？</summary><p>{shelf.method}</p></details></article>}
 <section className="hall-records"><h4>来过这座岛的人</h4><p>{shelf.visits.length} 位已登记来访者 · {shelf.anonymousCount} 次匿名到访</p>{shelf.visits.map(v=><button className="hall-visitor" key={v.id} onClick={()=>setSelected(v.id)}><PixelPerson size={36} coat={v.avatar?.body} hair={v.avatar?.hair}/><div><strong>{v.name}</strong><p>{v.purpose||v.background}</p></div><span>{v.recommendation.completed}/4 份汇报可读 <Icon name="arrow" size={14}/></span></button>)}{!shelf.visits.length&&<div className="notice">还没有主动登记的来访者。匿名游客不会被编造成个人档案；有效登记后，居民会继续整理资料。</div>}</section></>}
 </>}</div>
}
function CouncilSession({visitor,world,residents,onBack,onNavigate}){
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const [turn,setTurn]=useState(0),[playing,setPlaying]=useState(!reduced),[arrived,setArrived]=useState(reduced),[sources,setSources]=useState(null),[error,setError]=useState('');
 const speaker=order[turn],resident=residents[speaker];
 const entry=visitor.reports.find(r=>r.roleId===roleKey(speaker)),report=entry?.report?.content;
 useEffect(()=>{if(reduced)return;const timer=setTimeout(()=>setArrived(true),3400);return()=>clearTimeout(timer)},[reduced]);
 useEffect(()=>{if(!playing||!arrived)return;const timer=setTimeout(()=>{if(turn<order.length-1)setTurn(t=>t+1);else setPlaying(false)},8000);return()=>clearTimeout(timer)},[playing,turn,arrived]);
 async function readSources(){setPlaying(false);try{setSources(await api('/api/owner/visits/'+visitor.id))}catch(e){setError(e.message)}}
 let speech;
 if(speaker==='customs')speech=`这位来访者叫${visitor.name}，登记于${new Date(visitor.createdAt).toLocaleString('zh-CN')}。来访目的：${visitor.purpose||'未说明'}。以下由居民轮流介绍保存的分析。`;
 else if(speaker==='wanderer')speech='我负责给讨论留一点海风。居民的资料都说完了，下一步听岛主的：再看看原文，或写一封交流邀请。';
 else speech=report?.summary||entry?.job?.error||'这份分析还没有完成。我先保留这个位置，等报告整理好再交给你。';
 return <><div className="hall-session-head"><button className="text-link" onClick={onBack}>← 回到来访目录</button><span>正在了解：{visitor.name} · 资料 v{visitor.inputVersion}</span></div><CouncilStage key={visitor.id} residents={residents} world={world} visitor={visitor} active={speaker} gathering/><div className="hall-playback"><span role="status">{arrived?(playing?'居民依次汇报中':'已暂停，慢慢阅读'):'居民正在入场…'}</span><button className="secondary" onClick={()=>setPlaying(!playing)}>{playing?'暂停轮流汇报':'继续轮流汇报'}</button><button className="text-link" disabled={turn===order.length-1} onClick={()=>{setPlaying(false);setTurn(t=>Math.min(t+1,order.length-1))}}>听下一位</button><button className="text-link" onClick={()=>{setTurn(0);setPlaying(!reduced)}}>从头听一遍</button></div><nav className="hall-speakers" aria-label="选择汇报的居民">{order.map((id,i)=><button key={id} className={turn===i?'selected':''} onClick={()=>{setPlaying(false);setTurn(i)}}>{residents[id].name}<small>{id==='wanderer'?'岛上日常':residents[id].role}</small></button>)}</nav>
 <article className="hall-dialogue" aria-live="polite"><div className="hall-speaker-heading"><PixelPerson size={42} coat={resident.color} hair={resident.hair}/><div><strong>{resident.name}</strong><span>{speaker==='wanderer'?'生活话语，不属于人物分析':resident.role}</span></div>{entry&&<span className={'status '+(entry.job?.status||'queued')}>{statusLabels[entry.job?.status]||'等待整理'}</span>}</div><p className="hall-speech">{speech}</p>{report&&<details onToggle={e=>{if(e.currentTarget.open)setPlaying(false)}}><summary>展开这位居民已经整理的完整分析</summary>{report.findings.map((f,i)=><div className="finding" key={i}><span className={'finding-kind '+f.kind}>{{self_report:'访客自述',material_fact:'材料事实',inference:'系统推断',unconfirmed:'未确认'}[f.kind]}</span><p>{f.text}</p><small>来源：{f.source_refs.join('、')||'暂无来源，待核实'}</small></div>)}{report.relevance&&<section><h5>与你的关注有什么联系</h5><p>{report.relevance}</p></section>}{report.uncertainties.length>0&&<section><h5>待核实</h5><ul>{report.uncertainties.map((u,i)=><li key={i}>{u}</li>)}</ul></section>}{report.next_steps.length>0&&<section><h5>可继续了解</h5><ul>{report.next_steps.map((n,i)=><li key={i}>{n}</li>)}</ul></section>}</details>}</article>
 <div className="hall-next-actions"><button className="secondary" onClick={readSources}>查看原始资料</button><button className="secondary" onClick={()=>onNavigate('archive',{visitId:visitor.id})}>去作者档案</button><button className="primary" onClick={()=>onNavigate('liaison',{visitId:visitor.id})}>找联络官联系他</button></div>{error&&<div className="notice error" role="alert">{error}</div>}{sources&&<div className="source-list">{sources.sources.map(s=><details key={s.id}><summary>{s.label}</summary>{s.paragraphs.map((p,i)=><div className="source-paragraph" key={i}><small>{s.id}:p{i+1}</small><p>{p}</p></div>)}</details>)}</div>}<p className="hall-footnote">发言来自保存的资料与独立报告；角色入场与交谈属于动画演示，来访者本人并未实时在线。</p></>
}
function CouncilStage({residents,world,visitor,active,gathering=false,guest=false}){
 const host=residents.main;
 return <div className={'council-stage '+(gathering?'gathering':'')+(guest?' guest-stage':'')} role="img" aria-label={gathering?`居民进入主会议室，轮流介绍${visitor.name}的已保存资料`:'主会议室：木地板、长桌、窗户与门口'}><div className="council-wall"><div className="council-window"/><div className="council-room-sign">主会议室</div><div className="council-window"/></div><div className="council-rug"/><div className="council-table"><i/><i/><i/></div><div className="council-door"/><div className="council-host stage-person" style={{left:'12%',top:'48%'}}><PixelPerson size={48} coat={world?.owner?.avatar?.body||host.color} hair={world?.owner?.avatar?.hair||host.hair}/><span>{host.name}{guest?'':' · 你'}</span></div>{visitor&&<div className="stage-person council-visitor" style={{left:'87%',top:'48%'}}><PixelPerson size={48} coat={visitor.avatar?.body} hair={visitor.avatar?.hair}/><span>{visitor.name}</span><small>资料投影</small></div>}{gathering&&order.map((id,i)=><div key={id} className={'stage-person council-resident '+(active===id?'speaking':'')} style={{'--seat-x':seats[i][0]+'%','--seat-y':seats[i][1]+'%','--entry-delay':i*.32+'s'}}><div className="council-sprite"><PixelPerson size={44} coat={residents[id].color} hair={residents[id].hair}/></div><span>{residents[id].name}</span>{active===id&&<div className="council-talk" aria-hidden="true">···</div>}</div>)}</div>
}
