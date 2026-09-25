/* Bounded lexical rewrite validation and multi-query RRF. Never trains model weights. */
'use strict';
const R=require('./rag'),Cities=require('./city-scope');
const tokens=s=>new Set(R.tokens(s));
const protectedPatterns=[/\b(?:alipay|wechat|weixin|jcb|amex|visa|mastercard|12306|mtr|pvg|sha|pek|pkx|szx|hkg)\b/gi,/支付宝|支付寶|微信|港铁|港鐵|机场快线|機場快綫|银联|銀聯|美运|美運/g,/\d+(?:\.\d+)?\s*%?/g];
function constraints(s){return [...new Set(protectedPatterns.flatMap(rx=>String(s).match(rx)||[]).map(x=>x.toLowerCase().replace(/\s+/g,'')))];}
const negation=s=>/(?:\b(?:not|no|without|never|don't|isn't|can't)\b|不是|不想|不能|不要|没有|未订|没订)/i.test(s);
function check(original,hint,context={}){if(typeof hint!=='string'||!hint.trim()||hint.length>200)return'empty-or-too-long';if(/https?:|ignore.{0,20}instruction|system prompt|忽略.{0,20}指令|<|>/i.test(hint))return'unsafe-rewrite';
 const oc=Cities.mentioned(original),hc=Cities.mentioned(hint);if(hc.some(c=>!oc.includes(c)&&c!==Cities.canonical(context.city))||oc.some(c=>!hc.includes(c)))return'city-changed-or-dropped';
 const a=constraints(original),b=constraints(hint);if(a.some(x=>!b.includes(x))||b.some(x=>!a.includes(x)))return'channel-entity-or-number-changed';
 if(negation(original)!==negation(hint))return'negation-changed';
 // Negations are not paraphrased automatically; preserve their literal clause.
 if(negation(original)&&!hint.toLowerCase().includes(original.toLowerCase()))return'negation-requires-original';
 const x=tokens(original),y=tokens(hint),shared=[...y].filter(t=>x.has(t)).length;if(shared<Math.min(2,x.size)||shared/Math.max(1,y.size)<.25)return'weak-lexical-anchor';return null;}
function plan(original,hints=[],context={}){const q=String(original).trim(),queries=[q],decisions=[];for(const h of hints.slice(0,2)){const reason=check(q,h,context);decisions.push({accepted:!reason,reason:reason||'anchored-hint'});if(!reason){const combined=q+' '+h.trim();if(!queries.includes(combined))queries.push(combined);}}return{queries:queries.slice(0,3),decisions,originalRetained:true,scope:'Original request retained; guarded lexical hints, not unrestricted paraphrasing.'};}
function retrieve(original,hints,records,config={}){const started=Date.now(),p=plan(original,hints,config),snapshot=R.compile(records,config),runs=p.queries.map(q=>R.retrievePrepared(q,snapshot,config));if(runs.length===1)return{...runs[0],queryPlan:{variants:1,originalRetained:true,decisions:p.decisions},elapsedMs:Date.now()-started};
 const merged=new Map();runs.forEach((run,index)=>run.hits.forEach((h,rank)=>{let e=merged.get(h.id);if(!e){e={...h,score:0,queryRanks:[]};merged.set(h.id,e);}e.score+=(index===0?1:.65)/(60+rank+1);e.queryRanks.push({query:index,rank:rank+1});}));
 const counts=new Map(),hits=[];for(const h of [...merged.values()].sort((a,b)=>b.score-a.score)){if((counts.get(h.sourceId)||0)>=2)continue;hits.push(h);counts.set(h.sourceId,(counts.get(h.sourceId)||0)+1);if(hits.length>=(config.topK||8))break;}
 return{...runs[0],method:'Original-preserving multi-query RRF over BM25/TF-IDF',hits,candidates:Math.max(...runs.map(r=>r.candidates)),queryPlan:{variants:runs.length,originalRetained:true,decisions:p.decisions},elapsedMs:Date.now()-started};}
module.exports={check,plan,retrieve,constraints};
