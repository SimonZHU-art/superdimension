import {fail} from './security.mjs';
export const DEFAULT_PARTICIPANT={name:'林舟',bio:'喜欢篮球，也喜欢把练习的过程记录下来。',projects:'正在制作训练记录与教练反馈工具。作品是一份练习后的反馈流程。',preferences:'简洁、直接，先说具体做过的事情。',resumeName:'',resume:'',reply:'收到，我先听你说。项目的细节都写在我带来的资料里，我们可以从你感兴趣的部分聊起。',share:true,accept:true,agents:true};
export const participantText=(value,max,label)=>{if(typeof value!=='string'||value.length>max)fail(400,'participant_profile',`${label}长度超出限制。`);return value.trim();};
export function validateParticipant(value={}){
 const p={...DEFAULT_PARTICIPANT,...value};return {...p,name:participantText(p.name,40,'来客名字')||'虚拟来客 B',bio:participantText(p.bio,1500,'简介'),projects:participantText(p.projects,4000,'项目与作品'),preferences:participantText(p.preferences,1000,'交流偏好'),resumeName:participantText(p.resumeName,120,'文件名'),resume:participantText(p.resume,14000,'简历'),reply:participantText(p.reply,1200,'固定回复')||DEFAULT_PARTICIPANT.reply,share:p.share===true,accept:p.accept!==false,agents:p.agents!==false};
}
export function participantPack(p){return [[p.name+'的简介',[p.bio,p.preferences].filter(Boolean).join('\n')],[p.name+'的项目与作品',p.projects],[p.resumeName||p.name+'的简历',p.resume]].filter(([,v])=>v).map(([title,value])=>({title,text:value}));}
