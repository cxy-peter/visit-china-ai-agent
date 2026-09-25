'use strict';
// Only the built-in local demo credential may be returned to an actual loopback client.
// Custom credentials, hashes, signing secrets and provider keys are never returned.
const crypto=require('node:crypto');
const loopback=value=>['localhost','127.0.0.1','::1','[::1]','::ffff:127.0.0.1'].includes(String(value||'').toLowerCase());
function localEnvironment(env){return !env.VERCEL&&env.NODE_ENV!=='production'&&!env.OIDC_ISSUER&&!env.OIDC_ISSUER_URL&&!env.BLOB_STORE_ID&&!env.BLOB_READ_WRITE_TOKEN&&loopback(env.HOST||'127.0.0.1');}
function localRequest(req){try{
 if(!loopback(req.socket?.remoteAddress))return false;
 const url=new URL('http://'+req.headers.host);if(!loopback(url.hostname))return false;
 if(req.headers['x-forwarded-host']||req.headers['x-forwarded-for']||req.headers['forwarded'])return false;
 if(req.headers.origin&&new URL(req.headers.origin).origin!==url.origin)return false;
 if(req.headers['sec-fetch-site']==='cross-site')return false;
 return true;
}catch(_){return false;}}
function legacyPassword(env){return env.ADMIN_PASSWORD||(localEnvironment(env)?'demo2026':'');}
function prepare(env,runtime){
 const effective={...env};let generated=false;
 // Never replace a partial, custom, production or SSO account configuration.
 if(localEnvironment(env)&&env.LOCAL_DEMO_ADMIN!=='0'&&!env.OPS_USERS_JSON&&!env.OPS_SESSION_SECRET){
  const password=legacyPassword(env),salt=crypto.randomBytes(16).toString('hex');
  effective.OPS_USERS_JSON=JSON.stringify({admin:{role:'admin',salt,hash:crypto.scryptSync(password,salt,32).toString('hex')}});
  effective.OPS_SESSION_SECRET=crypto.randomBytes(32).toString('hex');
  if(runtime&&!effective.LOCAL_DATA_DIR)effective.LOCAL_DATA_DIR=runtime;
  generated=true;
 }
 return {env:effective,generated,original:env};
}
function configuration(env){try{
 const users=JSON.parse(env.OPS_USERS_JSON||'{}'),admin=users?.admin;
 if(!admin?.salt||!admin?.hash||admin.role!=='admin'||String(env.OPS_SESSION_SECRET||'').length<24)return 'missing';
 if(typeof admin.salt!=='string'||typeof admin.hash!=='string'||!/^[a-f0-9]{64}$/i.test(admin.hash))return 'invalid';
 return 'configured';
}catch(_){return 'invalid';}}
function info(req,prepared,realm='operations'){
 const original=prepared.original||prepared.env,env=prepared.env;
 const allowed=localEnvironment(original)&&localRequest(req),legacy=realm==='local';
 const configured=legacy?(!!legacyPassword(original)?'configured':'missing'):configuration(env);
 const defaultActive=allowed&&original.LOCAL_DEMO_ADMIN!=='0'&&legacyPassword(original)==='demo2026'&&(legacy||prepared.generated);
 let message=defaultActive?'本地演示账号已实际填入，点击登录即可；密码框可显示。':configured==='invalid'?'账号配置格式有误，请在服务端检查 OPS_USERS_JSON 与 OPS_SESSION_SECRET；不会用默认密码覆盖。':configured==='missing'?'Operations 尚未配置账号或签名密钥。旧版 ADMIN_PASSWORD 不等于线上 Operations 账号；请先配置并重启服务。':legacy?'当前使用自定义本机密码，请输入实际 ADMIN_PASSWORD；默认演示密码未启用。':'当前使用服务端自定义账号。请输入实际 Operations 密码，或在本机导入私人账号文件；默认演示密码不适用。';
 return {realm:legacy?'local':'operations',configured:configured==='configured',status:configured,prefill:defaultActive?{username:'admin',password:'demo2026'}:{username:'admin'},localDemo:defaultActive,message};
}
function respond(req,res,prepared){
 const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 if(req.method!=='GET')return json(405,{error:'METHOD_NOT_ALLOWED'});
 if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return json(403,{error:'ORIGIN_NOT_ALLOWED'});}catch(_){return json(403,{error:'ORIGIN_NOT_ALLOWED'});}}
 const realm=new URL(req.url,'http://local').searchParams.get('realm');
 return json(200,info(req,prepared,realm));
}
module.exports={loopback,localEnvironment,localRequest,legacyPassword,prepare,configuration,info,respond};
