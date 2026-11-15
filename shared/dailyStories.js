import {STORY_RESIDENTS} from './storyResidents.js';
import {DAILY_LIFE,activityHint,authoredEncounters} from './dailyActivities.js';

// Fiction only. These authored anchors never come from visitor material or model output.
export const DAILY_RULES=Object.freeze({schema:2,startDay:2,maxTokens:4000,timeoutMs:12000,recentCount:2,phases:[{id:'prepare',at:480},{id:'encounter',at:600},{id:'investigate',at:780},{id:'wrap',at:960},{id:'ended',at:1080}],rewards:{wood:{wood:4,screws:0},parts:{wood:2,screws:1}}});
const A=(location,action,text,actionText)=>({location,action,text,actionText});
const role=(...beats)=>beats;
const object=(id,label,kind,x,y)=>({id,label,kind,x,y,r:22,type:'daily-object'});
const ending=(text,thanks)=>({text,thanks});
export const DAILY_STORIES=[
 {id:'glasses',title:'藏起来的眼镜',reason:'混子把黄四郎的眼镜藏进了沙滩的沙堆。',recipient:'curator',reward:'parts',places:{atelier:{x:947,y:381},road:{x:947,y:480},shore:{x:1110,y:745}},objects:[object('glasses-sand','翻找沙堆里的眼镜','sand',1110,745)],clue:'海边那堆新沙，旁边有混子的鞋印。',actors:{
  curator:role(A('atelier','search','我的眼镜自己长腿了？还专挑你上班的时候长？','他把空眼镜盒拍在手里。'),A('road','argue','先别抖鞋！你鞋里的沙比我画里的海还多。','他指着混子的鞋，声音越来越高。'),A('shore','search','海那么大，我偏偏看不清它。真是好安排。','他眯眼拨开沙面。'),A('road','point','找到了就给我。没有眼镜，这张脸太诚实。','他举起空盒子等着。'),A('atelier','give','眼镜回来了。咳，是海主动道的歉。','他戴上眼镜，合起盒子。')),
  liaison:role(A('road','shrug','先别看我。海那么大，你问问海。','他抖了抖鞋里的沙。'),A('road','argue','你总说想换个看世界的角度，我这叫售后。','他退半步，忍住笑。'),A('shore','search','右边那堆新沙。别挖远了，我没这么勤快。','他用鞋尖点了点沙堆。'),A('shore','give','行，我去捡回来。天黑后可没人陪你玩。','他把袖子卷起。'),A('atelier','shrug','这不挺好？眼镜和友情，都还没碎。','他掸去掌心的沙。'))},end:ending('混子从沙堆找回眼镜，黄四郎戴上它。争论终于散了。','眼镜收到。你比这位海边艺术家靠谱。')},
 {id:'drawings',title:'被风吹走的画稿',reason:'阵风卷走黄四郎还没收好的三张画稿。',recipient:'curator',reward:'wood',places:{atelier:{x:947,y:381},road:{x:880,y:480},garden:{x:910,y:547}},objects:[{...object('page-road','拾起路边画稿','page',860,491),availableAt:540},{...object('page-garden','拾起花圃旁画稿','page',936,550),availableAt:540},{...object('page-shore','拾起岸边画稿','page',982,742),availableAt:540}],clue:'三张散页落在大路、花圃旁和南岸；混子只压住了边角。',actors:{
  curator:role(A('atelier','search','风也来鉴赏？能不能先买票再拿画！','他抓住空画夹，追着散页看。'),A('road','point','站住！那不是废纸，是我精心留的白！','他伸手指向路旁。'),A('garden','search','一张在花圃，一张往南岸去了，还有一张就在路边。','他沿草边小心找纸。'),A('road','give','三张齐了再给我，次序我自己认得。','他摊开画夹，压住一角。'),A('atelier','give','都齐了。风的审美，也就这样。','他把三页叠好，扣紧画夹。')),
  liaison:role(A('road','point','画家，先收纸，别跟风讲道理。','他用鞋压住一张纸的边角。'),A('road','shrug','这张画的路比真的路直，我差点踩错。','他笑着让开纸面。'),A('garden','search','我守住这边。你去捡，纸上的人都快晕船了。','他追着另一个纸角。'),A('road','give','整理好就回屋，今晚风可不止翻纸。','他扶着画夹边缘。'),A('atelier','shrug','纸没少，黄四郎的价还涨了。真能收尾。','他拍掉袖口的草叶。'))},end:ending('居民把散落的三张画稿拾齐，整理进画夹。','三张都在。你帮我保住了一整片海。')},
 {id:'marker',title:'研究标记失踪',reason:'纳德沿溪岸观察时发现一枚旧标记不见了。',recipient:'specialist',reward:'parts',places:{lab:{x:1200,y:290},creek:{x:1235,y:302},bridge:{x:1185,y:361}},objects:[object('bridge-marker','拾起桥南端的研究标记','marker',1212,362)],clue:'阿斯伽德在桥的南侧看见一枚沾水的铜标记。',actors:{
  specialist:role(A('lab','search','呃，记录有四枚，盒里只有三枚。先核对，不先怪雾。','他逐一检查标记盒。'),A('creek','search','位置没有变。标记……变了。','他俯身比对溪岸。'),A('bridge','point','桥南侧。水把它推到岸上，也可能是脚。还不能下结论。','他指向桥边，停住猜测。'),A('lab','give','找到后送到这里，我得先核对刻痕。','他摊开记录纸。'),A('lab','give','刻痕吻合。标记归位，继续测量。','他把铜片放回盒中。')),
  customs:role(A('bridge','search','木板是稳的。绳边倒多了一点不该有的亮光。','他沿桥栏缓缓检查。'),A('bridge','point','别踩进水里，旅人。答案也要走桥。','他指向桥的南岸。'),A('bridge','point','那枚铜片就在桥边。送给纳德，他会认。','他让出干燥的岸边。'),A('lab','give','东西总算有了回去的方向。','他等纳德核对完才点头。'),A('bridge','shrug','桥还在，研究也能继续。晚上回来，记得看灯。','他收起沾水的绳头。'))},end:ending('阿斯伽德把桥边的标记送回研究室，纳德核对后归位。','嗯，刻痕对上了。谢谢你亲手送回来。')},
 {id:'bookmark',title:'放错位置的书签',reason:'一枚书签被夹进了邮局误送来的包裹。',recipient:'archive',reward:'wood',places:{library:{x:488,y:372},road:{x:489,y:480},post:{x:1086,y:705}},objects:[object('post-parcel','检查邮局门边包裹','parcel',1120,713)],clue:'混子在邮局门边留了一件包裹，绳结里夹着一角书签。',actors:{
  archive:role(A('library','search','页码完整，书签缺失。先查送件记录。','他按页核对书边。'),A('road','point','混子，记录里的收件人不是我。请核对。','他把记录摊开，指住一行。'),A('post','search','包裹门边那件。只取书签，不拆别人的信。','他指向包裹外面的绳结。'),A('library','give','带回书签，我会核对缺口。','他把书翻到原来的那页。'),A('library','give','书签已归还，送件差错已经更正。','他把书签夹好，合上记录。')),
  liaison:role(A('post','search','谁把书签拿来当地址条？不会是……行，我先查。','他翻看包裹上的贴纸。'),A('road','shrug','字我认得，方向认错了。别给我记一整页。','他压低帽檐。'),A('post','point','绳结外面那一角就是。信别拆，咱俩都省事。','他拨开包裹上的绳头。'),A('library','give','我去改地址。你先把那片严谨送回去。','他把旧贴纸撕下。'),A('post','give','改好了。今天的错件，到这儿为止。','他贴好新地址。'))},end:ending('混子归还了误夹的书签，并更正包裹地址。','缺口吻合。谢谢；包裹和信的边界也守住了。')},
 {id:'rope',title:'北岸缆绳打结',reason:'北岸缆绳缠成了一个复杂的结，纳德的解释比结还长。',recipient:'customs',reward:'parts',places:{dock:{x:802,y:153},north:{x:864,y:165},sketch:{x:875,y:174}},objects:[object('north-rope','整理北岸缆绳','rope',799,143)],clue:'从外侧松开绳头，顺着圈拉直，再向阿斯伽德确认。',actors:{
  customs:role(A('dock','search','昨晚风把绳绕紧了。慢慢解，船不会催人。','他托住缆绳的松头。'),A('north','point','纳德，先让绳头有地方走，再说图里的箭头。','他给绳头让出空间。'),A('dock','search','从外边松开，再拉直。走近这段绳，我替你扶着。','他把绳圈抬离木板。'),A('dock','give','整理好了就来告诉我，我再检查一次。','他低头看着绳圈。'),A('dock','give','顺了。北岸今晚不会再绊住谁。','他把绳整齐卷好。')),
  specialist:role(A('sketch','search','呃，有三个交叉。理论上四步……也可能两步。','他在草图上数箭头。'),A('north','point','先这边，后那边。不，先那边……我重新画。','他转过草图，停了半拍。'),A('dock','point','简单解法也符合拓扑。先听阿斯伽德的。','他收起一半草图。'),A('north','give','现在曲线平顺。实际操作比图快。','他删掉多余的箭头。'),A('sketch','shrug','结没了，模型也该改。嗯，记下来。','他认真修改草图。'))},end:ending('阿斯伽德解开缆绳，纳德简化草图，北岸恢复整齐。','松紧合适。谢谢你替北岸搭了这把手。')},
 {id:'sandmarks',title:'退潮后的怪沙纹',reason:'退潮后留下两片怪沙纹，居民试着区分痕迹和猜测。',recipient:'specialist',reward:'wood',places:{shore:{x:790,y:783},west:{x:315,y:744},east:{x:1000,y:755},record:{x:835,y:757}},objects:[{...object('sand-west','观察北岸木桩旁的沙纹','ripple',891,174),availableAt:540},{...object('sand-east','观察南岸潮线的沙纹','ripple',1000,755),availableAt:540},{...object('sand-shell','观察北岸旧木桩旁的带齿贝壳','shell',868,162),availableAt:540}],clue:'南岸潮线有一处沙纹；北岸船台右边、旧木桩靠海那侧有另一处和带齿贝壳。纳德之后去桥边，下午回研究室门前整理记录。',actors:{
  specialist:role(A('shore','search','痕迹像字，但相似不能证明它是字。','他蹲下，沿纹路描画。'),A('west','search','两岸都要看。单看一处，我容易想多。','他用纸边比对纹距。'),A('east','search','南岸潮线一处，北岸船台右边旧木桩一处，再看木桩靠海那侧的带齿贝壳。','他抬起手，避开湿沙。'),A('record','give','潮水要回来了。你看见的，和猜的，请分开说。','他压住记录纸，等你报告。'),A('shore','give','记录完成。潮水抹掉痕迹，没有替我们解释它。','他合起纸，注视退去的沙纹。')),
  curator:role(A('west','point','这线条！至少得是个会写字的海。','他比划一个夸张的弧线。'),A('west','argue','我说的是气势。科学能不能先让气势过门？','他抬起下巴又看一眼脚下。'),A('east','search','北岸那枚带齿贝壳也能画？那我得重新考虑同行关系。','他拿画笔比了比纹路。'),A('record','shrug','行，只记看见的。刚才那句当我润色。','他把夸张的图擦掉一半。'),A('shore','shrug','海把画擦了。明天的空白，先别替它填。','他收好画笔。')),
  customs:role(A('east','point','潮退有时，潮来也有时。别追到水里。','他在干沙上划出界线。'),A('shore','point','看脚下，再看纸上。雾里的事，不急着起名字。','他提醒两人退半步。'),A('shore','point','趁沙还干，把你看见的带回去。','他看一眼回涨的海水。'),A('record','point','最后看一眼。潮水已在回头。','他轻轻收起岸边木尺。'),A('shore','shrug','留下记录就够了，旅人。谜也有等天亮的时候。','他望向平静的海面。'))},end:ending('居民完成当日记录，回涨的潮水抹去沙纹。小岛的谜仍未解开。','你把三处都看过了。谢谢，记录现在有了完整的边界。')},
];

