/* Approved exact-answer path. Misses always fall through; no fuzzy policy decisions. */
'use strict';
const crypto=require('node:crypto'),L=require('./library'),Cities=require('./city-scope'),Q=require('./confidence');
const entries=require('./kb-entries.json');
const fields=['url','city','jurisdiction','channels','summary','summaryZh','content','published','reviewedAt','publicationHash'];
const fingerprint=r=>crypto.createHash('sha256').update(JSON.stringify(fields.map(k=>r[k]??null))).digest('hex');
const normalized=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s?？!！。.,，]+/g,'');
function hasQuestion(request){return entries.some(e=>e.languageIndependentAliases.some(q=>normalized(q)===normalized(request)));}
function lookup(request,{city=null,language='en',records=L.records,registry=entries}={}){
 const exact=registry.filter(e=>e.status==='approved'&&e.languageIndependentAliases.some(q=>normalized(q)===normalized(request)));
 if(!exact.length)return{matched:false,reason:'no-approved-exact-question'};
 const actualCity=Cities.detect(request)||Cities.canonical(city),valid=[];
 for(const entry of exact){const source=records.find(r=>r.id===entry.sourceId);if(!source||!L.current(source)||Q.source(source).score<60)continue;if(!Cities.applies(source,actualCity)||actualCity!==entry.city)continue;if(fingerprint(source)!==entry.sourceHash)continue;valid.push({entry,source});}
 if(valid.length!==1)return{matched:false,reason:valid.length?'ambiguous-approved-answers':'source-or-scope-needs-review'};
 const {entry,source}=valid[0],text=language==='zh'?source.summaryZh:source.summary;
 if(!text)return{matched:false,reason:'approved-language-missing'};
 return{matched:true,answer:{text,sourceIds:[source.id],mode:'kb-direct',intentProvider:'approved-kb',intent:{kind:entry.kind,city:entry.city,responseMode:'service'},notice:'approved-saved-answer-not-live',usage:{prompt_tokens:0,completion_tokens:0,total_tokens:0},confidence:Q.answer({kind:entry.kind},[source],{text},null)},trace:{matched:true,entryId:entry.id,entryVersion:entry.version,sourceId:source.id,sourceHash:entry.sourceHash,modelCalls:0,reason:'approved-exact-question-and-current-source'}};
}
module.exports={hasQuestion,lookup,fingerprint,normalized,entries};
