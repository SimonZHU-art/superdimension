const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
export const dayMinute=t=>((t%1440)+1440)%1440;
export function daylightAt(time){const m=dayMinute(time);return smooth(300,450,m)*(1-smooth(1020,1200,m));}
export function weatherAt(time){return ['fog','sunny','rain','sunny','sunny','rain','fog','sunny'][Math.floor(time/240)%8]||'sunny';}
export const weatherNames={sunny:'晴天',rain:'下雨',fog:'起雾'};
export function mixColor(a,b,t){const rgb=s=>s.match(/\w\w/g).map(v=>parseInt(v,16));const aa=rgb(a.slice(1)),bb=rgb(b.slice(1));return `rgb(${aa.map((v,i)=>Math.round(v+(bb[i]-v)*clamp(t))).join(',')})`;}
