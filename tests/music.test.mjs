import test from 'node:test';
import assert from 'node:assert/strict';
import {createTownMusic} from '../src/townMusic.js';
test('one score scheduler crossfades music independently without replaying notes on every frame',()=>{
 const gains=[],starts=[];const param=()=>({value:0,events:[],setValueAtTime(v,t){this.events.push([v,t])},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(v,t,k){this.events.push([v,t,k])}});
 const ctx={currentTime:0,destination:{},createGain(){const g={gain:param(),connect(){},disconnect(){}};gains.push(g);return g},createBiquadFilter(){return {frequency:param(),connect(){}}},createOscillator(){return {frequency:param(),connect(){},disconnect(){},start(t){starts.push(t)},stop(){}}}};
 const music=createTownMusic(ctx);music.update({volume:.4,muted:false,indoors:false,night:false});const count=starts.length;assert.ok(count>0);music.update({volume:.4,muted:false,indoors:true,night:true});assert.equal(starts.length,count);
 music.update({volume:.4,muted:true,indoors:true,night:true});assert.equal(gains[0].gain.events.at(-1)[0],0);
 ctx.currentTime=1;music.update({volume:.4,muted:false,indoors:false,night:false});assert.ok(starts.length>count);assert.ok(gains[0].gain.events.at(-1)[2]>0,'gain transitions use a ramp');
});
