'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createMongoStore}=require('./ops-mongo-store');
function fake(){let row=null;const clone=x=>structuredClone(x),col={async findOne(){return clone(row);},async insertOne(x){if(row)throw Object.assign(Error(),{code:11000});row=clone(x);},async replaceOne(filter,x){if(row?.revision!==filter.revision)return{modifiedCount:0};row=clone(x);return{modifiedCount:1};}};return class {db(){return{collection:()=>col};}async close(){}};}
test('Mongo CAS retries preserve concurrent approvals and revision',async()=>{const C=fake(),env={MONGODB_URI:'mock'},a=createMongoStore(env,x=>x,C),b=createMongoStore(env,x=>x,C);await Promise.all([a.mutate(s=>s.audit.push({event:'a'})),b.mutate(s=>s.audit.push({event:'b'}))]);const row=await a.read();assert.equal(row.revision,2);assert.equal(row.audit.length,2);});
test('read-only migration refuses writes without changing source',async()=>{const a=createMongoStore({MONGODB_URI:'mock',OPS_STORE_READ_ONLY:'1'},x=>x,fake());await assert.rejects(a.mutate(s=>s.audit.push({})),/STORE_READ_ONLY/);assert.equal(await a.read(),null);});
test('Mongo backend is opt-in and does not silently fall back on missing URI',()=>{assert.throws(()=>require('./ops-store').createStore({OPS_STORE:'mongo'}),/MONGODB_URI_REQUIRED/);});
test('compressed historical corpus preserves every record across platform newlines',()=>{const fs=require('node:fs'),z=require('node:zlib');const hash=require('../tools/migrate-ops-store.cjs').hash;assert.equal(hash(JSON.parse(z.gunzipSync(fs.readFileSync('data/evaluation/v6.1-cases.json.gz')).toString('utf8'))),hash(JSON.parse(fs.readFileSync('data/evaluation/v6.1-cases.json','utf8'))));});
test('public download redirects go to existing version-pinned GitHub assets',()=>{const c=require('../vercel.json');assert.equal(c.redirects.length,3);for(const r of c.redirects)assert.match(r.destination,/^https:\/\/github.com\/cxy-peter\/visit-china-ai-agent\/releases\/download\/v6.6-public-data-20260926\//);});

test('Mongo-only cloud chat respects withdrawn sources and persists retrieval and failure traces',async t=>{
 const http=require('node:http'),K=require('./kb-direct'),E=require('./engine');
 const entry=K.entries.find(e=>K.lookup(e.languageIndependentAliases[0],{city:e.city}).matched);
 assert.ok(entry,'an approved exact answer is needed to exercise withdrawal');
 const data=require('./operations').initial();let reads=0,writes=0;
 const store={read:async()=>{reads++;return structuredClone(data);},mutate:async fn=>{writes++;return fn(data);}};
 const handler=require('./cloud-chat').createCloudChat({env:{OPS_STORE:'mongo',TRAVEL_CHAT_PUBLIC:'1',DEEPSEEK_API_KEY:'fixture-not-real'},store,fetcher:async()=>new Response('private upstream body',{status:402})});
 const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));});
 const send=async body=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return{status:r.status,body:await r.json()};};
 const query={action:'kb',text:entry.languageIndependentAliases[0],city:entry.city,language:'en'};
 const source=require('./library').records.find(r=>r.id===entry.sourceId);
 data.sources=data.sources.filter(r=>r.id!==source.id).concat({...source,active:false});
 assert.equal((await send(query)).body.matched,false,'withdrawn source must not fall back to bundled approval');
 data.sources.find(r=>r.id===source.id).active=true;
 const ok=await send(query);assert.equal(ok.body.matched,true);assert.ok(ok.body.answer.executionId);assert.ok(writes>0);
 const state=E.apply(E.state(),{type:'text',text:'我想和父母慢慢游览上海'});
 const failed=await send({action:'answer',revision:state.revision,memory:E.memory(state),modelConsent:true});
 assert.equal(failed.status,502);assert.equal(failed.body.error,'DEEPSEEK_HTTP_402');
 assert.equal(data.failures.at(-1).code,'DEEPSEEK_HTTP_402');assert.ok(reads>=3);
 assert.ok(!JSON.stringify(failed).includes('private upstream'));
});
test('Mongo configuration never implicitly enables local default admin credentials',()=>{
 const A=require('./admin-login-config');assert.equal(A.localEnvironment({OPS_STORE:'mongo'}),false);
 assert.equal(A.prepare({OPS_STORE:'mongo'}).generated,false);assert.equal(A.legacyPassword({OPS_STORE:'mongo'}),'');
 assert.equal(A.localEnvironment({}),true,'unchanged loopback local demo');
});
