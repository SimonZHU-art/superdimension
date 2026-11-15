// The island clock runs faster than real time. Long, staggered work periods leave
// enough time for a visit, while residents also spend time enjoying the island.
const CYCLE = 360;
const HOME_PERIOD = 240;
const routines = {
  main: {offset:0, home:'在家整理今天的见闻', place:'广场与银杏小径', activity:'沿着广场散步，看看银杏树影'},
  customs: {offset:40, home:'在登记处整理来访记录', place:'南岸码头', activity:'在码头检查小船的缆绳'},
  archive: {offset:180, home:'在档案馆整理档案袋', place:'林间小径', activity:'在林间找适合夹进书里的落叶'},
  curator: {offset:60, home:'在工坊整理作品与阅读卡片', place:'广场旁的花圃', activity:'在花圃观察颜色，给下一幅画找灵感'},
  liaison: {offset:140, home:'在邮局分拣信件', place:'海边小路', activity:'沿着海边散步，听风铃与海浪'},
  specialist: {offset:200, home:'在研究室整理项目线索', place:'溪水旁与观星小径', activity:'在溪水旁观察水流与石头'},
};

const minuteOfDay = value => ((Math.floor(Number.isFinite(value)?value:980)%1440)+1440)%1440;
const clockLabel = minute => `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;

export function residentPresence(id, gameMinutes=980, weather='sunny') {
  const routine=routines[id];
  if(!routine)return null;
  const minute=minuteOfDay(gameMinutes);
  const sleeping=minute>=1080||minute<360;
  const phase=(minute+routine.offset)%CYCLE;
  const shelter=weather==='rain'||(weather==='fog'&&routine.offset%3!==0);
  const atHome=sleeping||shelter||phase<HOME_PERIOD;
  const returnMinute=atHome?null:Math.min(minute+CYCLE-phase,1320);
  return {
    id, atHome, phase:sleeping?'evening':atHome?'working':'leisure',
    place:atHome?'家中':routine.place,
    activity:shelter?(weather==='rain'?'回屋避雨，在窗边整理资料':'在屋里等雾散去'):sleeping?'在灯下安静地整理今天的记录':atHome?routine.home:routine.activity,
    returnMinute,
    returnHint:atHome?'现在在家，可以走近按 E 交谈。':`正在${routine.place}，大约 ${clockLabel(returnMinute)} 回来。`,
  };
}

export const RESIDENT_IDS=Object.freeze(Object.keys(routines));
