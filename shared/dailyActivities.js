// Authored, executable geography. No model output or player task flags choose a route.
const p=(x,y,label)=>({x,y,label});
const job=(at,place,action,activity)=>({at,place,action,activity});
const line=(speaker,action,text)=>({speaker,action,text});
const meeting=(id,from,start,to,place,actors,lines)=>({id,from,start,to,place,actors,lines,turnMinutes:12});
export const DAILY_LIFE={
 glasses:{places:{atelier:p(947,381,'工坊门前'),road:p(940,480,'工坊西侧的大路'),shore:p(1110,745,'南岸沙滩'),post:p(1086,705,'邮局门前'),round:p(1020,550,'邮局到广场的路上')},activities:{
  curator:[job(480,'atelier','search','核对画具和眼镜盒'),job(565,'road','search','沿大路找掉下的东西'),job(665,'atelier','search','回工坊检查画夹'),job(720,'shore','search','比对沙堆与鞋印'),job(815,'atelier','give','整理画具，留出交还眼镜的空盒'),job(895,'road','point','查看路边留下的脚印'),job(965,'atelier','give','收画具，准备检查门窗')],
  liaison:[job(480,'post','give','分拣今天的信'),job(560,'road','shrug','送信经过工坊'),job(665,'round','give','继续沿路送信'),job(740,'shore','search','巡看藏眼镜的沙堆'),job(815,'post','give','回邮局更正地址'),job(915,'shore','search','检查涨潮前的沙滩'),job(985,'post','give','收好信，准备过夜')]},
  encounters:[meeting('road-argument',570,600,655,'road',['curator','liaison'],[line('curator','argue','你鞋里的沙，比我画里的海还多。眼镜呢？'),line('liaison','shrug','先别看我。南岸新沙堆有我的鞋印，你问问海。'),line('curator','point','我先回工坊查画夹。你继续送信，别把我的眼镜寄走。')]),meeting('shore-check',735,765,810,'shore',['curator','liaison'],[line('curator','search','这堆沙倒认得你。'),line('liaison','point','找齐就交给你。天黑前我还得去邮局。')])]},
 drawings:{places:{atelier:p(947,381,'工坊门前'),road:p(880,480,'广场东侧的大路'),garden:p(910,547,'东路花圃'),shore:p(982,742,'南岸风口'),post:p(1086,705,'邮局门前')},activities:{
  curator:[job(480,'atelier','give','整理画夹，准备画海'),job(540,'road','search','沿风吹的方向找纸'),job(660,'garden','search','在花圃边查看纸角'),job(750,'atelier','give','回工坊整理已收好的画具'),job(825,'shore','search','沿南岸看风向'),job(910,'atelier','give','给画稿留出空画夹'),job(980,'road','search','最后检查路边'),job(1030,'atelier','give','扣紧画夹，准备过夜')],
  liaison:[job(480,'post','give','分拣信件'),job(570,'road','point','投递经过，拦住一张散页'),job(660,'post','give','继续送信'),job(790,'garden','search','查看被花枝拦住的纸角'),job(880,'post','give','回邮局分拣回信'),job(970,'road','give','把漏下的纸边带回工坊'),job(1030,'post','give','收好邮袋')]},
  encounters:[meeting('wind-pages',570,600,655,'road',['curator','liaison'],[line('curator','argue','风也鉴赏画？能不能先买票再拿！'),line('liaison','point','我压住一角。三张散页在大路、东路花圃和南岸风口。'),line('curator','give','你继续送信。我去花圃，再回工坊整理画夹。')])]},
 marker:{places:{lab:p(1200,290,'研究室门前'),creek:p(1235,302,'研究室这一侧的溪岸'),bridge:p(1185,372,'木桥南端'),north:p(879,191,'北岸小径')},activities:{
  specialist:[job(480,'lab','search','核对铜标记盒'),job(545,'creek','search','比对溪岸记录'),job(580,'bridge','search','过桥核对南岸刻痕'),job(665,'lab','give','回研究室核对刻痕'),job(770,'creek','search','记录水位'),job(845,'lab','give','整理纸页，等待有线索的人'),job(970,'creek','point','最后核对水位'),job(1020,'lab','give','收仪器，准备过夜')],
  customs:[job(480,'north','search','巡看北岸绳索'),job(555,'bridge','search','检查桥南端的栏绳'),job(665,'north','search','继续巡岸'),job(830,'bridge','point','检查木桥通路'),job(930,'north','search','收起绳头'),job(1020,'bridge','point','看天色，准备检查灯')]},
  encounters:[meeting('bridge-mark',570,600,655,'bridge',['specialist','customs'],[line('specialist','search','四枚铜标记，盒里只有三枚。'),line('customs','point','桥南端的栏绳旁有一枚沾水铜片。别踩进溪里。'),line('specialist','give','我回研究室门前核对刻痕。找到后也可以在路上交给我。')])]},
 bookmark:{places:{library:p(488,372,'档案馆东侧门前'),road:p(510,485,'档案馆南侧路口'),post:p(1086,705,'邮局门前'),libraryPath:p(510,392,'档案馆旁的小径')},activities:{
  archive:[job(480,'library','give','核对借阅记录'),job(570,'road','search','查看送件地址'),job(665,'library','give','回馆整理书页'),job(770,'post','search','亲自核对包裹外的贴纸'),job(870,'library','give','在档案馆门前整理记录'),job(970,'libraryPath','give','收好书，检查门边湿鞋')],
  liaison:[job(480,'post','search','检查误送包裹'),job(550,'road','give','沿路核对收件人'),job(665,'post','give','回邮局改地址'),job(800,'road','give','继续送信'),job(900,'post','give','把回信放进信格'),job(1030,'post','give','收起邮袋')]},
  encounters:[meeting('wrong-address',570,600,655,'road',['archive','liaison'],[line('archive','point','混子，记录里的收件人不是我。请核对。'),line('liaison','shrug','字认得，方向认错了。书签夹在邮局门边包裹的绳结里。'),line('archive','give','别拆信。书签带回给我；我先回馆整理书页。')])]},
 rope:{places:{dock:p(785,162,'北岸船台左侧'),north:p(864,165,'北岸木料旁'),sketch:p(879,191,'北岸小径'),bridge:p(1185,372,'木桥南端'),lab:p(1200,290,'研究室门前')},activities:{
  customs:[job(480,'dock','search','检查缆绳松紧'),job(565,'north','search','清理木料旁的通路'),job(665,'dock','search','从外侧试着松开绳头'),job(770,'north','point','巡看船台周围'),job(855,'dock','give','检查理好的绳圈'),job(970,'north','search','巡岸，收起多余绳头'),job(1030,'dock','give','收绳，准备检查灯')],
  specialist:[job(480,'lab','give','核对图上的箭头'),job(540,'sketch','search','带着草图来到北岸'),job(665,'sketch','give','在小径上简化解法'),job(780,'bridge','search','顺路测水位'),job(870,'lab','give','回研究室改草图'),job(1010,'lab','give','收记录纸')]},
  encounters:[meeting('rope-theory',570,600,655,'north',['customs','specialist'],[line('specialist','point','三个交叉。理论上四步……也可能两步。'),line('customs','search','先松外侧绳头。就在船台左边，不必把结搬到图上。'),line('specialist','shrug','嗯。我去小径上改图，你慢慢解。')])]},
 sandmarks:{places:{lab:p(1200,285,'研究室门前的空地'),bridge:p(1185,372,'木桥南端'),shore:p(810,762,'南岸潮线'),west:p(835,757,'南岸干沙'),north:p(879,191,'北岸旧木桩旁'),atelier:p(947,381,'工坊门前'),record:p(1214,292,'研究室旁的记录处')},activities:{
  specialist:[job(480,'lab','give','核对潮汐表'),job(515,'shore','search','到南岸看潮位'),job(665,'bridge','search','离开南岸，去桥边比对记录'),job(775,'lab','give','过桥回研究室门前整理纸页'),job(905,'record','give','比对两岸的纹距'),job(985,'lab','give','整理潮汐记录，准备过夜')],
  curator:[job(480,'atelier','give','整理画本和画笔'),job(545,'shore','point','从工坊来到南岸写生'),job(665,'atelier','give','回工坊收拾画具'),job(820,'west','search','再到南岸看看涨潮线'),job(905,'atelier','give','把海的线条画进画本'),job(1010,'atelier','give','收画本，准备检查门窗')],
  customs:[job(480,'north','search','检查北岸旧木桩'),job(635,'north','point','记录退潮露出的痕迹'),job(710,'bridge','search','巡看木桥通路'),job(810,'lab','point','到研究室附近询问记录'),job(895,'north','search','回北岸查看涨潮'),job(1000,'bridge','point','检查桥边，准备守灯')]},
  encounters:[meeting('south-north-clue',555,600,655,'shore',['specialist','curator'],[line('curator','point','北岸那枚贝壳长牙了。我宣布，它欠我肖像权。'),line('specialist','search','呃，是齿缘。北岸船台右边，旧木桩靠海那侧。'),line('curator','give','南岸沙纹也记上。我先回工坊；你去桥边核对。')]),meeting('lab-record',810,840,890,'lab',['specialist','customs'],[line('customs','point','北岸的痕迹，和南岸一样吗？'),line('specialist','give','先比对两岸沙纹，再看北岸木桩旁的带齿贝壳。'),line('customs','shrug','你整理记录。我回北岸看潮水，夜里再看灯。')])]}
};

