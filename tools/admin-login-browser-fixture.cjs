'use strict';
// Browser harness: real Operations/SQLite/auth; model and obsolete API are disabled.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const A=require('../v5/admin-login-config');
const env={LOCAL_DATA_DIR:process.env.TEST_RUNTIME,...(process.env.TEST_MODE==='custom'?{ADMIN_PASSWORD:'private-browser-fixture'}:{})};
const prepared=A.prepare(env),store=require('../v5/ops-store').createStore(prepared.env),ops=require('../v5/ops-api').createOps({env:prepared.env,store});
const root=path.resolve(__dirname,'../dist');
const server=http.createServer((req,res)=>{
 const p=new URL(req.url,'http://local').pathname;
 if(p==='/api/admin-login-info')return A.respond(req,res,prepared);
 if(p==='/api/ops')return ops(req,res);
 if(p.startsWith('/api/')){res.writeHead(p==='/api/chat'?200:404,{'Content-Type':'application/json'});return res.end(JSON.stringify(p==='/api/chat'?{configured:false,authorized:false,backend:'test-fixture-no-model',accessReady:false}:{error:'NO_LEGACY_SERVER_IN_FIXTURE'}));}
 const file=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.json')?'application/json':'text/javascript; charset=utf-8'});fs.createReadStream(file).pipe(res);
});server.listen(Number(process.env.PORT),'127.0.0.1');
