// Small authored mysteries; these observations never become real visitor data.
export function sceneObservation(id,count=1,chapter='antler'){
 const lines=id==='well'?[
  '你停在石井边。绳索垂着，井面平静，深处却传来三声很轻的敲击。',
  '你扶住绞盘，把木桶放低一点。绳子停了，井底的敲击却没有停。声音不像水滴。',
  '你朝井里问了一声。很久之后，下面又响了三下。光照不到那里，你仍不知道是什么在回应。',
  '你屏住呼吸。井底安静了一会儿，然后，那三声又来了。'
 ]:chapter==='tide'?[
  '邮局旁挂着一件蓝外衣和两块浅色布。天是晴的，蓝外衣的下摆却一直滴水。',
  '你拧了拧衣角。水落进接水盆，袖口很快又湿了。旁边两块布都是干的。',
  '你检查绳结和衣夹，上面没有漏水的东西。衣服为什么一直湿着，仍没有答案。'
 ]:[
  '邮局旁的木架上晾着外衣和方巾。衣夹扣得很紧，风一来，布料便轻轻摆动。',
  '你摸了摸衣角，今天已经干了。架子下留着一只接水盆。'
 ];
 return lines[Math.min(lines.length-1,Math.max(0,count-1))];
}
