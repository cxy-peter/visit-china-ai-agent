'use strict';
// Stateless paid-chat endpoint. Durable review/governance stays on the existing Node backend.
const crypto=require('node:crypto'),E=require('./engine'),{assist}=require('./assistant'),{createModel}=require('../v4/server');
const equal=(a,b)=>crypto.timingSafeEqual(crypto.createHash('sha256').update(String(a)).digest(),crypto.createHash('sha256').update(String(b)).digest());
function createCloudChat({env=process.env,fetcher=fetch,now=()=>Date.now(),store=null}={}){
 const publicAccess=env.TRAVEL_CHAT_PUBLIC==='1';const identities=require('./ops-auth').auth(env);const model=createModel(env,fetcher);model.configure({maxTokens:800});const access=env.TRAVEL_CHAT_ACCESS_CODE||'';let budget={at:now(),calls:0},kbBudget={at:0,calls:0};
 // Keep existing experience-code sessions valid; admin sessions need only the Operations secret.
 const legacyAccessReady=access.length>=24;
 const signingKey=legacyAccessReady?access:String(env.OPS_SESSION_SECRET||'').length>=24?crypto.createHmac('sha256',env.OPS_SESSION_SECRET).update('visit-china:chat-session:v1').digest('hex'):'';
 const accessReady=Boolean(signingKey);
 const sign=text=>crypto.createHmac('sha256',signingKey).update(text).digest('base64url');
 const token=grant=>{const body=Buffer.from(JSON.stringify({expires:Math.min(now()+8*3600000,grant?Date.parse(grant.expiresAt):Infinity),nonce:crypto.randomBytes(16).toString('hex'),grantId:grant?.id||null})).toString('base64url');return body+'.'+sign(body);};
 const durable=()=>store||(store=require('./ops-store').createStore(env));
 function session(req){const t=(req.headers.cookie||'').match(/(?:^|;\s*)vc_chat=([A-Za-z0-9_.-]+)(?:;|$)/)?.[1];if(!t||!accessReady)return false;const [body,mac,...extra]=t.split('.');try{const value=JSON.parse(Buffer.from(body,'base64url'));return !extra.length&&equal(sign(body),mac)&&value.expires>now()?value:null;}catch(_){return false;}}
 const authorized=req=>Boolean(session(req));
 const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
 async function body(req){if(!String(req.headers['content-type']).startsWith('application/json'))throw Error('JSON_REQUIRED');if(req.body!==undefined){const text=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(text)>96000)throw Error('BODY_TOO_LARGE');return JSON.parse(text);}let size=0,parts=[];for await(const p of req){size+=p.length;if(size>96000)throw Error('BODY_TOO_LARGE');parts.push(p);}return JSON.parse(Buffer.concat(parts).toString());}
 return async(req,res)=>{
  let attempted=false,evaluation=false;try{
   if(req.method==='GET'){const signed=session(req);if(!publicAccess&&signed?.grantId){try{require('./trial-access').byId(await durable().read()||{},signed.grantId,now());}catch(e){return json(res,200,{backend:'vercel-chat',version:E.VERSION,configured:model.status().configured,publicAccess,accessReady:publicAccess||accessReady,legacyAccessReady,adminLoginConfigured:identities.configured,authorized:false,accessError:e.message});}}return json(res,200,{backend:'vercel-chat',version:E.VERSION,configured:model.status().configured,publicAccess,accessReady:publicAccess||accessReady,legacyAccessReady,adminLoginConfigured:identities.configured,authorized:publicAccess||authorized(req),adminConnectReady:identities.actor(req)?.role==='admin',model:env.DEEPSEEK_MODEL||'deepseek-flash',persistence:'browser conversation; private durable operations and approved source library'});}
   if(req.method!=='POST')return json(res,405,{error:'METHOD_NOT_ALLOWED'});
   if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)throw Error('ORIGIN_NOT_ALLOWED');
   const b=await body(req);if(!b||typeof b!=='object'||Array.isArray(b))throw Error('BODY_OBJECT');
   if(b.action==='kb'){const kbStarted=Date.now();
    if(typeof b.text!=='string'||b.text.length>600||!['en','zh'].includes(b.language))throw Error('CONVERSATION_REQUIRED');
    if(!require('./kb-direct').hasQuestion(b.text))return json(res,200,{matched:false,reason:'no-approved-exact-question'});
    if(now()-kbBudget.at>60000)kbBudget={at:now(),calls:0};if(++kbBudget.calls>60)return json(res,429,{error:'KB_RATE_LIMIT'});
    let records=require('./library').records;
    if(env.BLOB_STORE_ID||env.BLOB_READ_WRITE_TOKEN||env.CLOUD_OPERATIONS==='1')records=require('./ops-api').catalog(await durable().read()||require('./operations').initial());
    const result=require('./kb-direct').lookup(b.text,{city:b.city,language:b.language,records});
    if(result.matched){result.answer.execution={kb:result.trace,stages:[{name:'kb_direct',status:'completed'},{name:'verify',status:'completed'}],totalMs:Date.now()-kbStarted};result.answer.dataset=b.evaluation===true&&identities.actor(req)?.role==='admin'?'evaluation':'live';if(env.BLOB_STORE_ID||env.BLOB_READ_WRITE_TOKEN||env.CLOUD_OPERATIONS==='1')try{result.answer.executionId=await durable().mutate(s=>require('./harness').observe(s,result.answer));}catch(_){result.answer.telemetrySaved=false;}}
    return json(res,200,{matched:result.matched,reason:result.reason,...(result.matched?{answer:result.answer}:{})});
   }
   if(!accessReady&&!publicAccess)return json(res,503,{error:'CHAT_ACCESS_NOT_CONFIGURED'});
   if(b.action==='login'||b.action==='admin-connect'){if(!accessReady)return json(res,503,{error:'CHAT_ACCESS_NOT_CONFIGURED'});let grant=null;
    if(b.action==='admin-connect'){if(identities.actor(req)?.role!=='admin')return json(res,403,{error:'ADMIN_LOGIN_REQUIRED'});if(b.modelConsent!==true)throw Error('MODEL_CONSENT_REQUIRED');}
    else {const A=require('./access-code');if(A.apiKey(b.accessCode))return json(res,400,{error:'API_KEY_IS_NOT_EXPERIENCE_CODE'});const supplied=A.parse(b.accessCode);if(!supplied)return json(res,401,{error:'ACCESS_CODE_INVALID'});if(!legacyAccessReady||!equal(supplied,access.trim())){if(!/^VC-(?:[A-F0-9]{5}-){3}[A-F0-9]{5}$/.test(supplied))return json(res,401,{error:'ACCESS_CODE_INVALID'});const saved=await durable().read();grant=require('./trial-access').find(saved||{},supplied,now());if(!grant)return json(res,401,{error:'ACCESS_CODE_INVALID'});}}
    res.setHeader('Set-Cookie','vc_chat='+token(grant)+'; HttpOnly; SameSite=Strict; Path=/api/chat; Max-Age=28800'+(env.VERCEL||env.NODE_ENV==='production'?'; Secure':''));return json(res,200,{authorized:true});
   }
   if(b.action==='logout'){res.setHeader('Set-Cookie','vc_chat=; HttpOnly; SameSite=Strict; Path=/api/chat; Max-Age=0'+(env.VERCEL||env.NODE_ENV==='production'?'; Secure':''));return json(res,200,{authorized:false});}
   if(b.action!=='answer')throw Error('ACTION_NOT_ALLOWED');
   const signed=publicAccess?{}:session(req);if(!signed)return json(res,401,{error:'CHAT_ACCESS_REQUIRED'});
   if(b.modelConsent!==true)throw Error('MODEL_CONSENT_REQUIRED');
   if(!model.status().configured)return json(res,503,{error:'DEEPSEEK_KEY_MISSING'});
   if(!Number.isSafeInteger(b.revision)||b.revision<1||!b.memory||!Array.isArray(b.memory.history)||!b.memory.history.length)throw Error('CONVERSATION_REQUIRED');
   const state=E.restoreMemory({...b.memory,history:b.memory.history.slice(-12)});state.revision=b.revision;state.history.at(-1).revision=b.revision;
   const route=require('./model-routing').select(state,b.modelMode||'auto'),requestModel=require('./model-routing').scoped(model,route);const last=state.history.at(-1);if(last.channel==='voice'&&!E.speechDecision(last.text,state,true).accepted)return json(res,200,{mode:'ignored',revision:b.revision});
   if(E.reply(state).urgent||['poor','offline'].includes(state.facts.network))return json(res,200,{mode:'context-limited',revision:b.revision});
   // Secondary per-instance throttle, not a durable global billing limit.
   if(now()-budget.at>3600000)budget={at:now(),calls:0};if(++budget.calls>Math.min(120,Number(env.MAX_MODEL_CALLS_PER_HOUR||30)))return json(res,429,{error:'MODEL_BUDGET'});
   const grantId=signed.grantId;if(grantId)await durable().mutate(s=>require('./trial-access').consume(s,grantId,typeof b.requestId==='string'&&/^[-\w]{8,90}$/.test(b.requestId)?b.requestId:crypto.randomUUID(),now()));
   attempted=true;evaluation=b.evaluation===true&&identities.actor(req)?.role==='admin';const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),110000);res.on('close',()=>{if(!res.writableEnded)controller.abort();});
   try{let records=require('./library').records,skillConfig=require('./harness').DEFAULT;if(env.BLOB_STORE_ID||env.BLOB_READ_WRITE_TOKEN||env.CLOUD_OPERATIONS==='1'){const stored=await durable().read()||require('./operations').initial();records=require('./ops-api').catalog(stored);skillConfig=require('./harness').state(stored).active;const version=b.policyVersion;const published=stored.governance.candidates.find(c=>c.publishedVersion===version&&c.status==='published');const previous=stored.governance.candidates.find(c=>c.previous?.version===version)?.previous;state.policy=published?{...published.config,version}:previous||stored.governance.active;}const acquire=(env.BLOB_STORE_ID||env.BLOB_READ_WRITE_TOKEN||env.CLOUD_OPERATIONS==='1')?require('./knowledge-acquisition').create({store:durable(),model,fetcher}):null;const answer=await assist({state,model:requestModel,signal:controller.signal,records,skillConfig,acquire});if(answer.execution?.acquisition)answer.sourceAcquisition=answer.execution.acquisition;answer.modelRouting=route;answer.dataset=b.evaluation===true&&identities.actor(req)?.role==='admin'?'evaluation':'live';if(answer.confidence&&(env.BLOB_STORE_ID||env.BLOB_READ_WRITE_TOKEN||env.CLOUD_OPERATIONS==='1')){try{answer.assessmentId=await durable().mutate(s=>{answer.executionId=require('./harness').observe(s,answer);return require('./operations').assessment(s,answer);});answer.confidence.reviewRecorded=true;}catch(_){answer.confidence.reviewRecorded=false;}}return json(res,200,{answer,revision:b.revision});}finally{clearTimeout(timer);}
  }catch(e){if(res.destroyed||e.name==='AbortError')return res.destroyed?undefined:json(res,409,{error:'CANCELLED'});const code=/^(?:JSON_REQUIRED|BODY_TOO_LARGE|BODY_OBJECT|ORIGIN_NOT_ALLOWED|ACTION_NOT_ALLOWED|MODEL_CONSENT_REQUIRED|CONVERSATION_REQUIRED|MODEL_MODE_INVALID|TRIAL_\w+|ANSWER_\w+|DEEPSEEK_HTTP_\d+|MODEL_OUTPUT_TRUNCATED)$/.test(e.message)?e.message:'CHAT_TEMPORARILY_UNAVAILABLE';if(attempted&&(env.BLOB_STORE_ID||env.BLOB_READ_WRITE_TOKEN||env.CLOUD_OPERATIONS==='1'))try{await durable().mutate(s=>{s.failures=(s.failures||[]).filter(r=>now()-r.at<30*86400000).concat({id:crypto.randomUUID(),at:now(),code,dataset:evaluation?'evaluation':'live'}).slice(-500);});}catch(_){}return json(res,/REQUIRED|ORIGIN/.test(code)?403:/TOO_LARGE/.test(code)?413:/DEEPSEEK|TEMPORARILY/.test(code)?502:400,{error:code,...(evaluation&&e.schemaIssue?{schemaIssue:e.schemaIssue}:{})});}
 };
}
module.exports={createCloudChat};
