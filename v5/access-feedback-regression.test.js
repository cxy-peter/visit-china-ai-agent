'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),http=require('node:http');
const O=require('./operations'),F=require('./feedback-cases'),T=require('./trial-access');
const {createStore}=require('./ops-store'),{createOps}=require('./ops-api'),{createCloudChat}=require('./cloud-chat');

const secret='regression-fixture-signing-secret-over-24-characters';
const env={TRAVEL_CHAT_ACCESS_CODE:secret,OPS_SESSION_SECRET:'regression-fixture-ops-secret-over-24-characters',DEEPSEEK_API_KEY:'fixture-provider-key',OPS_USERS_JSON:JSON.stringify({admin:{role:'admin',salt:'fixture',hash:crypto.scryptSync('fixture-password','fixture',32).toString('hex')}})};
const issue=(suffix='original')=>({action:'feedback-case-submit',chat:'chat-id-'+suffix,answerId:'answer-id-'+suffix,category:'wrong_route',comment:'没有解释换乘步骤',shareContext:true,context:[{question:'浦东机场到上海火车站乘地铁怎样走',answer:'旧答案',language:'zh'}]});
const metro=()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({intent:{kind:'metro',origin:'浦东国际机场',destination:'上海火车站',city:'Shanghai',confidence:.9},text:'',source_ids:[]})}}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}}));
const answer=(id='request-id-original')=>({action:'answer',requestId:id,revision:1,modelConsent:true,memory:{language:'zh',history:[{text:'浦东机场到上海火车站乘地铁怎样走',language:'zh'}]}});

