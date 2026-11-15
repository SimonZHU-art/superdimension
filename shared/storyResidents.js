// Authored fiction only. Never used as source material for real reports or emails.
export const STORY_RESIDENTS=Object.freeze({
 customs:{name:'阿斯伽德',identity:'守望者',tone:'苍老、耐心、从容',reaction:'shield',lines:['嗯。手还疼吗？','别急，旅人。我站得住，你的手未必。'],intro:'这里是云汀岛。名字记不住也无妨，回家的路记住便好。',action:'他等你说完，才缓缓抬起眼。'},
 curator:{name:'黄四郎',identity:'画家',tone:'油滑、夸口、胆小',reaction:'brush',lines:['哎哎！我这是画家的手，不是承重墙！','我靠，笔可以掉，身价不能掉。你先别动，我自己捡。'],intro:'这岛的审美，三分看天，七分看我。剩下九十分，看你有没有眼光。',action:'他把画笔藏到身后，笑容却还留在脸上。'},
 specialist:{name:'纳德',identity:'研究员',tone:'专注、古板、慢半拍',reaction:'glasses',lines:['嘿……位、位移了。再记一笔。','啧。样本数量……呃，已经够了。嘿嘿。'],intro:'呃，你好。我正在研究这个雾。进展是……雾比我先下班。',action:'他推了一下眼镜，慢半拍才转向你。'},
 archive:{name:'Doctor Strange',identity:'图书管理员',tone:'严谨、拘谨、深藏武功',reaction:'counter',lines:['本馆禁止喧哗。也禁止你刚才那种标点。','现在，纠正你的动作。'],intro:'姓名可以稍后登记。先把湿鞋留在门边。',action:'他抬起眼，等你把问题说完整。'},
 liaison:{name:'混子',identity:'邮局居民',tone:'嘴损、幽默、可靠',reaction:'letters',lines:['我靠，你打招呼按错键了吧？','差不多得了，邮局不包这项服务。'],intro:'信给我，秘密自己揣好。我这儿管投递，不管嘴欠。',action:'他把帽檐压低一点，侧过脸听你说。'},
 main:{name:'朱珠',identity:'岛主',tone:'神秘、克制、留白',reaction:'echo',lines:['这一拳，我收到了。先记着。'],intro:'房子可以借住。井不建议。',action:'他看向你，停顿比回答稍长。'},
 wanderer:{name:'松果',identity:'漫游配角',tone:'散漫、直觉敏锐',reaction:'run',lines:['今天的安排是没有安排。你这一拳，属于计划外。'],intro:'今天没有安排。除了看看那片雾为什么不肯散。',action:'他扶住帽子，往井边看了一眼。'},
});
export const STORY_NAMES=Object.freeze(Object.fromEntries(Object.entries(STORY_RESIDENTS).map(([id,r])=>[id,r.name])));
export const COMBAT_RULES=Object.freeze({range:43,cooldown:600,health:100,archiveDamage:40,liaisonDamage:10,windup:750,restDelay:2000,protection:3000});
export function strikeInRange(player,target,{room=false,clear=()=>true}={}){
 if(!player||!target||Math.hypot(player.x-target.x,player.y-target.y)>COMBAT_RULES.range)return false;
 const facing={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[player.direction]||[0,1];
 const dx=target.x-player.x,dy=target.y-player.y,d=Math.hypot(dx,dy);if(d>8&&(dx*facing[0]+dy*facing[1])/d<.35)return false;
 if(!room)for(let i=1;i<6;i++)if(!clear(player.x+dx*i/6,player.y+dy*i/6))return false;
 return true;
}
export function beatFor(id,line,index=0){const r=STORY_RESIDENTS[id];return {speaker:r?.name||id,text:line,action:({customs:['他等你说完，才缓缓抬起眼。','他的目光落在远处，又回到你身上。','他静静站着，给你留出思考的时间。'],curator:['他的笑容先到了，目光还在四处转。','他说得笃定，脚尖却朝着回家的路。','他掸了掸肩头，那里并没有灰。'],specialist:['他慢半拍才转向你。','他推了一下眼镜，停住半句解释。','他皱着眉，认真听完你的问题。'],archive:['他抬起眼，等你把问题说完整。','他没有笑，只把目光留在你脸上。','他轻轻点头，等你区分事实与猜测。'],liaison:['他侧过脸听你说，嘴角压着一点笑。','他的帽檐低了些，目光仍看着你。','他眉毛一挑，话比笑先出来。'],main:['他看向你，停顿比回答稍长。','他不急着回答，只轻轻点头。','他的目光越过你，又慢慢回来。'],wanderer:['他扶着帽子，往井边看了一眼。','他侧过头，像刚想起一件小事。']}[id]||[r?.action||'他看向你。'])[index%({wanderer:2}[id]||3)],expression:id==='archive'?'serious':id==='curator'?'smile':id==='specialist'?'hesitant':'calm'};}
