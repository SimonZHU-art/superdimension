// Authored Web Audio: proximity breathing, low pulses, creature calls and impact.
export function createFogSound(ctx){
 let next=0,nextWell=0,nextBreath=0,nextCall=0;
 const master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
 function tone(freq,duration,gain,pan=0,end=freq,type='sine',delay=0){
  const o=ctx.createOscillator(),g=ctx.createGain(),p=ctx.createStereoPanner();const t=ctx.currentTime+delay;
  o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(15,end),t+duration);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  p.pan.value=Math.max(-1,Math.min(1,pan));o.connect(g);g.connect(p);p.connect(master);o.start(t);o.stop(t+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();p.disconnect()};
 }
 function breath(gain,duration){
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),samples=buffer.getChannelData(0);
  for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/samples.length);
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();source.buffer=buffer;filter.type='bandpass';filter.frequency.value=780;filter.Q.value=.7;g.gain.value=gain;
  source.connect(filter);filter.connect(g);g.connect(master);source.start();source.onended=()=>{source.disconnect();filter.disconnect();g.disconnect()};
 }
 return {
  combat(kind,volume){if(!volume)return;master.gain.setTargetAtTime(volume*.35,ctx.currentTime,.01);if(kind==='heavy'){tone(95,.55,.9,0,26);breath(.35,.15);}else if(kind==='shield'){tone(620,.4,.3,0,350);tone(930,.25,.2,0,650);}else if(kind==='drop'){tone(380,.1,.3,0,130);}else if(kind==='miss')breath(.3,.15);else{tone(230,.18,.5,0,90);tone(650,.1,.15,0,320);}},
  impact(volume){if(!volume)return;master.gain.setTargetAtTime(volume*.38,ctx.currentTime,.015);tone(120,.55,1,0,32);tone(72,.65,.75,0,24);breath(.45,.16);},
  update({volume,fog,form,indoors,pan=0,steps=false,wellNear=false,wellPan=0,threat=0}){
   const danger=indoors?0:Math.max(0,Math.min(1,threat)),t=ctx.currentTime;
   master.gain.setTargetAtTime(volume*(fog?.16+danger*.22:.08),t,.3);
   if(!volume)return;
   if(danger>.05&&t>nextBreath){nextBreath=t+1.45-danger*.85;breath(.35+danger*.6,.32);tone(65,.19,.25+danger*.4,0,40);}
   if(danger>.35&&t>nextCall){nextCall=t+3.5;const f={antler:92,tide:126,paper:245,lantern:175,doll:150,shell:78}[form]||100;tone(f,.6,.45,pan,f*.65,'triangle');}
   if(wellNear&&t>nextWell){nextWell=t+9;for(const delay of [0,.43,.97])tone(140,.28,.22,wellPan,74,'sine',delay);}
   if(t<next||!fog&&!steps)return;next=t+(steps?.6:2.8);
   const freq={antler:105,tide:170,paper:310,lantern:230,doll:85,shell:390}[form]||120;
   tone(freq*(steps?1.6:1),.45,indoors?.12:.3,pan,freq*.8,form==='paper'?'triangle':'sine');
  }
 };
}
