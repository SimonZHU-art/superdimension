// Disposable entry-flow verification. No .env, user inventory or model calls.
import {createApp} from '../server/index.mjs';
import {newLife} from '../server/life.mjs';
import {fileURLToPath} from 'node:url';
const app=await createApp({dataPath:fileURLToPath(new URL('../.data/visitor-entry-qa.sqlite',import.meta.url)),env:{NODE_ENV:'production',OWNER_PASSWORD:'visitor-entry-fixture',PORT:'8795',QUEUE_INTERVAL_MS:'0',DAILY_STORIES_ENABLED:'0'}});
if(process.argv.includes('--seed')||!app.store.read('fixture','visitor-entry')){
 const s=newLife();s.narrative.prologue='complete';s.narrative.phase='day';s.narrative.number=5;s.minutes=6500;s.materials=61;s.boat={blueprint:true,stage:1,screws:5,status:'frame',version:0,requests:{},claims:[]};s.narrative.position={x:663,y:324,room:null};app.store.write('life','owner',s);
 const c=app.domain.config();c.public={...c.public,name:'测试岛主',bio:'本机序章入口测试资料。',background:'测试资料',projects:[],confirmed:true};app.store.write('config','owner',c);app.store.write('fixture','visitor-entry',{disposable:true});
}
app.server.listen(8795,'::1',()=>console.log('Visitor entry acceptance http://[::1]:8795/'));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0)});
