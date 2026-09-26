'use strict';
// Intentionally public demo credentials. Never expose custom environment credentials.
const crypto=require('node:crypto');
const accounts=[{username:'admin',password:'demo2026',role:'admin'},
 ...Array.from({length:5},(_,i)=>({username:'reviewer'+(i+1),password:'review2026-'+(i+1),role:'reviewer'}))];
function configured(env){
 if(env.OPS_PUBLIC_DEMO_ACCOUNTS!=='1'||String(env.OPS_SESSION_SECRET||'').length<24)return [];
 let users;try{users=JSON.parse(env.OPS_USERS_JSON||'{}');}catch(_){return [];}
 return accounts.filter(a=>{const u=users[a.username];if(!u||u.role!==a.role||typeof u.salt!=='string'||!/^[a-f0-9]{64}$/i.test(u.hash))return false;
  return crypto.timingSafeEqual(crypto.scryptSync(a.password,u.salt,32),Buffer.from(u.hash,'hex'));
 }).map(a=>({...a}));
}
function provision(){return Object.fromEntries(accounts.map(a=>{const salt=crypto.randomBytes(16).toString('hex');return[a.username,{role:a.role,salt,hash:crypto.scryptSync(a.password,salt,32).toString('hex')}];}));}
module.exports={accounts,configured,provision};
