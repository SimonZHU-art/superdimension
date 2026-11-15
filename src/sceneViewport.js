export function sceneViewport(width,height){
 const zoom=Math.max(1.55,Math.min(2,width/1000,height/650));
 return {width:Math.max(1,Math.round(width/zoom)),height:Math.max(1,Math.round(height/zoom)),zoom};
}
export function roomView(width,height,conversation=false){
 const zoom=Math.min(width/700,height/540,1.2)*(conversation?1.08:1);
 return {zoom,offsetX:width/2-485*zoom,offsetY:height/2-330*zoom};
}
export function scenePoint(x,y,view){
 return {x:(x-view.offsetX)/view.zoom,y:(y-view.offsetY)/view.zoom};
}
