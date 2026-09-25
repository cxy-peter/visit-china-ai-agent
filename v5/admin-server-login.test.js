'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
for(const custom of [false,true])test('full app: both login realms '+(custom?'custom':'default'),async t=>{
 const runtime=fs.mkdtempSync(path.join(os.tmpdir(),'vc-full-admin-'));const env=custom?{ADMIN_PASSWORD:'custom-full-server-fixture'}:{};
 const app=require('./server').createApp({env,runtimeDir:runtime,fetch:async()=>{throw Error('NO_EXTERNAL_CALLS_IN_LOGIN_TEST');}});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));t.after(()=>{app.server.closeAllConnections();app.server.close();fs.rmSync(runtime,{recursive:true,force:true});});
 const url='http://127.0.0.1:'+app.server.address().port,password=custom?env.ADMIN_PASSWORD:'demo2026';
 for(const realm of ['local','operations']){const info=await(await fetch(url+'/api/admin-login-info?realm='+realm)).json();assert.equal(info.configured,true);assert.equal(info.prefill.password,custom?undefined:'demo2026');}
 const status=await fetch(url+'/api/v5/status');const legacyCookie=status.headers.get('set-cookie').split(';')[0];
 const post=(p,b,cookie='')=>fetch(url+p,{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify(b)});
 const legacy=await post('/api/v5/login',{username:'admin',password},legacyCookie);assert.equal(legacy.status,200);assert.equal((await legacy.json()).actor,'admin');
 const modern=await post('/api/ops',{action:'login',username:'admin',password});assert.equal(modern.status,200);const cookie=modern.headers.get('set-cookie').split(';')[0];
 const dashboard=await(await fetch(url+'/api/ops',{headers:{cookie}})).json();assert.equal(dashboard.actor.role,'admin');assert.ok(dashboard.harness.active);
 const blocked=await fetch(url+'/api/ops',{headers:{'x-forwarded-for':'198.51.100.5'}});assert.equal(blocked.status,403);
});
