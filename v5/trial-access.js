'use strict';
const crypto=require('node:crypto');
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const publicRow=r=>({id:r.id,label:r.label,createdAt:r.createdAt,expiresAt:r.expiresAt,revokedAt:r.revokedAt||null,maxTurns:r.maxTurns,usedTurns:r.usedTurns});
function list(s){return(s.trialCodes||[]).map(publicRow).reverse();}
function issue(s,actor,{label='',days=7,maxTurns=100}={},now=Date.now()){
 if(typeof label!=='string'||label.length>80||!Number.isInteger(days)||days<1||days>90||!Number.isInteger(maxTurns)||maxTurns<1||maxTurns>1000)throw Error('TRIAL_CONFIG');
 s.trialCodes||=[];if(s.trialCodes.length>=100)throw Error('TRIAL_LIMIT');
 const code='VC-'+crypto.randomBytes(10).toString('hex').toUpperCase().match(/.{1,5}/g).join('-');
 const row={id:crypto.randomUUID(),label:label.trim()||'旅行体验',hash:hash(code),createdBy:actor,createdAt:new Date(now).toISOString(),expiresAt:new Date(now+days*86400000).toISOString(),usedTurns:0,maxTurns,revokedAt:null};s.trialCodes.push(row);return{...publicRow(row),code};
}
function find(s,code,now=Date.now()){const digest=hash(code);const r=(s.trialCodes||[]).find(r=>r.hash===digest);if(!r)return null;assertActive(r,now);return publicRow(r);}
function assertActive(r,now){if(!r||r.revokedAt)throw Error('TRIAL_REVOKED');if(Date.parse(r.expiresAt)<=now)throw Error('TRIAL_EXPIRED');if(r.usedTurns>=r.maxTurns)throw Error('TRIAL_EXHAUSTED');}
function byId(s,id,now=Date.now()){const r=(s.trialCodes||[]).find(r=>r.id===id);assertActive(r,now);return publicRow(r);}
function consume(s,id,requestId,now=Date.now()){const r=(s.trialCodes||[]).find(r=>r.id===id);assertActive(r,now);r.requests||=[];if(r.requests.includes(requestId))throw Error('TRIAL_REQUEST_REPLAY');r.usedTurns++;r.requests.push(requestId);r.requests=r.requests.slice(-1000);return publicRow(r);}
function revoke(s,id,now=Date.now()){const r=(s.trialCodes||[]).find(r=>r.id===id);if(!r)throw Error('TRIAL_NOT_FOUND');r.revokedAt=new Date(now).toISOString();return publicRow(r);}
module.exports={issue,list,find,byId,consume,revoke};
