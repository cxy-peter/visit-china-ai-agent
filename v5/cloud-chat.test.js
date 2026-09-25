'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {createCloudChat}=require('./cloud-chat'),E=require('./engine'),M=require('./metro'),T=require('./travel-tools');
const code='fixture-private-code-not-a-real-credential';
const state=(text,channel='text')=>E.apply(E.state(),{type:'text',text,channel});
const answer=s=>({action:'answer',revision:s.revision,memory:E.memory(s),modelConsent:true});
async function fixture(t,options={}){
 let time=Date.now(),cookie='',calls=[];
 const handler=createCloudChat({env:{DEEPSEEK_API_KEY:'fixture-key-not-real',TRAVEL_CHAT_ACCESS_CODE:code,...options.env},now:()=>time,fetcher:async(url,init)=>{
  calls.push({url,request:JSON.parse(init.body)});if(options.error)return new Response('do not expose this provider body',{status:options.error});
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({intent:{kind:'other'},text:'可以按你的偏好，安排轻松的行程。',source_ids:[]})}}],usage:{prompt_tokens:30,completion_tokens:10,total_tokens:40}}));
 }});
 const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));});
 const url='http://127.0.0.1:'+server.address().port;
 const request=async(body,headers={})=>{const r=await fetch(url+'/api/chat',{method:body===undefined?'GET':'POST',headers:{cookie,'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});const setCookie=r.headers.get('set-cookie');if(setCookie)cookie=setCookie.split(';')[0];return{status:r.status,body:await r.json(),setCookie};};
 return{calls,request,expire:()=>time+=9*3600000,login:()=>request({action:'login',accessCode:code})};
}
test('cloud chat requires private access, explicit consent and same-origin requests',async t=>{
 const f=await fixture(t),s=state('我想和父母慢慢游览上海');
 const status=await f.request();assert.equal(status.body.configured,true);assert.equal(status.body.authorized,false);assert.ok(!JSON.stringify(status).includes('fixture-key'));
 assert.equal((await f.request(answer(s))).status,401);
 assert.equal((await f.request({action:'login',accessCode:'wrong'})).status,401);
 assert.equal((await f.request({action:'login',accessCode:code},{origin:'https://other.example'})).status,403);
 const login=await f.login();assert.match(login.setCookie,/HttpOnly; SameSite=Strict; Path=\/api\/chat/);
 assert.equal((await f.request({...answer(s),modelConsent:false})).status,403);assert.equal(f.calls.length,0);
 assert.equal((await f.request()).body.authorized,true);
});
test('cloud sends bounded contextual history to the real provider interface and reports usage',async t=>{
 const f=await fixture(t);await f.login();let s=state('我想和父母慢慢游览上海');
 for(let i=0;i<15;i++)s=E.apply(s,{type:'text',text:'我希望轻松慢游'});
 const out=await f.request(answer(s));assert.equal(out.status,200);assert.equal(out.body.answer.mode,'deepseek');assert.equal(out.body.answer.usage.total_tokens,40);assert.equal(out.body.revision,s.revision);
 assert.equal(f.calls[0].url,'https://api.deepseek.com/chat/completions');const payload=JSON.parse(f.calls[0].request.messages[1].content);
 assert.equal(payload.history.length,12);assert.equal(payload.preferences.pace,'relaxed');assert.ok(!JSON.stringify(out).includes('fixture-key'));
});
test('cloud ignores voice noise without billing and expires signed sessions',async t=>{
 const f=await fixture(t);await f.login();assert.equal((await f.request(answer(state('啊','voice')))).body.mode,'ignored');assert.equal(f.calls.length,0);
 f.expire();assert.equal((await f.request()).body.authorized,false);assert.equal((await f.request(answer(state('Shanghai')))).status,401);
});
test('cloud preserves low-power and evidence gaps while asking the model to identify normal requests',async t=>{
 const f=await fixture(t);await f.login();
 for(const text of ['Shanghai battery 3%','去上海的签证条件']){const out=await f.request(answer(state(text)));assert.equal(out.status,200);assert.notEqual(out.body.answer?.mode,'deepseek');}
 assert.equal(f.calls.length,1);
});
test('cloud missing key, provider failure and secondary budget are visible without leaking upstream data',async t=>{
 const missing=await fixture(t,{env:{DEEPSEEK_API_KEY:''}});await missing.login();assert.equal((await missing.request(answer(state('Shanghai')))).body.error,'DEEPSEEK_KEY_MISSING');
 const broken=await fixture(t,{error:402});await broken.login();const out=await broken.request(answer(state('我想轻松慢游')));assert.equal(out.body.error,'DEEPSEEK_HTTP_402');assert.ok(!JSON.stringify(out).includes('provider body'));
 const limited=await fixture(t,{env:{MAX_MODEL_CALLS_PER_HOUR:'1'}});await limited.login();await limited.request(answer(state('我想轻松慢游')));assert.equal((await limited.request(answer(state('我想轻松慢游')))).status,429);assert.equal(limited.calls.length,1);
});
test('speech gate rejects accidental fragments and keeps meaningful short contextual answers',()=>{
 for(const text of ['我','啊','嗯嗯','嗯啊呃','今天的话','随便说几句','blah blah',''])assert.equal(E.speechDecision(text).accepted,false,text);
 for(const text of ['上海','我想去豫园','I need a train to Shanghai','从陆家嘴到豫园怎么走'])assert.equal(E.speechDecision(text).accepted,true,text);
 assert.equal(E.speechDecision('好的').accepted,false);assert.equal(E.speechDecision('好的',{lastQuestion:'confirm'}).accepted,true);assert.equal(E.speechDecision('no',{lastQuestion:'hotel'}).accepted,true);
});
test('metro keeps route scope explicit and does not fabricate exits or intercity tickets',()=>{
 for(const [origin,line]of [['hongqiao','10'],['nanjing','10'],['lujiazui','14']]){const r=M.route(origin);assert.equal(r.line,line);assert.match(r.notice,/非按比例/);assert.match(M.html({origin}),/2024/);}
 assert.equal(M.intent('去豫园','Beijing'),null);assert.equal(M.intent('去豫园','Shanghai').origin,null);assert.throws(()=>M.route('unknown'),/ORIGIN/);
 const s=state('从虹桥火车站坐地铁去豫园怎么走？');assert.equal(s.facts.city,'Shanghai');assert.ok(s.tasks.includes('metro'));assert.ok(!s.history[0].offers.includes('rail'));
});
test('mock rail and flights preserve explicitly requested Shanghai direction',()=>{
 for(const [text,from,to]of [['从北京飞往上海的飞机票','北京','上海'],['从上海虹桥到杭州东的高铁票','上海','杭州'],['从北京南到上海虹桥的高铁票','北京','上海']]){
  const groups=T.offers(state(text).history[0],'zh');assert.ok(groups.length);for(const item of groups[0].items){assert.ok(item.route.indexOf(from)<item.route.indexOf(to),item.route);}
  assert.match(groups[0].disclaimer,/非实时/);
 }
});
