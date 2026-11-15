// Disposable acceptance data only; does not read .env or open either user island.
import {fileURLToPath} from 'node:url';
import {createApp} from '../server/index.mjs';
import {newLife} from '../server/life.mjs';
import {authoredDaily,DAILY_RULES} from '../shared/dailyStories.js';
import {DailyDirector} from '../server/dailyDirector.mjs';
const flags=process.argv.slice(2),story=flags.find(f=>f.startsWith('--story='))?.slice(8)||'sandmarks';
const app=await createApp({dataPath:fileURLToPath(new URL('../.data/daily-autonomy-qa.sqlite',import.meta.url)),env:{NODE_ENV:'development',OWNER_PASSWORD:'daily-autonomy-fixture',PORT:'8794',QUEUE_INTERVAL_MS:'0'}});
if(flags.includes('--seed')||!app.store.read('fixture','autonomy-v017')){
 const s=newLife();s.narrative.prologue='complete';s.narrative.phase='day';s.narrative.number=2;s.narrative.known=['customs','main','archive','curator','liaison','specialist'];s.narrative.doors=[...s.narrative.known,'gallery','meeting','industry','museum'];s.narrative.position=flags.includes('--south')?{x:835,y:720,room:null}:{x:1040,y:540,room:null};s.minutes=Number(flags.find(f=>f.startsWith('--minute='))?.slice(9)||480);s.materials=40;s.facility='healthy';s.boat={blueprint:true,stage:1,screws:2,status:'building',version:0,requests:{},claims:[]};
 const d=new DailyDirector(app.store,{},app.domain.config().islandId);app.store.write('daily-packs',d.key(2),{id:d.key(2),day:2,schema:DAILY_RULES.schema,skeleton:story,source:'authored',frozen:true,pack:authoredDaily(story),attempts:1});d.sync(s);app.store.write('life','owner',s);app.store.write('fixture','autonomy-v017',{story,disposable:true});await d.close();
}
app.server.listen(8794,'::1',()=>console.log('Disposable resident-life acceptance: http://[::1]:8794/'));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0)});
