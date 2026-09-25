'use strict';
// Stateless paid-chat endpoint. Durable review/governance stays on the existing Node backend.
const crypto=require('node:crypto'),E=require('./engine'),{assist}=require('./assistant'),{createModel}=require('../v4/server');
const equal=(a,b)=>crypto.timingSafeEqual(crypto.createHash('sha256').update(String(a)).digest(),crypto.createHash('sha256').update(String(b)).digest());
function createCloudChat({env=process.env,fetcher=fetch,now=()=>Date.now()}={}){
 const model=createModel(env,fetcher);model.configure({maxTokens:800});const access=env.TRAVEL_CHAT_ACCESS_CODE||'';let budget={at:now(),calls:0};
 const sign=text=>crypto.createHmac('sha256',access).update(text).digest('base64url');
 const token=()=>{const body=Buffer.from(JSON.stringify({expires:now()+8*3600000,nonce:crypto.randomBytes(16).toString('hex')})).toString('base64url');return body+'.'+sign(body);};
 function authorized(req){const t=(req.headers.cookie||'').match(/(?:^|;\s*)vc_chat=([A-Za-z0-9_.-]+)(?:;|$)/)?.[1];if(!t||access.length<24)return false;const [body,mac,...extra]=t.split('.');try{return !extra.length&&equal(sign(body),mac)&&JSON.parse(Buffer.from(body,'base64url')).expires>now();}catch(_){return false;}}
 const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
 async function body(req){if(!String(req.headers['content-type']).startsWith('application/json'))throw Error('JSON_REQUIRED');if(req.body!==undefined){const text=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(text)>96000)throw Error('BODY_TOO_LARGE');return JSON.parse(text);}let size=0,parts=[];for await(const p of req){size+=p.length;if(size>96000)throw Error('BODY_TOO_LARGE');parts.push(p);}return JSON.parse(Buffer.concat(parts).toString());}
 return async(req,res)=>{
  try{
   if(req.method==='GET')return json(res,200,{backend:'vercel-chat',version:E.VERSION,configured:model.status().configured,accessReady:access.length>=24,authorized:authorized(req),model:env.DEEPSEEK_MODEL||'deepseek-flash',persistence:'browser conversation; no cloud archive or governance database'});
   if(req.method!=='POST')return json(res,405,{error:'METHOD_NOT_ALLOWED'});
   if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)throw Error('ORIGIN_NOT_ALLOWED');
   const b=await body(req);if(!b||typeof b!=='object'||Array.isArray(b))throw Error('BODY_OBJECT');
   if(access.length<24)return json(res,503,{error:'CHAT_ACCESS_NOT_CONFIGURED'});
   if(b.action==='login'){
    if(typeof b.accessCode!=='string'||b.accessCode.length>200||!equal(b.accessCode,access))return json(res,401,{error:'ACCESS_CODE_INVALID'});
    res.setHeader('Set-Cookie','vc_chat='+token()+'; HttpOnly; SameSite=Strict; Path=/api/chat; Max-Age=28800'+(env.VERCEL||env.NODE_ENV==='production'?'; Secure':''));return json(res,200,{authorized:true});
   }
   if(b.action==='logout'){res.setHeader('Set-Cookie','vc_chat=; HttpOnly; SameSite=Strict; Path=/api/chat; Max-Age=0'+(env.VERCEL||env.NODE_ENV==='production'?'; Secure':''));return json(res,200,{authorized:false});}
   if(b.action!=='answer')throw Error('ACTION_NOT_ALLOWED');
   if(!authorized(req))return json(res,401,{error:'CHAT_ACCESS_REQUIRED'});
   if(b.modelConsent!==true)throw Error('MODEL_CONSENT_REQUIRED');
   if(!model.status().configured)return json(res,503,{error:'DEEPSEEK_KEY_MISSING'});
   if(!Number.isSafeInteger(b.revision)||b.revision<1||!b.memory||!Array.isArray(b.memory.history)||!b.memory.history.length)throw Error('CONVERSATION_REQUIRED');
   const state=E.restoreMemory({...b.memory,history:b.memory.history.slice(-12)});state.revision=b.revision;state.history.at(-1).revision=b.revision;
   const last=state.history.at(-1);if(last.channel==='voice'&&!E.speechDecision(last.text,state).accepted)return json(res,200,{mode:'ignored',revision:b.revision});
   if(E.reply(state).urgent||['poor','offline'].includes(state.facts.network))return json(res,200,{mode:'context-limited',revision:b.revision});
   // Secondary per-instance throttle, not a durable global billing limit. Access is private.
   if(now()-budget.at>3600000)budget={at:now(),calls:0};if(++budget.calls>Math.min(120,Number(env.MAX_MODEL_CALLS_PER_HOUR||30)))return json(res,429,{error:'MODEL_BUDGET'});
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),28000);res.on('close',()=>{if(!res.writableEnded)controller.abort();});
   try{const answer=await assist({state,model,signal:controller.signal});return json(res,200,{answer,revision:b.revision});}finally{clearTimeout(timer);}
  }catch(e){const code=/^(?:JSON_REQUIRED|BODY_TOO_LARGE|BODY_OBJECT|ORIGIN_NOT_ALLOWED|ACTION_NOT_ALLOWED|MODEL_CONSENT_REQUIRED|CONVERSATION_REQUIRED|ANSWER_\w+|DEEPSEEK_HTTP_\d+|MODEL_OUTPUT_TRUNCATED)$/.test(e.message)?e.message:'CHAT_TEMPORARILY_UNAVAILABLE';return json(res,/REQUIRED|ORIGIN/.test(code)?403:/TOO_LARGE/.test(code)?413:/DEEPSEEK|TEMPORARILY/.test(code)?502:400,{error:code});}
 };
}
module.exports={createCloudChat};