for(const sk of DAILY_STORIES){sk.places={...sk.places,...DAILY_LIFE[sk.id].places};sk.schedule=DAILY_LIFE[sk.id];}

// Each phase has the same end point for helped/unhelped paths; only gratitude differs.
export function dailyPhase(minutes){const m=((minutes%1440)+1440)%1440;return [...DAILY_RULES.phases].reverse().find(p=>m>=p.at)?.id||'prepare';}
export const dailySkeleton=id=>DAILY_STORIES.find(s=>s.id===id);
export function authoredDaily(id){const s=dailySkeleton(id);return {title:s.title,reason:s.reason,clue:s.clue,stages:DAILY_RULES.phases.map((p,i)=>({id:p.id,beats:Object.entries(s.actors).map(([speaker,beats])=>({speaker,...beats[i]}))})),encounters:authoredEncounters(id)};}
export function dailyBeats(daily,id){if(!daily)return [];const stage=daily.pack.stages.find(s=>s.id===daily.phase);return (stage?.beats||[]).filter(b=>!id||b.speaker===id);}
export function dailyEnding(daily){
 const endings={glasses:'眼镜已经回到黄四郎的盒里，争论结束了。',drawings:'三张画稿整理进画夹，风没有带走它们。',marker:'铜标记归位，纳德继续核对水位。',bookmark:'书签归还，误送地址已经更正。',rope:'北岸缆绳恢复整齐，草图也简化了。',sandmarks:'当日潮汐记录已经完成，涨潮抹去两岸痕迹。小岛的谜仍未解开。'};
 return endings[daily.skeleton];
}
export function dailyDialogue(daily,id,{activity,where,moving}={}){if(!daily)return null;const s=dailySkeleton(daily.skeleton),beats=dailyBeats(daily,id);if(!s)return null;
 const work=activity?(where?`${moving?'正沿路前往':'在'}${where}，${activity}。`:`正在${activity}。`):activityHint(daily,id),working={text:'这会儿我'+work,actionText:'他把手里的事暂时放下，转向你。',action:'point'};
 if(daily.phase==='ended')return [{text:dailyEnding(daily),actionText:'他收好当天的东西，目光转向暮色。',action:'give'}];
 // Completing optional help never changes the world phase or the actor's remaining jobs.
 if(daily.completed)return [working,{text:dailyEnding(daily)+'我接着把今天的事做完。',actionText:'他收起记录，示意自己接下来的去向。',action:'give'}];
 const progress=s.objects.filter(o=>daily.items.includes(o.id)||daily.observed.includes(o.id)).length;
 const ready=progress===s.objects.length;
 if(progress)return [working,{text:ready?'你已经把线索找齐了。交给'+STORY_RESIDENTS[s.recipient].name+'，路上拦住他也可以。':'你已经查过其中'+progress+'处，留下的发现不用重新找。',actionText:'他看了看你已经带回的东西。',action:'give'},{text:s.clue+' '+STORY_RESIDENTS[s.recipient].name+'这会儿'+activityHint(daily,s.recipient),actionText:'他简短说明剩下的方向。',action:'point'}];
 if(beats.length)return [working,...beats,{text:daily.pack.clue,actionText:'他指向接着可以查看的区域。',action:'point'}];
 return [working,{text:'他们在处理今天那件小事。愿意的话，可以搭把手。',actionText:STORY_RESIDENTS[id]?.action||'他抬眼看了看小镇。',action:'shrug'}];
}
export function dailyObjects(daily){if(!daily||daily.phase==='ended')return [];const s=dailySkeleton(daily.skeleton),m=daily.clockMinutes??780;return s.objects.filter(o=>m>=(o.availableAt??480)&&(['ripple','shell'].includes(o.kind)||!daily.completed&&!daily.items.includes(o.id))).map(o=>({...o,storyDay:daily.day,storyVersion:daily.version,observed:daily.observed.includes(o.id)||daily.recordedIds?.includes(o.id)}));}
export function dailyOpportunity(daily,id){if(!daily||daily.phase==='ended'||daily.completed)return null;const s=dailySkeleton(daily.skeleton);if(!s.actors[id])return null;return {recipient:id===s.recipient,ready:s.objects.every(o=>['ripple','shell'].includes(o.kind)?daily.observed.includes(o.id):daily.items.includes(o.id)),accepted:daily.accepted};}