export function activityAt(daily,id,minutes=daily?.clockMinutes??780){
 const life=DAILY_LIFE[daily?.skeleton],m=((minutes%1440)+1440)%1440;
 if(!life||daily.phase==='ended'||m>=1080)return null;
 const activities=life.activities[id];if(!activities)return null;
 let index=Math.max(0,activities.findLastIndex(a=>a.at<=m));
 // When a conversation ends early, leave for the next job rather than standing
 // on the rendezvous marker until a coarse phase boundary.
 for(const e of life.encounters){if(m>=e.start&&['finished','missed'].includes(daily.performance?.encounters?.[e.id]?.status)&&e.actors.includes(id)){
  const next=activities.findIndex(a=>a.at>=e.to);if(next>=0&&m<activities[next].at)index=next;
 }}
 const job=activities[index];
 return {...job,index,goal:life.places[job.place],until:activities[index+1]?.at??1080};
}
export function activeMeeting(daily,minutes=daily?.clockMinutes??780){
 const m=((minutes%1440)+1440)%1440;
 return DAILY_LIFE[daily?.skeleton]?.encounters.find(e=>m>=e.from&&m<e.to&&!['finished','missed'].includes(daily.performance?.encounters?.[e.id]?.status))||null;
}
export function activityHint(daily,id,minutes=daily?.clockMinutes??780){
 const activity=activityAt(daily,id,minutes);if(!activity)return '天色暗下来，他正在收东西准备过夜。';
 const e=activeMeeting(daily,minutes),place=e?.actors.includes(id)?DAILY_LIFE[daily.skeleton].places[e.place]:activity.goal;
 const p=daily.actorPositions?.[id],travel=p&&Math.hypot(p.x-place.x,p.y-place.y)>10;
 return `${travel?'正沿路前往':'在'}${place.label}，${activity.activity}。`;
}
export function authoredEncounters(id){return DAILY_LIFE[id].encounters.map(e=>({id:e.id,lines:e.lines.map(l=>({...l}))}));}
