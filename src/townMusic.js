// Original score "灯下的小径", composed for this project, 2026-10-06.
// D major pentatonic plucked notes; no sampled or third-party music.
const MELODY=[74,78,81,78,76,74,69,71,74,76,78,81,83,81,78,76,74,71,69,71,74,78,76,74];
export function createTownMusic(ctx){
 const master=ctx.createGain(),filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2600;master.gain.value=0;master.connect(filter);filter.connect(ctx.destination);
 let cursor=0,next=ctx.currentTime+.1;
 function note(midi,time,length,level){const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=440*2**((midi-69)/12);g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(level,time+.012);g.gain.exponentialRampToValueAtTime(.0001,time+length);o.connect(g);g.connect(master);o.start(time);o.stop(time+length+.05);o.onended=()=>{o.disconnect();g.disconnect()};}
 return {update({volume,muted,indoors,night,fog=false}){master.gain.setTargetAtTime(muted?0:volume*.3,ctx.currentTime,.7);filter.frequency.setTargetAtTime(fog?950:indoors?1700:night?2100:2800,ctx.currentTime,1);if(next<ctx.currentTime)next=ctx.currentTime+.05;while(next<ctx.currentTime+.2){note(fog?MELODY[cursor%MELODY.length]-13:MELODY[cursor%MELODY.length],next,fog?2.6:1.7,fog?.12:.18);if(cursor%4===0){note([50,55,57,50][Math.floor(cursor/4)%4],next,2.8,.12);note([62,67,69,62][Math.floor(cursor/4)%4],next,2.1,.07);}cursor++;next+=fog?.95:.65;}}};
}
