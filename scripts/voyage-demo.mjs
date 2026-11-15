// Local fixture: separate persistent database, test login and no mail credentials.
// Optional --deepseek copies only configured model variables; no model call occurs until the UI selects real analysis.
import {createApp} from '../server/index.mjs';
import {newLife} from '../server/life.mjs';
import {fileURLToPath} from 'node:url';
const modelEnv=process.argv.includes('--deepseek')?{MODEL_PROVIDER:'deepseek',DEEPSEEK_API_KEY:process.env.DEEPSEEK_API_KEY,DEEPSEEK_MODEL:process.env.DEEPSEEK_MODEL}:{};
// Never inherit DATA_PATH from the main island's .env.
const app=await createApp({dataPath:fileURLToPath(new URL('../.data/voyage-demo.sqlite',import.meta.url)),env:{...modelEnv,DAILY_STORIES_ENABLED:'0',NODE_ENV:'development',OWNER_PASSWORD:'voyage-fixture-only',PORT:'8792'}});
if(!app.store.read('fixture','voyage-initialized')){
app.store.transaction(()=>{
const s=newLife();s.materials=100;s.boat={blueprint:true,stage:3,screws:6,claims:[],version:0,requests:{},status:'ready',draft:null,journey:null};s.narrative.prologue='complete';s.narrative.phase='day';s.narrative.doors=['main','customs','archive','curator','specialist','liaison','meeting','gallery'];s.narrative.position={x:825,y:142,room:null};app.store.write('life','owner',s);
const config=app.domain.config();config.personalization.islandName='北岸远航 · 隔离试玩';app.store.write('config','owner',config);
app.store.write('fixture','voyage-initialized',{version:1});
});
}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0)});
app.server.listen(8792,'127.0.0.1',()=>console.log('isolated voyage fixture http://localhost:8792'));
