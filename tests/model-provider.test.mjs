import test from 'node:test';
import assert from 'node:assert/strict';
import { modelJson, ANSWER_SCHEMA, modelConfigured, generateReport } from '../server/agents.mjs';
const env={MODEL_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'TEST FIXTURE',DEEPSEEK_MODEL:'deepseek-flash'};
const args={env,system:'Use sources only.',input:{question:'TEST FIXTURE'},schema:ANSWER_SCHEMA,name:'test'};
test('DeepSeek uses its own endpoint, JSON format, and normalized token usage',async()=>{
 assert.ok(modelConfigured(env));
 const result=await modelJson({...args,fetchImpl:async(url,request)=>{
  assert.equal(url,'https://api.deepseek.com/chat/completions');
  const body=JSON.parse(request.body);assert.equal(body.response_format.type,'json_object');assert.match(body.messages[0].content,/JSON Schema/);assert.equal(body.thinking.type,'disabled');
  return Response.json({id:'fixture',model:'deepseek-flash',choices:[{finish_reason:'stop',message:{content:JSON.stringify({answer:'TEST FIXTURE',source_refs:[],uncertainties:[]})}}],usage:{prompt_tokens:12,completion_tokens:9,total_tokens:21}});
 }});assert.equal(result.usage.input_tokens,12);assert.equal(result.usage.output_tokens,9);
});
test('DeepSeek rejects incomplete and invalid structured outputs',async()=>{
 for(const [reason,content] of [['length','{}'],['stop','{"answer":"missing fields"}']]){
  await assert.rejects(modelJson({...args,fetchImpl:async()=>Response.json({choices:[{finish_reason:reason,message:{content}}]})}),e=>['model_incomplete','invalid_model_output'].includes(e.code));
 }
});
test('billing errors are explicit and never automatically retried',async()=>{
 for(const [status,error] of [[402,{}],[429,{type:'insufficient_quota',code:'credit_balance_exhausted'}]]){
  await assert.rejects(modelJson({...args,fetchImpl:async()=>Response.json({error},{status})}),e=>e.code==='model_quota_exhausted'&&e.retryable===false);
 }
});

test('sparse report sources remain valid while invented citations stay rejected', async()=>{
 const snapshot={sources:[{id:'source-fixture',label:'TEST FIXTURE',kind:'self_report',paragraphs:['TEST FIXTURE brief introduction.']}]};
 const report={summary:'TEST FIXTURE limited information',findings:[],relevance:'资料不足',uncertainties:['未提供项目成果'],next_steps:['可补充项目资料'],source_refs:[]};
 let fabricated=false;
 const options={env,fetchImpl:async(url,request)=>{
  const body=JSON.parse(request.body);
  assert.match(body.messages[0].content,/source-fixture:p1/);
  assert.match(body.messages[0].content,/资料少不是错误/);
  return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({...report,...(body.messages[0].content.includes('project_cards')?{project_cards:[]}:{}),source_refs:fabricated?['made-up:p1']:[]})}}]});
 }};
 for(const role of ['archivist','curator','liaison','specialist']) assert.deepEqual((await generateReport(options,role,snapshot)).value.findings,[]);
 fabricated=true;
 await assert.rejects(generateReport(options,'archivist',snapshot),error=>error.code==='invalid_model_output');
});
