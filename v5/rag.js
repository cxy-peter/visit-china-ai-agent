'use strict';
// Reproducible, dependency-free sparse retrieval. These vectors are NOT learned embeddings.
const crypto=require('node:crypto'),L=require('./library'),Q=require('./confidence');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,16);
const aliases=[[/地铁|subway|metro/gi,' metro 地铁'],[/火车|高铁|train|railway/gi,' rail 火车 高铁'],[/酒店|住宿|hotel/gi,' hotel 酒店'],[/寄存|存包|luggage|storage|bounce/gi,' luggage 行李 寄存'],[/充电宝|power bank|charging/gi,' charging 充电宝'],[/买票|购票|tickets?/gi,' ticket 购票'],[/豫园|yu garden|yuyuan/gi,' 豫园 yuyuan'],[/人民广场|people.?s square/gi,' 人民广场'],[/浦东机场|pudong airport|pvg/gi,' 浦东机场']];
function normalize(s){let q=String(s||'').toLowerCase();for(const [p,v] of aliases)q=q.replace(p,m=>m+' '+v);return q;}
function tokens(s){const q=normalize(s),en=q.match(/[a-z0-9]{2,}/g)||[],cn=q.match(/[\u3400-\u9fff]+/g)||[];return [...en,...cn.flatMap(w=>w.length===1?[w]:Array.from({length:w.length-1},(_,i)=>w.slice(i,i+2)))];}
function chunks(records,{chunkSize=520,overlap=60,city=null}={}){
 const rows=[];
 for(const r of records){if(!L.current(r)||Q.source(r).score<=60||!(r.content||r.summaryZh||r.summary)||city&&r.city&&r.city!=='China'&&r.city!==city)continue;
  const body=[r.title,(r.topics||[]).join(' '),r.content||[r.summaryZh,r.summary].filter(Boolean).join('\n')].join('\n').replace(/<[^>]*>/g,' ').replace(/\r/g,'').trim(),version=hash(body+String(r.publicationHash||r.reviewedAt));
  for(let start=0,index=0;start<body.length;start+=chunkSize-overlap,index++){
   const text=body.slice(start,start+chunkSize);rows.push({id:r.id+':'+version+':'+index,sourceId:r.id,version,index,start,end:start+text.length,title:r.title,city:r.city,text,url:r.url,reviewedAt:r.reviewedAt,recordType:r.recordType||'summary',sourceType:r.sourceType||r.kind});if(start+chunkSize>=body.length)break;
  }
 }
 return rows;
}
// Explicit immutable-input snapshot for batch evaluation. Production retrieve() compiles
// the current catalog on every call, so publication holds/expiry never hit a stale cache.
function compile(records,config={}){
 const all=chunks(records,config),df=new Map(),docs=all.map(c=>{const terms=tokens(c.text),tf=new Map();for(const t of terms)tf.set(t,(tf.get(t)||0)+1);for(const t of tf.keys())df.set(t,(df.get(t)||0)+1);return{...c,tf,len:terms.length};});
 const avg=docs.reduce((s,d)=>s+d.len,0)/Math.max(1,docs.length),idf=t=>Math.log(1+(docs.length-(df.get(t)||0)+.5)/((df.get(t)||0)+.5));
 for(const d of docs){d.norm=0;for(const [t,n] of d.tf){const w=(1+Math.log(n))*idf(t);d.norm+=w*w;}}
 return{all,docs,df,avg,idf,config:{...config},compiledAt:new Date().toISOString(),fingerprint:hash(JSON.stringify(all.map(c=>[c.id,c.text])))};
}
function retrieve(query,records,config={}){const started=Date.now(),out=retrievePrepared(query,compile(records,config),config);out.elapsedMs=Date.now()-started;return out;}
function retrievePrepared(query,prepared,overrides={}){
 if(!prepared||!Array.isArray(prepared.docs)||typeof prepared.idf!=='function')throw Error('RAG_PREPARED_REQUIRED');
 for(const key of ['chunkSize','overlap','city'])if(Object.hasOwn(overrides,key)&&overrides[key]!==prepared.config[key])throw Error('RAG_SNAPSHOT_CONFIG_MISMATCH');
 const started=Date.now(),config={...prepared.config,...overrides},{all,docs,avg,idf}=prepared,q=tokens(query+' '+(config.expansion||'')),qset=new Set(q);
 // A location preamble is context, not the requested service. Keep its terms
 // with lower weight so an airport name cannot crowd out a metro-ticket question.
 const focus=String(query).replace(/^(?:near\s+|around\s+|at\s+|(?:我)?在)[^,，]{1,160}[,，]\s*/i,''),focused=focus!==String(query),focusTerms=new Set(tokens(focus+' '+(config.expansion||'')));
 const named=d=>d.title.split(/\s*\/\s*/).some(t=>t.length>1&&query.toLowerCase().includes(t.toLowerCase()));
 const scored=docs.map(d=>{let bm25=0,dot=0,qn=0,dn=d.norm,matches=0;for(const t of qset){const n=d.tf.get(t)||0,base=idf(t),w=base*(focused&&!focusTerms.has(t)?.25:1);qn+=w*w;if(n){matches++;bm25+=w*n*2.2/(n+1.2*(.25+.75*d.len/Math.max(1,avg)));dot+=w*(1+Math.log(n))*base;}}return{...d,bm25,cosine:dot/Math.sqrt(Math.max(1,qn*dn)),matches,named:named(d)};}).filter(d=>d.matches>=Math.min(d.named?1:2,qset.size)&&d.bm25>0);
 const a=[...scored].sort((x,y)=>y.bm25-x.bm25),b=[...scored].sort((x,y)=>y.cosine-x.cosine),ranks=new Map(b.map((x,i)=>[x.id,i]));
 const ranked=a.map((d,i)=>{const rrf=1/(60+i+1)+1/(60+ranks.get(d.id)+1);const coverage=d.matches/Math.max(1,qset.size),named=d.named,weight=d.recordType==='station'?(named?1.4:.5):d.recordType==='place'?(named?1.3:.8):1.15;return{...d,score:rrf*(.65+.35*coverage)*weight,coverage};}).sort((a,b)=>b.score-a.score);
 // Diversify across parent documents; one verbose page cannot monopolize context.
 const pinned=[...new Set(config.pinnedIds||[])].slice(0,3).map(id=>all.find(c=>c.sourceId===id)).filter(Boolean).map(c=>({...c,bm25:0,cosine:0,score:0,coverage:0,pinned:true}));
 const hits=[...pinned],counts=new Map(pinned.map(c=>[c.sourceId,1]));for(const d of ranked){if(hits.some(h=>h.id===d.id)||(counts.get(d.sourceId)||0)>=2||!d.named&&d.coverage<(config.minCoverage??.06))continue;counts.set(d.sourceId,(counts.get(d.sourceId)||0)+1);const {tf,norm,...safe}=d;hits.push(safe);if(hits.length>=(config.topK||8))break;}
 return{method:'BM25 + sparse TF-IDF cosine + RRF + parent diversification',embedding:'none',reranker:'deterministic lexical/evidence reranking',query:String(query).slice(0,400),corpusChunks:all.length,candidates:scored.length,hits,elapsedMs:Date.now()-started};
}
function evidence(result){const out=[];for(const c of result.hits){let r=out.find(r=>r.id===c.sourceId);if(!r){r={id:c.sourceId,title:c.title,city:c.city,summary:'',chunkIds:[],reviewedAt:c.reviewedAt};out.push(r);}r.summary+=[r.summary?'\n':'',c.text].join('');r.chunkIds.push(c.id);}return out;}
function trace(result){return{method:result.method,embedding:result.embedding,reranker:result.reranker,corpusChunks:result.corpusChunks,candidates:result.candidates,elapsedMs:result.elapsedMs,hits:result.hits.map(c=>({id:c.id,sourceId:c.sourceId,version:c.version,score:Number(c.score.toFixed(5)),coverage:Number(c.coverage.toFixed(3))}))};}
module.exports={chunks,compile,retrieve,retrievePrepared,evidence,trace,tokens,hash};
