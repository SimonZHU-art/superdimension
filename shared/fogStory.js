import {STORY_RESIDENTS,STORY_NAMES} from './storyResidents.js';
// Authored fiction. Never enters real visitor sources, reports, or owner biographies.
export const CHAPTERS=[
 {id:'antler',title:'被移走的路标',form:'枝角影',sign:'林边路标朝向了没有道路的地方。',sound:'木枝摩擦',clue:'路标背面刻着同一个朝海的箭头。',question:'是谁每夜把箭头转向岛内？',roles:['customs','curator']},
 {id:'tide',title:'没有船的来客',form:'潮衣客',sign:'晴天晾着的衣物一直滴水。',sound:'滴水与湿脚步',clue:'湿衣物的盐迹来自井水，而不是海水。',question:'井底为什么会有潮汐？',roles:['liaison','specialist']},
 {id:'paper',title:'第二个名字',form:'纸面客',sign:'一页旧记录自己翻到空白处。',sound:'折纸声',clue:'同一名字被两种笔迹誊写，第二行没有到访时间。',question:'另一个名字是谁写下的？',roles:['archive','customs']},
 {id:'lantern',title:'第五盏灯',form:'空灯巡者',sign:'居民清点灯具时，总会多数出一盏。',sound:'空心金属碰撞',clue:'四盏灯的编号完整，多出的灯没有灯芯。',question:'它拿什么照亮自己的路？',roles:['curator','specialist']},
 {id:'doll',title:'门前旧物',form:'缝偶',sign:'门前纪念物上缠着不属于任何衣服的线。',sound:'布料拖动',clue:'被搬走的旧物回来了，底部多了一道针脚。',question:'它是在修补，还是在模仿？',roles:['curator','liaison']},
 {id:'shell',title:'向内陆的潮声',form:'贝壳背影',sign:'离海最远的门廊上出现了细小贝壳。',sound:'细碎敲击',clue:'贝壳排成了一条从井边开始的路线。',question:'潮水为什么从岛中央走向海岸？',roles:['specialist','archive']},
];
export function nightPhase(minutes){const m=((minutes%1440)+1440)%1440;return m>=1140||m<360?'fog':m>=1080?'dusk':'day';}
export function makeNarrative(minutes=1020,legacy=false){return {schema:1,prologue:legacy?'complete':'arrival',phase:legacy?'day':'prologue',number:1,chapter:'antler',used:['antler'],known:legacy?['customs','main','archive','curator','liaison','specialist']:[],doors:legacy?['main','customs','archive','curator','liaison','specialist','meeting','gallery']:[],dialogues:{},clues:[],collection:{},rumors:[],night:null,results:[],damage:[],injuries:[],playerHits:0,lastHitAt:0,position:null};}
export function chapterFor(n){return CHAPTERS.find(c=>c.id===n.chapter)||CHAPTERS[0];}
function factualDialogueLines(n,id,names={}){
 if(id==='wanderer')return ['我躲在树林边看了一会儿。那片雾像是在绕着路灯走。','等天亮，我想看看井边有没有新的脚印。'];
 const name=names.customs||'阿斯加德',c=chapterFor(n),result=n.results.at(-1);
 if(id==='customs'&&n.prologue==='arrival')return [`我是${name}，守着这座码头。你到得正好，天还没黑。`,'岛主不在，我先带你去他家安顿。沿这条路走，我会等你。'];
 if(id==='customs'&&n.prologue==='escort')return ['沿着主路走，别急着敲其他人的门。他们天黑前都在忙。','我会在主宅门口等你。先安顿，再说雾里的事。'];
 if(id==='customs'&&['house','houseReady'].includes(n.prologue))return ['窗边能看见码头。书桌上有一份公开的小岛档案，你可以先翻翻。','你看门前的木饰——不管多旧，晚上都不要搬走。'];
 if(id==='customs'&&n.prologue==='warning')return ['远方的旅人，雾要来了。晚上最好待在屋里。','若一定要出门，沿路找灯。靠近拨亮它，别回应雾里叫你名字的声音。','四盏守护灯都亮起来，那些东西就会退开。但井边……算了，天亮再说。'];
 if(n.phase==='morning'&&result){const outcome=result.outcome==='all'?'四盏灯都亮过。昨夜你守住了整条路。':result.outcome==='partial'?`昨夜 ${result.lamps.length} 盏灯护住了附近，远处的门饰仍被抓坏。`:'你在屋里活着等到了清晨。外面的旧物折了，有人受了伤。';return [outcome,id==='archive'?'井边的湿脚印穿过了灯区。我把这件事单独记下，不算作来访资料。':'先看看门前，再去作品小屋旁的雾中生物展区。有人在记录昨夜的轮廓。',c.clue,c.question];}
 if(n.phase==='fog')return ['别站在雾里听它说话。进屋，或者去灯下。',n.night?.dispelled?'它退了。可你听，井下的绳轮还在转。':'四盏灯要一起亮着。只守一盏，我们只能保住一小块地方。'];
 const specific={customs:'我检查过船绳，今晚没有船能离开。',archive:'我记的是人来过的事实；可另一本旧簿子，记着一些还没来的人。',curator:'我在修灯罩。灯芯没有烧坏，雾来时它却自己熄灭。',liaison:'这封没有邮戳的信，明明是昨晚锁在邮筒外面的。',specialist:'我在量雾走到哪里。它每天都知道灯的边界。',main:'书桌上有公开的岛屿档案；私人信件和工作记录仍锁着。'};
 return [n.dayHeard?.includes(c.id)?'你在井边听到的那件事，我还在核对。':specific[id]||'天黑之前，我得把门窗检查一遍。',c.sign,n.clues.includes(c.clue)?`我们已经查明：${c.clue}`:'我没亲眼见到全部，你可以问问其他人，也可以去现场看看。',c.question];
}
export function storyDoorAllowed(n,id,owner){return owner||n?.prologue==='complete'||id==='main'&&['escort','house','houseReady','warning'].includes(n?.prologue);}

