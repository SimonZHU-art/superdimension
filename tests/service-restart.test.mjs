import test from 'node:test';
import assert from 'node:assert/strict';
import {createConnection} from 'node:net';
import {once} from 'node:events';
import {createApp} from '../server/index.mjs';

test('service restart drains unfinished browser connections instead of leaving an old process attached',async()=>{
 const app=await createApp({dataPath:':memory:',env:{OWNER_PASSWORD:'restart-fixture-password',QUEUE_INTERVAL_MS:'0',GATHERING_INTERVAL_MS:'0'}});
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
 const socket=createConnection(app.server.address().port,'127.0.0.1');socket.on('error',()=>{});await once(socket,'connect');
 socket.write('POST /api/owner/login HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n{');
 await new Promise(resolve=>setTimeout(resolve,30));const start=Date.now();await app.close();
 assert.equal(app.server.listening,false);assert.ok(Date.now()-start<2500);socket.destroy();
});
