export async function api(path, body, method) {
  const response = await fetch(path, {method:method || (body === undefined ? 'GET' : 'POST'),credentials:'same-origin',headers:body === undefined ? {} : {'Content-Type':'application/json'},body:body === undefined ? undefined : JSON.stringify(body)});
  const result = await response.json().catch(()=>({error:'服务返回了无法读取的内容'}));
  if(!response.ok) throw new Error(typeof result.error==='string'?result.error:result.error?.message||result.message||'这次操作没有完成，请重试');
  return result;
}
export async function readFile(file) {
  if(file.size>2*1024*1024)throw new Error('单份资料请控制在 2 MB 以内');
  if(!/\.(txt|md)$/i.test(file.name))throw new Error('此入口支持 TXT / MD。PDF 请先导出为文本后投递。');
  const text=await file.text();
  if(text.length>14000)throw new Error('单份文本资料最多 14,000 字符，请先整理或拆分');
  return {name:file.name,text};
}