// Chapter sheets are data: add forms here without changing chase/shelter rules.
CHAPTERS.forEach((c,i)=>{c.conditions={minCycle:i+1,afterClue:i?CHAPTERS[i-1].clue:null};c.dayEvent={from:600,to:900,location:'well',participants:c.roles,lines:[c.sign,'先把这件事记下，雾来时再核对。']};c.morning={all:`路灯守住了道路。${c.clue}`,partial:`灯下的旧物留下了，远处仍有抓痕。${c.clue}`,shelter:`居民清理门前时发现：${c.clue}`};c.explains=c.clue;c.leaves=c.question;});
export function selectNextChapter(n){const remaining=CHAPTERS.filter(c=>!n.used.includes(c.id));const eligible=remaining.filter(c=>n.number+1>=c.conditions.minCycle&&(!c.conditions.afterClue||n.clues.includes(c.conditions.afterClue)));return eligible[0]||remaining[0]||CHAPTERS[(CHAPTERS.findIndex(c=>c.id===n.chapter)+1)%CHAPTERS.length];}

export function dialogueLines(n,id,names={}){
 const r=STORY_RESIDENTS[id];if(!r)return factualDialogueLines(n,id,STORY_NAMES);
 if(id==='customs'&&n.prologue==='arrival')return [r.intro,'我是阿斯伽德，守着码头。岛主不在，先带你去他家安顿。走慢些，我有的是时间。'];
 const lines=factualDialogueLines(n,id,STORY_NAMES);
 const recent=n.combat?.recent?.[id];if(recent&&Date.now()-recent.at<20000)return [r.lines[(recent.count-1)%r.lines.length],...lines.slice(0,3)];
 if(n.phase==='fog')return [{customs:'先回灯下，旅人。天大的问题，等你不发抖了再问。',curator:'这是留白——我靠，留得也太白了。先找灯！',specialist:'呃，雾没有下班。我们……先去灯下做观察。',archive:'四盏灯。全部点亮。不要把推测当成安全。',liaison:'哥们，雾可不给你算加班费。回屋，或者去灯下。',main:'灯照得到的地方，才算路。',wanderer:'今天没安排。逃跑可以临时安排。'}[id],...lines.slice(1)];
 if(id==='customs'&&n.prologue!=='complete')return lines;
 if(n.phase==='morning')return [id==='curator'?(n.results.at(-1)?.outcome==='all'?'这灯光，果然有审美。你点的？好，那算我们共同创作。':'我昨晚不是躲，是给恐惧留一点创作空间。'):id==='specialist'?'呃，天亮了。昨晚的记录……这次没有跟我一起抖。':id==='liaison'?'还站着？行，今天不用往你门口送绷带了。':id==='archive'?'先核对昨夜实际点亮的灯，再下结论。':r.intro,...lines];
 return [r.intro,...lines.slice(1)];
}
