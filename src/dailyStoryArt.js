import {dailyObjects} from '../shared/dailyStories.js';

// Native-size props; they are temporary interactables, never permanent map furniture.
export function drawDailyObjects(c,daily,t){for(const o of dailyObjects(daily)){const {x,y,kind}=o;c.save();c.translate(x,y);c.fillStyle='rgba(65,75,43,.2)';c.beginPath();c.ellipse(0,3,16,5,0,0,Math.PI*2);c.fill();
 if(kind==='sand'){c.fillStyle='#e4c994';c.beginPath();c.moveTo(-22,4);c.lineTo(-13,-9);c.lineTo(0,-16);c.lineTo(15,-8);c.lineTo(23,4);c.fill();c.strokeStyle='#c0a66d';c.lineWidth=2;c.beginPath();c.moveTo(-12,-4);c.lineTo(7,-7);c.lineTo(14,-2);c.stroke();c.strokeStyle='#73684b';c.strokeRect(-8,-9,7,4);c.strokeRect(2,-9,7,4);}
 if(kind==='page'){c.rotate(Math.sin(t*1.5+x)*.05);c.fillStyle='#b19c6d';c.fillRect(-12,-15,25,18);c.fillStyle='#f5e7bd';c.fillRect(-11,-17,23,18);c.strokeStyle='#879b82';c.lineWidth=1;c.beginPath();c.moveTo(-7,-5);c.lineTo(-2,-12);c.lineTo(3,-8);c.lineTo(8,-13);c.stroke();}
 if(kind==='marker'){c.fillStyle='#b68d51';c.fillRect(-7,-13,14,15);c.fillStyle='#e1c481';c.fillRect(-5,-12,10,5);c.fillStyle='#67594a';c.fillRect(-1,-10,2,10);c.fillRect(-4,-4,8,2);}
 if(kind==='parcel'){c.fillStyle='#98784e';c.fillRect(-15,-16,30,20);c.fillStyle='#c6a273';c.fillRect(-15,-18,30,17);c.fillStyle='#e4d4a3';c.fillRect(-2,-18,3,21);c.fillRect(-15,-10,30,3);c.fillStyle='#768477';c.fillRect(5,-23,6,9);}
 if(kind==='rope'){c.strokeStyle='#baa171';c.lineWidth=4;for(let i=0;i<3;i++){c.beginPath();c.ellipse((i-1)*9,-8,11,7,i*.5,0,Math.PI*2);c.stroke();}c.beginPath();c.moveTo(-18,-7);c.lineTo(-25,5);c.moveTo(18,-8);c.lineTo(25,-3);c.stroke();}
 if(kind==='ripple'){c.strokeStyle='#c2a46b';c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.moveTo(-22,-12+i*5);c.bezierCurveTo(-8,-17+i*5,7,-5+i*5,23,-12+i*5);c.stroke();}}
 if(kind==='shell'){// The old mooring stump is the clue's visible geographic anchor.
  c.fillStyle='#876d4f';c.fillRect(18,-26,13,28);c.fillStyle='#b6996a';c.beginPath();c.ellipse(24,-26,8,4,0,0,Math.PI*2);c.fill();c.strokeStyle='#715c43';c.lineWidth=1;c.beginPath();c.ellipse(24,-26,4,2,0,0,Math.PI*2);c.stroke();c.fillStyle='#6d8d71';c.fillRect(20,-5,8,4);
  c.fillStyle='#e5cfac';c.beginPath();c.moveTo(0,2);c.lineTo(-11,-7);c.quadraticCurveTo(0,-21,11,-7);c.closePath();c.fill();c.strokeStyle='#b49e7c';c.lineWidth=1;for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(0,1);c.lineTo(i*4,-11);c.stroke();}}
 if(o.observed){c.strokeStyle='#789773';c.lineWidth=1;c.beginPath();c.moveTo(-5,8);c.lineTo(-1,11);c.lineTo(6,5);c.stroke();}
 c.restore();}}
export function drawDailyGesture(c,a,t){if(!a.dailyAction||a.moving)return;const {x,y}=a,beat=Math.sin(t*3);c.save();c.strokeStyle=a.skin||'#dfbf91';c.lineWidth=3;c.lineCap='round';
 if(a.dailyAction==='point'||a.dailyAction==='argue'){c.beginPath();c.moveTo(x+6,y-19);c.lineTo(x+17,y-25+(a.dailyAction==='argue'?beat*3:0));c.stroke();}
 if(a.dailyAction==='search'){c.fillStyle='#c5aa76';c.fillRect(x+9,y-13+beat*2,10,7);c.strokeStyle='#eedbbb';c.beginPath();c.moveTo(x+6,y-19);c.lineTo(x+14,y-12+beat*2);c.stroke();}
 if(a.dailyAction==='give'){c.fillStyle='#eee1b9';c.fillRect(x+10,y-19,8,5);c.beginPath();c.moveTo(x+6,y-17);c.lineTo(x+15,y-17);c.stroke();}
 if(a.dailyAction==='shrug'){c.beginPath();c.moveTo(x-6,y-19);c.lineTo(x-13,y-22-beat);c.moveTo(x+6,y-19);c.lineTo(x+13,y-22-beat);c.stroke();}c.restore();}
