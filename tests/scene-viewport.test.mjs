import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneViewport,roomView,scenePoint} from '../src/sceneViewport.js';
test('portrait and landscape scenes fill the viewport with one uniform pixel scale',()=>{
 for(const [w,h] of [[805,977],[1280,720],[375,812],[1920,1080]]){
  const v=sceneViewport(w,h);assert.ok(v.zoom>=1.55);
  assert.ok(Math.abs(v.width*v.zoom-w)<=v.zoom/2);assert.ok(Math.abs(v.height*v.zoom-h)<=v.zoom/2);
 }
});
test('clicks use the exact rendering transform outdoors and inside a zoomed room',()=>{
 for(const view of [{zoom:1,offsetX:-336,offsetY:-190},roomView(519,630),roomView(825,465,true)]){
  const world={x:485,y:353};const screen={x:world.x*view.zoom+view.offsetX,y:world.y*view.zoom+view.offsetY};
  const point=scenePoint(screen.x,screen.y,view);assert.ok(Math.abs(point.x-world.x)<1e-9);assert.ok(Math.abs(point.y-world.y)<1e-9);
 }
});
