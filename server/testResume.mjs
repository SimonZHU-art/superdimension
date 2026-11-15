import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fail} from './security.mjs';
const bundled=join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3');
// The child only reads the uploaded bytes on stdin and returns extracted text. No file paths or shell interpolation.
const code=`import sys,io,zipfile
payload=sys.stdin.buffer.read(2097153)
if len(payload)>2097152: raise ValueError('file too large')
if sys.argv[1]=='pdf':
 from pypdf import PdfReader
 doc=PdfReader(io.BytesIO(payload))
 if doc.is_encrypted or len(doc.pages)>20: raise ValueError('encrypted or too many pages')
 text='\\n'.join((p.extract_text() or '') for p in doc.pages)
else:
 from docx import Document
 z=zipfile.ZipFile(io.BytesIO(payload))
 if sum(i.file_size for i in z.infolist())>10000000: raise ValueError('expanded document too large')
 d=Document(io.BytesIO(payload))
 text='\\n'.join(p.text for p in d.paragraphs)+'\\n'+'\\n'.join(' '.join(c.text for c in row.cells) for table in d.tables for row in table.rows)
print(text[:14001])
`;
export async function extractTestResume(body,env={}){
 const name=String(body.name||'').slice(0,120),ext=name.split('.').at(-1)?.toLowerCase();if(!['pdf','docx'].includes(ext))fail(400,'resume_format','请上传 PDF、DOCX、TXT 或 MD。');
 if(typeof body.data!=='string'||body.data.length>2800000||!/^[A-Za-z0-9+/]*={0,2}$/.test(body.data))fail(400,'resume_file','文件内容无效或超过 2 MB。');
 const bytes=Buffer.from(body.data,'base64');if(!bytes.length||bytes.length>2097152)fail(400,'resume_size','简历最多 2 MB。');
 const runtime=env.RESUME_PYTHON||(existsSync(bundled)?bundled:'python3');
 return new Promise((resolve,reject)=>{
  const child=spawn(runtime,['-c',code,ext],{stdio:['pipe','pipe','pipe']}),chunks=[];let size=0,done=false;
  const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);if(error)reject(error);else resolve(value)};
  const timer=setTimeout(()=>{child.kill('SIGKILL');try{fail(422,'resume_timeout','简历解析超时，请粘贴正文或上传 TXT / MD。')}catch(e){finish(e)}},8000);
  child.stdout.on('data',chunk=>{size+=chunk.length;if(size>100000)child.kill('SIGKILL');else chunks.push(chunk)});child.stderr.resume();child.stdin.on('error',()=>{});
  child.on('error',()=>{try{fail(422,'resume_parser','此环境无法解析该格式，请粘贴正文或使用 TXT / MD。')}catch(e){finish(e)}});
  child.on('close',status=>{try{if(status!==0)fail(422,'resume_parse','无法读取该简历。请用未加密、含可复制文字的 PDF / DOCX，或粘贴正文。');const content=Buffer.concat(chunks).toString('utf8').trim();if(!content)fail(422,'resume_empty','简历未提取到文字；扫描图片请先转为文字。');if(content.length>14000)fail(422,'resume_long','简历文字超过 14,000 字，请精简后上传。');finish(null,{name,text:content})}catch(e){finish(e)}});child.stdin.end(bytes);
 });
}
