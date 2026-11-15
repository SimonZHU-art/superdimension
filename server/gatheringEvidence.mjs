import {sourceParagraphs} from './agents.mjs';

// Keep exact extracted text, but give citations a usable paragraph rather than an entire PDF.
export function evidenceParagraphs(text){
 const paragraphs=[];
 for(const block of String(text).replace(/\r\n?/g,'\n').split(/\n\s*\n/)){
  let current='';
  for(const line of block.split('\n')){
   const clean=line.trim();if(!clean)continue;
   if(current.length+clean.length>550){if(current)paragraphs.push(current);current='';}
   // Oversized unbroken lines retain every character in bounded source paragraphs.
   let rest=clean;while(rest.length>700){if(current){paragraphs.push(current);current='';}paragraphs.push(rest.slice(0,700));rest=rest.slice(700);}
   current+=(current?'\n':'')+rest;
  }
  if(current)paragraphs.push(current);
 }
 return paragraphs;
}
export function gatheringSources(task){
 const prefix=task.exchangeId+':'+(task.islandId||task.userId||'participant')+':v'+task.inputVersion;
 return [...task.input.pack.map((p,n)=>({id:prefix+':pack:'+n,label:p.title||'本次开放资料',kind:'selected_pack',paragraphs:evidenceParagraphs(p.text)})),...task.input.messages.map(m=>({id:prefix+':message:'+m.sequence,label:(m.sender===task.userId?'你的问题':'来客的回复')+' · 第 '+m.sequence+' 条对话',kind:m.sender===task.userId?'owner_chat':'consented_chat',paragraphs:[m.text]}))];
}
export function evidenceIndex(task,report){
 const used=new Set([...(report.source_refs||[]),...(report.findings||[]).flatMap(f=>f.source_refs||[]),...(report.project_cards||[]).flatMap(p=>p.source_refs||[])]);
 return sourceParagraphs(gatheringSources(task)).filter(p=>used.has(p.ref)).map(p=>({ref:p.ref,title:p.label,kind:p.kind,text:p.text}));
}

// Offline mode is honest extraction, not a fabricated model or A2A conversation.
export function extractGatheringReport(task){
 const paragraphs=sourceParagraphs(gatheringSources(task));
 const usable=paragraphs.filter(p=>p.kind!=='owner_chat'&&!/^(见简历|同上|1|收到|好的)[。.!！]?$/.test(p.text.trim()));
 const patterns={archivist:/身份|职业|从事|毕业|经历|负责|工作|本科|专业/g,curator:/《[^》]+》|项目|作品|原型|上线|上新|改版|制作|工具|目标|负责|成果/g,specialist:/项目|方法|研究|数据|样本|指标|统计|结果|模型|实验|反馈/g,liaison:/偏好|交流|希望|共同|沟通|联系|协作|负责|问题/g};
 const pattern=patterns[task.agent]||patterns.archivist;
 const ranked=usable.map((p,n)=>({p,n,score:(p.text.match(pattern)||[]).length-(p.text.match(/阅读说明|原创虚构设定|资料时点|非真实个人资料/g)||[]).length*2})).sort((a,b)=>b.score-a.score||a.n-b.n);
 const picks=ranked.filter(v=>v.score>0).slice(0,4);if(!picks.length&&usable.length)picks.push({p:usable[0]});
 if(task.agent==='archivist'&&usable[0]&&!picks.some(v=>v.p.ref===usable[0].ref)){picks.unshift({p:usable[0]});picks.splice(4);}
 const findings=picks.map(({p})=>({text:p.text.slice(0,330),kind:'self_report',source_refs:[p.ref]}));
 const projectTitle=picks.flatMap(({p})=>p.text.match(/《[^》]+》/g)||[])[0];
 const angles={archivist:'先看身份与经历',curator:'接着看项目与作品',specialist:'再看方法与成果',liaison:'最后准备继续交流的问题'};
 const next_steps=task.agent==='curator'?[projectTitle?`在${projectTitle}里，你本人负责哪一部分？可以展示对应的作品吗？`:'能挑一项你亲手做过的项目，说明目标、负责的工作和现在的成果吗？']:
  task.agent==='specialist'?[projectTitle?`${projectTitle}使用了什么方法？材料里的结果有哪些限制？`:'这些结果如何验证？样本、指标和目前的限制分别是什么？']:
  task.agent==='liaison'?['你现在最想交流或改进的具体问题是什么？你愿意从哪一段经历开始讲？']:
  ['你目前主要在做什么？这些经历中哪一段最能说明你的能力？'];
 const report={summary:(angles[task.agent]||angles.archivist)+'。'+(findings[0]?.text||'暂时没有可以摘录的材料。'),findings,relevance:task.input.internalContext?.note?'已保留你的私人关注方向；本地摘录未做模型相关性判断。':'可以据此继续追问，尚未判断合作适配程度。',uncertainties:['这是从获准原文进行的本地摘录，未做模型推理或独立核验。'],next_steps,source_refs:findings.flatMap(f=>f.source_refs)};
 if(task.agent==='specialist')report.project_cards=[];
 return {simulated:true,report,sourceIndex:evidenceIndex(task,report),collaboration:[],findings:findings.map((f,n)=>({id:task.id+':'+n,text:f.text,fact:f.text,inference:'原文摘录，尚未独立核验。',sources:f.source_refs.map(ref=>({ref,title:paragraphs.find(p=>p.ref===ref).label,inputVersion:task.inputVersion})),relevance:report.relevance,question:next_steps[0]}))};
}
