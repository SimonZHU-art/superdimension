export function speechLines(text,measure,maxWidth){const lines=[];let line='';for(const char of text){if(line&&measure(line+char)>maxWidth){lines.push(line);line='';}line+=char;}if(line)lines.push(line);return lines;}
export function speechFrame(actor,camera,width,height,textWidth,lineCount,index=0){
 const w=Math.min(width-24,textWidth+16),h=lineCount*13+8;
 const left=Math.max(camera.x+8,Math.min(camera.x+width-w-8,actor.x-w/2));
 const top=Math.max(camera.y+52,Math.min(camera.y+height-h-42,actor.y-66-h-index*22));
 return {left,top,w,h,tailX:Math.max(left+6,Math.min(left+w-6,actor.x)),visible:actor.x>=camera.x-12&&actor.x<=camera.x+width+12&&actor.y>=camera.y&&actor.y<=camera.y+height+12};
}
