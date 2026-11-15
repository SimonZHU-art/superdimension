import {buildingLabel} from './worldData.js';
export const roles={main:{name:'云舟',role:'岛主的主 Agent',place:'云舟的家',color:'#68846b',hair:'#4a3b31',icon:'person',greeting:'欢迎来到云汀。沿着石板路慢慢走吧，岛上的每个人，都有自己的故事。',action:'了解岛主',description:'我保管岛主允许公开的介绍。想了解他的经历或作品，可以问我；涉及新的合作决定，需要由他本人回答。'},customs:{name:'阿渡',role:'海关 Agent',place:'码头登记处',color:'#7494a6',hair:'#77533e',icon:'compass',greeting:'不用赶路。你可以先逛逛，等想把自己的故事留下来，再来找我。',action:'登记来访',description:'登记是自愿的。你交给我的资料，会交由岛上的居民各自整理；游客参观无需登记。'},archive:{name:'知墨',role:'档案官',place:'林间档案馆',color:'#af7956',hair:'#543e35',icon:'book',greeting:'纸页晒过太阳，会有松木的味道。故事再长，也要先找到第一页。',action:'交谈与补充资料',description:'我整理访客的身份、经历、项目与能力，逐项标明资料来源、访客自述和待核实事项。资料少时留下缺口，不替访客编造履历。'},curator:{name:'织夏',role:'策展人',place:'织夏的工坊',color:'#b27b8c',hair:'#623e32',icon:'spark',greeting:'你看，窗台上的光每天都不一样。认识一个人，也不一定要从最显眼的地方开始。',action:'交谈与补充资料',description:'我根据岛主的关注方向和阅读偏好，从访客资料中挑出值得先看的内容，并解释理由。没有明显相关内容时如实说明，完整资料仍可回看。'},liaison:{name:'小邮',role:'联络官',place:'风铃邮局',color:'#739567',hair:'#895c35',icon:'mail',greeting:'今天风向正好，信件走得很快。不过，写给谁、写些什么，要由你来决定。',action:'写一封联系邮件',description:'我寻找双方值得交流的共同点、互补点和待确认问题，也协助整理联系邮件。交流建议不代表合作承诺；邮件须由访客检查、验证回复邮箱并确认后寄出。'},specialist:{name:'星禾',role:'专项研究员',place:'星禾的研究室',color:'#9b93b5',hair:'#49444e',icon:'leaf',greeting:'世界很大，兴趣是一扇小窗。告诉我，你最近在认真研究什么？',action:'交谈与补充资料',description:'我只围绕岛主指定的专题，分析访客相关的项目、经验和方法，提出可继续追问的问题。未设置专题或缺少相关资料时如实说明，不凭空作专业判断。'}};
roles.wanderer={name:'松果',role:'岛上闲逛的朋友',place:'松果的小岛日常',color:'#b98354',hair:'#605b3c',icon:'leaf',greeting:'我刚去树林给松果排了个队。风一吹，它们全都插队了。',description:'有时在树林捡松果，有时去海边研究浪花。不接工作，只认真过岛上的小日子。'};

export const residentLifeDialogues={
 main:[
  '今天想沿海岸走一圈。遇见你，就多绕一段路。',
  '云舟家窗台上那片叶子，是风替我送来的。先让它住着吧。',
  '刚才那位漫游的朋友说，海里的石头会打呼噜。我想去听听。',
  '黄昏的时候，广场的影子会一直伸到长椅旁。坐一会儿再走？',
 ],
 customs:[
  '刚有一艘小船经过。我挥了挥手，船上的人也朝我挥手。',
  '阿渡今天把码头的木板擦干了。浪花马上又来盖章。',
  '小邮说，等潮水退了，一起去捡一枚像月亮的贝壳。',
  '远处那盏灯一闪一闪的。大概是在和这里的风铃打招呼。',
 ],
 archive:[
  '这本书读到一半，风把书签吹走了。我就跟着它进了树林。',
  '知墨藏书里夹着一枚银杏叶。翻到那页，就像又走了一趟秋天。',
  '海边那位朋友坚持说，每枚松果都有自己的名字。我还在努力记。',
  '树下很适合读书。猫睡在旁边，负责检查我有没有翻页太响。',
 ],
 curator:[
  '今天海水的颜色，和昨天调出来的蓝差一点点。我要再看一会儿。',
  '织夏的窗台多开了一朵花。它挑的颜色，比我想的大胆。',
  '星禾借走了我一支紫色铅笔，说想画昨晚没看清的那颗星。',
  '如果给风画一幅画像，我想先画被它吹歪的帽子。',
 ],
 liaison:[
  '今天的风铃响得很轻，像有人在门口犹豫着要不要敲门。',
  '小邮刚把一张明信片晾在窗边。风读完了，才轮到我。',
  '阿渡答应教我绑船结。我答应教他把蝴蝶结系得像蝴蝶。',
  '晚饭前想去广场走走。路上遇见谁，就聊聊今天的天气。',
 ],
 specialist:[
  '昨晚望远镜里飘过一片叶子。我差一点给它起了个星星的名字。',
  '星禾今天在海边等月亮。它还没来，海鸥倒先来坐了一会儿。',
  '织夏送来一支紫色铅笔。画星空前，我先给猫画了一顶小帽子。',
  '沙滩上这排小脚印，是谁昨夜去看海了呢？跟着走走看。',
 ],
 wanderer:[
  '我刚给松果排了个队。风一吹，它们又开始插队了。',
  '这块石头很像面包。我闻过了，暂时不能开饭。',
  '我在和浪花玩躲猫猫。它们每次回来，都假装没见过我。',
  '今天的计划是没有计划。现在进行得非常顺利。',
 ],
};

