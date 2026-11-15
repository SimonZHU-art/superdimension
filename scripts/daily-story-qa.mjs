// Disposable local acceptance scene. Never opens the main or voyage-demo database.
import {fileURLToPath} from 'node:url';
import {createApp} from '../server/index.mjs';
import {newLife} from '../server/life.mjs';
import {DailyDirector} from '../server/dailyDirector.mjs';
import {authoredDaily} from '../shared/dailyStories.js';
const flags=process.argv.slice(2),real=flags.includes('--deepseek');
const modelEnv=real?Object.fromEntries(['MODEL_PROVIDER','DEEPSEEK_API_KEY','DEEPSEEK_MODEL','MODEL_TIMEOUT_MS'].filter(k=>process.env[k]).map(k=>[k,process.env[k]])):{};
const app=await createApp({dataPath:fileURLToPath(new URL('../.data/daily-story-qa.sqlite',import.meta.url)),env:{...modelEnv,NODE_ENV:'development',OWNER_PASSWORD:'daily-story-fixture',PORT:'8794',QUEUE_INTERVAL_MS:'0'}});
const day=2,which=flags.find(f=>f.startsWith('--story='))?.slice(8)||'glasses';
if(flags.includes('--seed')||!app.store.read('fixture','daily-qa')){
 const s=newLife();s.narrative.prologue='complete';s.narrative.phase='day';s.narrative.number=day;s.narrative.known=['customs','main','archive','curator','liaison','specialist'];s.narrative.doors=[...s.narrative.known,'gallery','meeting','industry','museum'];s.narrative.position={x:1020,y:495,room:null};s.minutes=480;s.materials=200;s.facility='healthy';s.boat={blueprint:true,stage:3,screws:16,status:'ready',version:0,requests:{},claims:[],draft:null,journey:null};
 const director=new DailyDirector(app.store,{env:modelEnv,fetchImpl:fetch},app.domain.config().islandId);
 let record;if(real&&which==='glasses'){record=await director.prepare(day);console.log(JSON.stringify({story:record.skeleton,source:record.source,reason:record.reason||null}));}else{record={id:director.key(day),day,skeleton:which,source:'authored',frozen:true,pack:authoredDaily(which),attempts:1};app.store.write('daily-packs',record.id,record);}
 director.sync(s);app.store.write('life','owner',s);app.store.write('fixture','daily-qa',{day,story:which});await director.close();
}
app.server.listen(8794,'::1',()=>console.log('daily story acceptance http://[::1]:8794/ (isolated fixture)'));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0)});