// Exercise the production private-Blob CAS store, with only transport replaced.
// Every get snapshots both bytes and ETag before yielding, as a real download does.
function blobStore(initial=O.initial()){
 let value=structuredClone(initial),version=1,writes=0,conflicts=0,hook=null,barrier=null;
 class BlobPreconditionFailedError extends Error{}
 const sdk={
  async get(_name,options){
   assert.equal(options.headers['accept-encoding'],'identity');
   assert.equal(options.access,'private');assert.equal(options.useCache,false);
   const text=JSON.stringify(value),etag='"'+version+'"';
   if(barrier){const gate=barrier;gate.arrived++;if(gate.arrived===gate.count){barrier=null;gate.release();}await gate.promise;}
   return{statusCode:200,stream:new Blob([text]).stream(),blob:{etag}};
  },
  async put(_name,text,options){
   if(hook){const run=hook;hook=null;run(value);version++;}
   assert.equal(options.access,'private');assert.equal(options.allowOverwrite,true);
   if(options.ifMatch!=='"'+version+'"'){conflicts++;throw new BlobPreconditionFailedError();}
   value=JSON.parse(text);version++;writes++;
  }
 };
 return{store:createStore({BLOB_STORE_ID:'fixture-private-store'},sdk),snapshot:()=>structuredClone(value),stats:()=>({writes,conflicts}),beforePut(fn){hook=fn;},barrier(count){let release;const promise=new Promise(r=>{release=r;});barrier={count,arrived:0,promise,release};}};
}
async function serve(t,handler){
 const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(()=>{server.closeAllConnections();server.close();});
 return'http://127.0.0.1:'+server.address().port;
}
function client(url,initialCookie=''){
 const jar=new Map(initialCookie?initialCookie.split(';').map(x=>x.trim().split(/=(.*)/s).slice(0,2)):[]);
 return async(body,path='/api/ops')=>{
  const r=await fetch(url+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')},body:body?JSON.stringify(body):undefined});
  for(const cookie of r.headers.getSetCookie()){const pair=cookie.split(';')[0],at=pair.indexOf('=');jar.set(pair.slice(0,at),pair.slice(at+1));}
  return{status:r.status,body:await r.json()};
 };
}
function signedTrial(grant,expires){const body=Buffer.from(JSON.stringify({expires,grantId:grant.id,nonce:'fixture'})).toString('base64url');return'vc_chat='+body+'.'+crypto.createHmac('sha256',secret).update(body).digest('base64url');}
async function login(req){const r=await req({action:'login',username:'admin',password:'fixture-password'});assert.equal(r.status,200);}
async function visitor(req){assert.equal((await req(null,'/api/ops?view=library')).status,200);}

test('expired-between-checks trial cannot skip an exhausted durable grant',async t=>{
 const base=Date.now(),state=O.initial(),grant=T.issue(state,'admin',{maxTurns:1});T.consume(state,grant.id,'already-consumed');
 const blob=blobStore(state);let clockReads=0,modelCalls=0;
 const url=await serve(t,createCloudChat({env,store:blob.store,now:()=>[base,base+9,base+11,base+11][Math.min(clockReads++,3)],fetcher:async()=>{modelCalls++;return metro();}}));
 const req=client(url,signedTrial(grant,base+10)),out=await req(answer(),'/api/chat');
 assert.equal(out.status,400);assert.equal(out.body.error,'TRIAL_EXHAUSTED');
 assert.equal(modelCalls,0);assert.equal(blob.snapshot().trialCodes[0].usedTurns,1);assert.equal(blob.stats().writes,0);
});

test('two handler instances competing for the last trial turn cannot spend it twice',async t=>{
 const state=O.initial(),grant=T.issue(state,'admin',{maxTurns:1}),blob=blobStore(state);let modelCalls=0;
 const opts={env,store:blob.store,fetcher:async()=>{modelCalls++;return metro();}};
 const a=client(await serve(t,createCloudChat(opts)),signedTrial(grant,Date.now()+60000));
 const b=client(await serve(t,createCloudChat(opts)),signedTrial(grant,Date.now()+60000));
 blob.barrier(2);
 const results=await Promise.all([a(answer('concurrent-request-a'),'/api/chat'),b(answer('concurrent-request-b'),'/api/chat')]);
 assert.deepEqual(results.map(x=>x.status).sort(),[200,400]);
 assert.equal(results.find(x=>x.status===400).body.error,'TRIAL_EXHAUSTED');
 assert.equal(modelCalls,1);assert.equal(blob.snapshot().trialCodes[0].usedTurns,1);
 assert.ok(blob.stats().conflicts>=1,'must exercise the conditional-write retry, not just serial requests');
});

test('revised feedback invalidates derived guidance and cannot close against an old replay',async t=>{
 const blob=blobStore();let mode='summary',modelCalls=0;
 const url=await serve(t,createOps({env,store:blob.store,fetcher:async()=>{modelCalls++;return mode==='summary'?new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({need:'旧问题',problem:'换乘步骤缺失',hypothesis:'待核对路线',evidenceNeeded:'地铁来源',nextAction:'重新回放'})}}]})):metro();}}));
 const req=client(url);await visitor(req);let out=await req(issue());assert.equal(out.status,200);const id=out.body.result.id;await login(req);
 assert.equal((await req({action:'case-summarize',id,version:1,modelConsent:true})).status,200);
 mode='replay';assert.equal((await req({action:'case-replay',id,version:2,modelConsent:true})).status,200);
 assert.equal((await req({action:'case-skill',id,version:3})).status,200);
 const old=blob.snapshot().feedbackCases[0];assert.ok(old.modelSummary);assert.ok(old.skillCandidateId);assert.equal(old.replays[0].contentHash,old.contentHash);
 out=await req({...issue(),comment:'新的问题：反方向换乘仍不清楚',context:[{question:'上海火车站反方向回浦东机场怎么换乘',answer:'仍然没有说明',language:'zh'}]});assert.equal(out.status,200);
 const updated=blob.snapshot().feedbackCases[0];assert.notEqual(updated.contentHash,old.contentHash);assert.equal(updated.modelSummary,undefined);assert.equal(updated.skillCandidateId,undefined);
 out=await req({action:'case-update',id,version:updated.version,status:'closed',category:'wrong_route',note:'试图沿用旧回放'});
 assert.equal(out.body.error,'CASE_REPLAY_REQUIRED');assert.notEqual(blob.snapshot().feedbackCases[0].status,'closed');
 assert.equal((await req({action:'case-replay',id,version:updated.version,modelConsent:true})).status,200);
 const replayed=blob.snapshot().feedbackCases[0];assert.equal(replayed.replays.at(-1).contentHash,replayed.contentHash);
 out=await req({action:'case-update',id,version:replayed.version,status:'closed',category:'wrong_route',note:'已查看此内容版本的新回放'});
 assert.equal(out.status,200);assert.equal(blob.snapshot().feedbackCases[0].status,'closed');assert.equal(modelCalls,3);
});

test('category-only changes from either traveler or admin invalidate old summaries, skills and replay closure',async t=>{
 for(const origin of ['traveler','admin']){
  const blob=blobStore(),url=await serve(t,createOps({env,store:blob.store,fetcher:async()=>metro()})),req=client(url);
  await visitor(req);const input=issue('category-'+origin),id=(await req(input)).body.result.id;await login(req);
  await blob.store.mutate(s=>{const row=F.get(s,id);row.modelSummary={hypothesis:'旧的路线分类摘要'};row.skillCandidateId='old-route-skill';row.replays.push({answer:'旧路线回放',contentHash:row.contentHash});});
  const before=blob.snapshot().feedbackCases[0];
  if(origin==='traveler')assert.equal((await req({...input,category:'connection_issue'})).status,200);
  else{
   const rejected=await req({action:'case-update',id,version:before.version,status:'closed',category:'connection_issue',note:'改成连接问题并尝试沿用旧路线回放'});
   assert.equal(rejected.body.error,'CASE_REPLAY_REQUIRED');assert.deepEqual(blob.snapshot().feedbackCases[0],before,'a failed close must not partially change the category or derived data');
   assert.equal((await req({action:'case-update',id,version:before.version,status:'investigating',category:'connection_issue',note:'人工重新归类'})).status,200);
  }
  const changed=blob.snapshot().feedbackCases[0];assert.equal(changed.category,'connection_issue');assert.equal(changed.summary.hypothesis,'connection_issue');assert.notEqual(changed.contentHash,before.contentHash);
  assert.deepEqual(changed.context,before.context);assert.equal(changed.comment,before.comment);
  assert.equal(changed.modelSummary,undefined);assert.equal(changed.skillCandidateId,undefined);
  assert.equal((await req({action:'case-update',id,version:changed.version,status:'closed',category:'connection_issue',note:'再次尝试使用旧分类回放'})).body.error,'CASE_REPLAY_REQUIRED');
  const replay=await req({action:'case-replay',id,version:changed.version,modelConsent:true});assert.equal(replay.status,200);assert.equal(replay.body.result.contentHash,changed.contentHash);
  const current=blob.snapshot().feedbackCases[0];assert.equal((await req({action:'case-update',id,version:current.version,status:'closed',category:'connection_issue',note:'已核对当前分类的新回放'})).status,200);
 }
});

