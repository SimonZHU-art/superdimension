import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const vite=join(dirname(require.resolve('vite/package.json')),'bin/vite.js');
const processes = [spawn(process.execPath, ['--env-file-if-exists=.env', 'server/index.mjs'], { cwd:root,stdio:'inherit',env:{...process.env,NODE_ENV:'development'} }), spawn(process.execPath, [vite,'--host','127.0.0.1','--port','5174'], {cwd:root,stdio:'inherit'})];
let stopping=false;
const stop=()=>{if(stopping)return;stopping=true;processes.forEach(p=>p.kill('SIGTERM'))};
process.on('SIGINT',()=>{stop();process.exit(0)});process.on('SIGTERM',()=>{stop();process.exit(0)});
for(const p of processes){p.on('error',err=>{console.error(err.message);stop();process.exit(1)});p.on('exit',code=>{stop();process.exit(code??0)})}