export const residentHomeGreetings={
 main:'云舟在屋里。走到中央书桌前按 E，可以了解岛主的公开介绍。',
 customs:'阿渡在登记台旁。走到中央书桌前按 E，开始来访登记或查看码头记录。',
 archive:'知墨正在书架旁翻书。走到中央书桌前按 E，打开整理好的档案。',
 curator:'织夏在工作台旁。走到中央书桌前按 E，看看她准备好的内容。',
 liaison:'小邮在写信桌旁。走到中央书桌前按 E，处理联络与写信。',
 specialist:'星禾在研究台旁。走到中央书桌前按 E，看看她整理的项目线索。',
 wanderer:'小岛的漫游伙伴正坐在屋里发呆。走到他面前按 E，听听今天的小故事。',
};

export const roleLabels={archivist:'档案官',archive:'档案官',curator:'策展人',liaison:'联络官',specialist:'专项研究员'};
export const statusLabels={queued:'等待整理',running:'正在整理',succeeded:'已完成',failed:'处理失败',cancelled:'已取消',draft:'草稿',sending:'正在寄出',sent:'已提交邮件服务',failed_delivery:'投递失败',uncertain:'发送状态待核实',pending:'等待岛主',accepted:'已接受',rejected:'未接受'};
export const stories=[{title:'一封没有署名的信',hint:'听听阿渡为什么一直望着邮局。',npc:'customs',line:'昨天有人在码头留下一封没有署名的信。我想先登记，织夏却说，一封信也许只是想被听见。你愿意替我去问问她吗？',choice:'我去听听织夏的想法',next:'去工坊找织夏，听听另一种答案。'},{title:'先听见，再认识',hint:'织夏的工坊亮着灯。',npc:'curator',line:'阿渡总怕故事被弄丢，我懂他。可我想先把这封信放在窗边，让写信的人知道：我们愿意听。你能把这个想法带给他吗？',choice:'把她的想法带回码头',next:'回到码头，把这个想法告诉阿渡。'},{title:'留一盏灯',hint:'回码头，把两个人的想法连起来。',npc:'customs',line:'也许她说得对。我们可以先留一盏灯，等对方愿意，再记下他的名字。谢谢你。以后每一个旅人，都能先在这里歇一歇。',choice:'一起把码头的灯点亮',next:'码头的灯为每个愿意停留的人亮着。'}];

export function personalizedRoles(names={}) {
 return Object.fromEntries(Object.entries(roles).map(([id,role])=>[id,{...role,name:names[id]||role.name,place:id==='wanderer'?role.place.replace(role.name,names[id]||role.name):buildingLabel(id,names)||role.place}]));
}
export function personalizedStoryText(text,names={}) {
 const byName=Object.fromEntries(Object.entries(roles).map(([id,role])=>[role.name,names[id]||role.name]));
 return text.replace(/云舟|阿渡|知墨|织夏|小邮|星禾/g,name=>byName[name]);
}


export const roleGuides = {
 archive: {
  title:'先把资料整理清楚',
  purpose:'回答「这个人提供了什么资料，有哪些可以追溯的经历与能力？」',
  input:'访客自愿登记的介绍、上传材料和岛上补充交流。',
  output:'按身份、经历、项目、能力与当前方向整理；区分访客自述、材料事实、系统推断和未确认项，并保留来源。',
  missing:'资料少也可以整理，会列出缺少的信息与需要补充的问题，不编造经历。',
  example:'访客提到一个数据项目，我会记下目标、负责的工作与已有成果；没提供链接或成果证据的部分标为待核实。',
 },
 curator: {
  title:'帮岛主决定先看什么',
  purpose:'回答「按照岛主的关注和阅读偏好，这份资料里哪些内容值得优先阅读，为什么？」',
  input:'访客原始资料，以及岛主设置的关注方向、阅读重点、暂不关注内容和表达偏好。',
  output:'提炼优先阅读的亮点、选择理由与相关程度；完整原始资料保留，略过的内容仍可回看。',
  missing:'没有匹配内容时说明相关性有限；不会为了迎合岛主，把普通经历夸大成亮点。',
  example:'岛主关注 AI 工作流，我会优先呈现访客真实提供的自动化项目，并说明它与关注方向的联系。',
 },
 liaison: {
  title:'寻找值得继续交流的问题',
  purpose:'回答「双方有什么共同点或互补点，下一步值得聊什么？」',
  input:'访客的来访目的、经历与交流内容，以及岛主允许本岛 Agent 使用的背景和关注方向。',
  output:'提供联系理由、可能的交流方向与待确认问题。写信台另行整理可编辑邮件，访客确认后才寄出。',
  missing:'资料不足时提出需要询问的问题；不假定双方愿意合作，也不替真人决定费用或档期。',
  example:'双方都提到数据分析，我会建议确认具体需求与各自经验；这只是交流建议，合作由本人决定。',
 },
 specialist: {
  title:'围绕一个专题继续研究',
  purpose:'回答「在岛主指定的专题里，访客有哪些相关经验、方法与值得进一步核实的线索？」',
  input:'岛主在「个人过滤器」设置的专项研究主题，以及访客提供的相关原始资料。',
  output:'围绕该专题给出有来源的发现、相关理由、疑问和下一步追问建议。当前只分析岛内获准资料，不联网查证。',
  missing:'未设置专题或没有相关信息时，正常说明无相关发现或资料不足，不据此判断访客能力差。',
  example:'专题设为机器学习时，我会关注访客实际提供的模型方法、数据与评估结果，并指出还缺哪些验证材料。',
 },
};
roleGuides.archivist = roleGuides.archive;