test('anonymous feedback limits preserve other visitors open cases',async t=>{
 const blob=blobStore(),url=await serve(t,createOps({env,store:blob.store})),owner=client(url),submitter=client(url);
 await visitor(owner);const original=(await owner(issue('owner'))).body.result.id;await visitor(submitter);
 for(let i=0;i<10;i++)assert.equal((await submitter(issue('visitor-'+i))).status,200);
 const full=await submitter(issue('visitor-over-limit'));assert.equal(full.body.error,'CASE_SUBMISSION_LIMIT');
 assert.equal(blob.snapshot().feedbackCases.length,11);assert.ok(blob.snapshot().feedbackCases.some(r=>r.id===original&&r.status==='open'));
 // Closed cases free the open-case allowance but not the same-day allowance.
 await blob.store.mutate(s=>{for(const row of s.feedbackCases)if(row.id!==original)row.status='closed';});
 for(let i=10;i<20;i++)assert.equal((await submitter(issue('visitor-'+i))).status,200);
 await blob.store.mutate(s=>{for(const row of s.feedbackCases)if(row.id!==original)row.status='closed';});
 const daily=await submitter(issue('visitor-over-daily-limit'));assert.equal(daily.body.error,'CASE_SUBMISSION_LIMIT');
 assert.ok(blob.snapshot().feedbackCases.some(r=>r.id===original&&r.status==='open'));
});

test('capacity checks rerun after a CAS conflict and never evict an existing case',async t=>{
 const state=O.initial();for(let i=0;i<199;i++)F.submit(state,'seed-visitor-'+i,issue('seed-'+i));
 const ids=state.feedbackCases.map(r=>r.id),blob=blobStore(state),url=await serve(t,createOps({env,store:blob.store})),req=client(url);await visitor(req);
 let concurrentId;blob.beforePut(s=>{concurrentId=F.submit(s,'concurrent-visitor',issue('concurrent-last-slot')).id;s.revision++;});
 const out=await req(issue('loses-capacity-race'));assert.equal(out.body.error,'CASE_CAPACITY');
 const after=blob.snapshot();assert.equal(after.feedbackCases.length,200);assert.ok(after.feedbackCases.some(r=>r.id===concurrentId));
 assert.ok(ids.every(id=>after.feedbackCases.some(r=>r.id===id)));assert.equal(blob.stats().conflicts,1);assert.equal(blob.stats().writes,0);
});

test('replay rejects workflow version or content changes during model execution',async t=>{
 for(const change of ['version','content'])await t.test(change,async t=>{
  const blob=blobStore();let changed=false,editDuringCall=true;
  const url=await serve(t,createOps({env,store:blob.store,fetcher:async()=>{if(editDuringCall&&!changed){changed=true;await blob.store.mutate(s=>{if(change==='version')s.governance.active.version='wf-changed-during-replay';else s.governance.active.promptSuffix='并发发布了另一条工作流提示';});}return metro();}}));
  const req=client(url);await visitor(req);const id=(await req(issue('policy-'+change))).body.result.id;await login(req);
  let out=await req({action:'case-replay',id,version:1,modelConsent:true});assert.equal(out.status,409);assert.equal(out.body.error,'STALE_REPLAY_BASE');
  assert.equal(blob.snapshot().feedbackCases[0].replays.length,0);assert.equal((blob.snapshot().executions||[]).length,0);
  editDuringCall=false;out=await req({action:'case-replay',id,version:1,modelConsent:true});assert.equal(out.status,200);
  const saved=blob.snapshot();assert.equal(out.body.result.policyVersion,saved.governance.active.version);assert.equal(out.body.result.contentHash,saved.feedbackCases[0].contentHash);assert.equal(saved.executions.at(-1).dataset,'evaluation');
 });
});
