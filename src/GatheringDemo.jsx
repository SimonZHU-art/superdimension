import React,{useEffect,useState} from 'react';
import {api,readFile} from './api.js';
import {PixelPerson} from './Icons.jsx';
const NAMES={archivist:'Doctor Strange',specialist:'纳德',curator:'黄四郎',liaison:'混子'};
export async function resumeFile(file,endpoint='/api/gathering-demo/resume'){
 if(/\.(txt|md)$/i.test(file.name))return readFile(file);
 if(file.size>2*1024*1024)throw Error('简历最多 2 MB。');
 const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return api(endpoint,{name:file.name,data:btoa(binary)});
}
export default function GatheringDemo({onEmbark,ownerName='你',initialAgents,production=false}){
 const[state,setState]=useState(null),[profile,setProfile]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[template,setTemplate]=useState('basketball'),[agents,setAgents]=useState(initialAgents?.length?initialAgents.filter(a=>a!=='customs'):['archivist','specialist','curator']),[goal,setGoal]=useState('了解来客的代表项目、本人负责的工作、实际成果与当前交流方向。'),[shareA,setShareA]=useState(false),[model,setModel]=useState(production?'real':'simulated');
 const endpoint=production?'/api/gatherings?view=owner':'/api/gathering-demo';
 useEffect(()=>{let alive=true;api(endpoint).then(r=>{if(alive){setState(r);setProfile(r.profile);setModel(r.realAvailable?'real':'simulated')}}).catch(e=>alive&&setError(e.message));return()=>{alive=false}},[]);
 async function upload(file){if(!file)return;setBusy(true);setError('');try{const r=await resumeFile(file,production?'/api/gatherings/resume?view=owner':'/api/gathering-demo/resume');setProfile(p=>({...p,resume:r.text,resumeName:r.name}))}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function start(){setBusy(true);setError('');try{const r=await api(endpoint,{...(production?{virtual:true,duration:120}:{actor:'A'}),action:'begin',profile,templateId:template,agents,goal,shareA,analysisMode:model,requestId:crypto.randomUUID()});onEmbark(r)}catch(e){setError(e.message)}finally{setBusy(false)}}
 const edit=(k,v)=>setProfile(p=>({...p,[k]:v}));
 return <div className="harness-setup panel-body">
  <p className="harness-note">准备一位虚拟来客，和你一起走进主题岛。回复由你预设。{production?'资料交给当前模型整理，演练档案会保存到主岛，并标记为虚拟来客。':'资料和档案仅用于隔离测试。'}</p>
  <div className="harness-guest-heading"><PixelPerson coat="#9d725b" hair="#514b47" size={54}/><div><h3>你的{production?'虚拟':'测试'}来客 B</h3><p>上岛后走近他，按 E 发起交流。</p></div></div>
  {!profile?<p>正在打开来客资料…</p>:<>
   <div className="harness-fields"><label className="field">来客名字<input value={profile.name} maxLength={40} onChange={e=>edit('name',e.target.value)}/></label><label className="field">主题岛<select value={template} onChange={e=>setTemplate(e.target.value)}><option value="basketball">潮汐篮球岛</option><option value="music">海风音乐岛</option></select></label></div>
   <label className="field">个人介绍<textarea value={profile.bio} maxLength={1500} rows={2} onChange={e=>edit('bio',e.target.value)}/></label>
   <label className="field">项目与作品<textarea value={profile.projects} maxLength={4000} rows={3} onChange={e=>edit('projects',e.target.value)}/></label>
   <label className="field">交流偏好<input value={profile.preferences} maxLength={1000} onChange={e=>edit('preferences',e.target.value)}/></label>
   <label className="harness-upload">上传 B 的简历<input aria-label="上传 B 的简历" type="file" accept=".txt,.md,.pdf,.docx" disabled={busy} onChange={e=>upload(e.target.files?.[0])}/><small>TXT / MD / PDF / DOCX · 最多 2 MB</small></label>
   {profile.resume&&<details className="harness-resume"><summary>{profile.resumeName||'简历正文'} · 已读取，可检查或编辑</summary><label className="field">B 的简历正文<textarea value={profile.resume} maxLength={14000} rows={6} onChange={e=>edit('resume',e.target.value)}/></label></details>}
   <label className="field">每次聊天的固定回复<textarea value={profile.reply} maxLength={1200} rows={2} onChange={e=>edit('reply',e.target.value)}/></label>
   <label className="harness-check"><input type="checkbox" checked={profile.share} onChange={e=>edit('share',e.target.checked)}/>B 本次开放以上简介、项目和简历，供我的助理整理并{production?'在主岛保存演练档案':'测试建档'}</label>
   <details className="harness-preferences" open><summary>{ownerName}的私人助理</summary><p>携带的是功能。地图上只出现你和来客。</p><div className="harness-agents">{Object.entries(NAMES).map(([id,name])=><label key={id}><input type="checkbox" checked={agents.includes(id)} onChange={e=>setAgents(e.target.checked?[...agents,id]:agents.filter(a=>a!==id))}/>{name}</label>)}</div><label className="field">我希望关注什么？<textarea value={goal} rows={2} maxLength={1500} onChange={e=>setGoal(e.target.value)} placeholder="仅供你的助理参考，不会放入 B 的资料包"/></label><label className="harness-check"><input type="checkbox" checked={shareA} onChange={e=>setShareA(e.target.checked)}/>本次也开放我已确认的公开介绍</label></details>
   {!production&&<details className="harness-preferences"><summary>测试选项</summary><label className="field">资料分析方式<select value={model} onChange={e=>setModel(e.target.value)}><option value="simulated">本地资料摘录 · 不做模型推理</option><option value="real" disabled={!state?.realAvailable}>当前真实模型{!state?.realAvailable?' · 此副本未配置':''}</option></select></label><label className="harness-check"><input type="checkbox" checked={profile.accept} onChange={e=>edit('accept',e.target.checked)}/>B 接受交流邀请</label><label className="harness-check"><input type="checkbox" checked={profile.agents} onChange={e=>edit('agents',e.target.checked)}/>模拟 B 的私人收件箱（独立整理，不是 A2A 对话）</label></details>}
   <p className="harness-note">{production?'使用主岛当前模型。虚拟来客是你创建的角色，不能作为真人来访记录。':model==='real'?'选定资料交给当前模型提炼。上岛确认交流后，随行助理轮流介绍此人、项目和可继续问的问题；结果写入测试档案。':'本地摘录无需模型费用。会按职责选取你实际填写或上传的原文，并保留引用；不冒充模型分析。'}</p>
   <button className="primary harness-start" disabled={busy||!profile.name.trim()} onClick={start}>{busy?'正在准备…':'与来客一起上岛'}</button>
   {state?.room&&['loading','active'].includes(state.room.status)&&<button className="text-link" disabled={busy} onClick={()=>onEmbark(state)}>继续上次{production?'聚会':'测试旅程'}</button>}
  </>}{error&&<p className="notice error" role="alert">{error}</p>}
 </div>;
}
