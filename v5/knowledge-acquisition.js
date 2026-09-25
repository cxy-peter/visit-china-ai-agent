'use strict';
const R=require('./rag'),B=require('./source-body'),L=require('./library'),O=require('./operations'),{HOSTS}=require('./source-refresh');
// Select only indexed/discovered URLs. A model cannot request arbitrary hosts, local IPs or secrets.
function select(query,s,pool=[]){
 const current=require('./ops-api').catalog(s),existing=new Map(current.map(r=>[r.id,r])),known=new Set(pool.map(r=>r.id)),terms=new Set(R.tokens(query));
 return [...L.records,...(s.newsCandidates||[])].filter(r=>!known.has(r.id)&&r.active!==false&&HOSTS.has(new URL(r.url).hostname)&&!existing.get(r.id)?.summary&&!existing.get(r.id)?.summaryZh&&!s.bodyAssessments?.some(x=>x.sourceId===r.id&&Date.now()-Date.parse(x.at)<86400000))
 .map(r=>({r,score:[...new Set(R.tokens(r.title+' '+(r.topics||[]).join(' ')))].filter(x=>terms.has(x)).length})).filter(x=>x.score>=3).sort((a,b)=>b.score-a.score).slice(0,1).map(x=>x.r.id);
}
function create({store,model,fetcher=fetch}){let calls=0;return async({query,intent,pool,signal})=>{
 if(calls>=1)return null;calls++;const s=await store.read()||O.initial(),ids=select(query,s,pool);if(!ids.length)return null;
 try{const result=await B.ingest(store,{sourceId:ids[0],query,model,fetcher,signal});return{records:require('./ops-api').catalog(await store.read()),trace:{status:result.eligible?'body-added':'review-required',sourceId:ids[0],score:result.score,eligible:result.eligible,method:'model-query → known URL → robots/body fetch → quoted evidence assessment',usage:result.usage}};}
 catch(e){signal?.throwIfAborted();return{records:require('./ops-api').catalog(await store.read()),trace:{status:'unavailable',sourceId:ids[0],reason:/^[A-Z_0-9]+$/.test(e.message)?e.message:'BODY_UNAVAILABLE'}};}
 };}
module.exports={create,select};
