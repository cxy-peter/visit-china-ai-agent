'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),http=require('node:http');
const {auth}=require('./ops-auth'),{createOps}=require('./ops-api'),{createCloudChat}=require('./cloud-chat'),Trial=require('./trial-access');
function environment(password='private-fixture-password'){
 const salt='test-only-salt';return{OPS_SESSION_SECRET:'test-only-operations-session-secret-32',OPS_USERS_JSON:JSON.stringify({admin:{role:'admin',salt,hash:crypto.scryptSync(password,salt,32).toString('hex')},reviewer:{role:'reviewer',salt,hash:crypto.scryptSync('reviewer-fixture',salt,32).toString('hex')}}),DEEPSEEK_API_KEY:'test-only-key'};
}
async function fixture(t,env=environment()){
 let saved=require('./operations').initial(),cookie='',calls=0;
 const store={kind:'test-memory',read:async()=>saved,mutate:async fn=>fn(saved)};
 const ops=createOps({env,store}),chat=createCloudChat({env,store,fetcher:async()=>{calls++;return new Response('upstream response must not leak',{status:402});}});
 const server=http.createServer((req,res)=>req.url.startsWith('/api/ops')?ops(req,res):chat(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>{server.closeAllConnections();server.close();});
 async function request(path,body,headers={}){const response=await fetch('http://127.0.0.1:'+server.address().port+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',cookie,...headers},body:body?JSON.stringify(body):undefined});const next=response.headers.get('set-cookie');if(next){const pair=next.split(';')[0],name=pair.split('=')[0];cookie=cookie.split('; ').filter(x=>x&&!x.startsWith(name+'=')).concat(pair).join('; ');}return{status:response.status,body:await response.json(),cookie:next};}
 return{request,env,saved,calls:()=>calls,login:(password='private-fixture-password')=>request('/api/ops',{action:'login',username:'admin',password}),connect:()=>request('/api/chat',{action:'admin-connect',modelConsent:true})};
}
test('production-style admin login rejects local demo password and accepts configured password',async t=>{
 const f=await fixture(t);assert.equal((await f.login('demo2026')).body.error,'LOGIN_FAILED');assert.equal((await f.login()).body.actor.role,'admin');
 const connected=await f.connect();assert.equal(connected.status,200);assert.match(connected.cookie,/HttpOnly; SameSite=Strict; Path=\/api\/chat/);
 const status=(await f.request('/api/chat')).body;assert.equal(status.authorized,true);assert.equal(status.accessReady,true);assert.equal(status.legacyAccessReady,false);assert.equal(status.adminLoginConfigured,true);
 assert.ok(!JSON.stringify(status).includes(f.env.OPS_SESSION_SECRET));assert.equal(f.calls(),0);
});
test('explicitly configured demo password works without making it a global fallback',async t=>{
 const f=await fixture(t,environment('demo2026'));assert.equal((await f.login('demo2026')).status,200);assert.equal((await f.connect()).status,200);
});
test('chat model invocation works after admin login without legacy experience code',async t=>{
 const f=await fixture(t);await f.login();await f.connect();const E=require('./engine'),s=E.apply(E.state(),{type:'text',text:'Plan a relaxed Shanghai visit with my parents'});
 const result=await f.request('/api/chat',{action:'answer',memory:E.memory(s),revision:s.revision,modelConsent:true});assert.equal(result.body.error,'DEEPSEEK_HTTP_402');assert.equal(f.calls(),1);assert.ok(!JSON.stringify(result).includes('upstream response'));
});
test('unauthenticated, cross-origin, wrong-code and reviewer requests remain denied',async t=>{
 const f=await fixture(t);assert.equal((await f.connect()).status,403);
 for(const accessCode of ['','demo2026','wrong','VC-AAAAA-BBBBB-CCCCC-DDDDD'])assert.equal((await f.request('/api/chat',{action:'login',accessCode})).status,401);
 assert.equal((await f.request('/api/chat',{action:'login',accessCode:'sk-fixture-not-a-real-key'})).body.error,'API_KEY_IS_NOT_EXPERIENCE_CODE');
 await f.login();assert.equal((await f.request('/api/chat',{action:'admin-connect',modelConsent:true},{origin:'https://other.example'})).status,403);
 assert.equal((await f.request('/api/chat',{action:'admin-connect',modelConsent:false})).status,403);
 const reviewer=auth(f.env).issue({actor:'reviewer'});assert.equal((await f.request('/api/chat',{action:'admin-connect',modelConsent:true},{cookie:'vc_ops='+reviewer})).status,403);assert.equal(f.calls(),0);
});
test('trial codes remain bounded and revocable with Operations signing',async t=>{
 const f=await fixture(t),grant=Trial.issue(f.saved,'admin',{maxTurns:2});assert.equal((await f.request('/api/chat',{action:'login',accessCode:grant.code})).status,200);
 assert.equal((await f.request('/api/chat')).body.authorized,true);Trial.revoke(f.saved,grant.id);const status=await f.request('/api/chat');assert.equal(status.body.authorized,false);assert.equal(status.body.accessError,'TRIAL_REVOKED');
});
test('chat and operations signatures are purpose-separated and forged cookies rejected',async t=>{
 const f=await fixture(t),body=Buffer.from(JSON.stringify({expires:Date.now()+60000})).toString('base64url');
 for(const key of [f.env.OPS_SESSION_SECRET,'demo2026','']){const mac=crypto.createHmac('sha256',key).update(body).digest('base64url');assert.equal((await f.request('/api/chat',undefined,{cookie:'vc_chat='+body+'.'+mac})).body.authorized,false);}
});
test('no signing configuration fails closed even with model key present',async t=>{
 const f=await fixture(t,{DEEPSEEK_API_KEY:'test-only-key'});assert.equal((await f.request('/api/chat')).body.accessReady,false);assert.equal((await f.connect()).body.error,'CHAT_ACCESS_NOT_CONFIGURED');
});
test('existing legacy experience-code sessions still verify after upgrade',async t=>{
 const code='test-only-legacy-access-code-32-chars',f=await fixture(t,{...environment(),TRAVEL_CHAT_ACCESS_CODE:code});
 const body=Buffer.from(JSON.stringify({expires:Date.now()+60000,grantId:null})).toString('base64url'),mac=crypto.createHmac('sha256',code).update(body).digest('base64url');
 assert.equal((await f.request('/api/chat',undefined,{cookie:'vc_chat='+body+'.'+mac})).body.authorized,true);assert.equal((await f.request('/api/chat',{action:'login',accessCode:code})).status,200);
 await f.request('/api/chat',{action:'logout'});assert.equal((await f.request('/api/chat')).body.authorized,false);
});
test('public travel chat reaches the model without passwords, signing secrets or cookies',async t=>{
 const f=await fixture(t,{TRAVEL_CHAT_PUBLIC:'1',DEEPSEEK_API_KEY:'test-only-key',MAX_MODEL_CALLS_PER_HOUR:'1'}),status=await f.request('/api/chat');
 assert.equal(status.body.publicAccess,true);assert.equal(status.body.authorized,true);assert.equal(status.body.configured,true);assert.equal(status.cookie,null);assert.equal(f.calls(),0);
 const E=require('./engine'),s=E.apply(E.state(),{type:'text',text:'Plan a relaxed Shanghai visit with my parents'}),body={action:'answer',memory:E.memory(s),revision:s.revision,modelConsent:true};
 assert.equal((await f.request('/api/chat',{...body,modelConsent:false})).status,403);assert.equal(f.calls(),0);
 assert.equal((await f.request('/api/chat',body,{origin:'https://other.example'})).status,403);assert.equal(f.calls(),0);
 assert.equal((await f.request('/api/chat',body)).body.error,'DEEPSEEK_HTTP_402');assert.equal(f.calls(),1);
 assert.equal((await f.request('/api/chat',body)).body.error,'MODEL_BUDGET');assert.equal(f.calls(),1);
 assert.equal((await f.request('/api/ops',{action:'source-submit',title:'unauthorized write'})).status,403);
});
test('public mode reports absent DeepSeek key without pretending to generate an answer',async t=>{
 const f=await fixture(t,{TRAVEL_CHAT_PUBLIC:'1'});assert.equal((await f.request('/api/chat')).body.configured,false);
 assert.equal((await f.request('/api/chat',{action:'answer',modelConsent:true})).body.error,'DEEPSEEK_KEY_MISSING');assert.equal(f.calls(),0);
});
