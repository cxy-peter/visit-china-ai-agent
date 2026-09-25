'use strict';
const crypto=require('node:crypto');
const equal=(a,b)=>crypto.timingSafeEqual(crypto.createHash('sha256').update(String(a)).digest(),crypto.createHash('sha256').update(String(b)).digest());
function auth(env){const secret=env.OPS_SESSION_SECRET||'',users=JSON.parse(env.OPS_USERS_JSON||'{}');
 const sign=v=>crypto.createHmac('sha256',secret).update(v).digest('base64url');
 function issue(value){if(secret.length<24)throw Error('OPS_AUTH_NOT_CONFIGURED');const text=Buffer.from(JSON.stringify({...value,expires:Date.now()+28800000})).toString('base64url');return text+'.'+sign(text);}
 function verify(req,name){if(secret.length<24)return null;const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1);if(!token)return null;try{const [body,mac,...extra]=token.split('.');if(extra.length||!equal(sign(body),mac))return null;const value=JSON.parse(Buffer.from(body,'base64url'));return value.expires>Date.now()?value:null;}catch(_){return null;}}
 function actor(req){const value=verify(req,'vc_ops');return value&&users[value.actor]?{name:value.actor,role:users[value.actor].role}:null;}
 function login(name,password){const u=typeof name==='string'&&Object.hasOwn(users,name)?users[name]:null;if(!u||!u.salt||!u.hash||typeof password!=='string'||password.length>200)return null;return equal(crypto.scryptSync(password,u.salt,32).toString('hex'),u.hash)?{name,role:u.role}:null;}
 function cookie(name,value,remove=false){return name+'='+value+'; HttpOnly; SameSite=Strict; Path=/api; Max-Age='+(remove?0:28800)+(env.VERCEL||env.NODE_ENV==='production'?'; Secure':'');}
 return{configured:secret.length>=24&&Boolean(users.admin),users,issue,verify,actor,login,cookie,reviewers:new Set(Object.keys(users).filter(u=>users[u].role==='reviewer'))};
}
module.exports={auth,equal};
