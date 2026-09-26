'use strict';
// Test only: explicitly configure demo2026, omit TRAVEL_CHAT_ACCESS_CODE, never contact DeepSeek.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const salt='cloud-login-test-salt',env={OPS_SESSION_SECRET:'cloud-login-test-secret-minimum-32-characters',OPS_USERS_JSON:JSON.stringify({admin:{role:'admin',salt,hash:crypto.scryptSync('demo2026',salt,32).toString('hex')}}),DEEPSEEK_API_KEY:'test-fixture-key'};
if(process.env.TEST_PUBLIC==='1')env.TRAVEL_CHAT_PUBLIC='1';
let saved=require('../v5/operations').initial();const store={kind:'test-memory',read:async()=>saved,mutate:async fn=>fn(saved)};
const ops=require('../v5/ops-api').createOps({env,store}),chat=require('../v5/cloud-chat').createCloudChat({env,store,fetcher:async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({intent:{kind:'other'},text:'I can help plan a relaxed visit with your parents.',source_ids:[]})}}],usage:{prompt_tokens:30,completion_tokens:10,total_tokens:40}}))});
const root=path.resolve(__dirname,'../dist');
http.createServer((req,res)=>{const p=new URL(req.url,'http://local').pathname;
 if(p==='/api/ops')return ops(req,res);
 if(p==='/api/chat')return chat(req,res);
 if(p==='/api/admin-login-info')return require('../v5/admin-login-config').respond(req,res,{env,original:{...env,VERCEL:'1'},generated:false});
 if(p.startsWith('/api/')){res.writeHead(404,{'Content-Type':'application/json'});return res.end('{}');}
 const file=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'});fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT||4196),'127.0.0.1');
