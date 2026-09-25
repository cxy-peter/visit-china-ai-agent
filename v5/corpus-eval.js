'use strict';
const crypto=require('node:crypto'),corpus=require('../data/evaluation/v6.1-cases.json'),I=require('./intent-tools'),M=require('./metro'),D=require('./metro-data'),E=require('./engine'),Places=require('./discovery'),R=require('./rag'),L=require('./library');
function catalog(){return{version:corpus.version,total:corpus.cases.length,sha256:crypto.createHash('sha256').update(JSON.stringify(corpus)).digest('hex'),scope:corpus.scope,types:corpus.cases.reduce((a,c)=>(a[c.type]=(a[c.type]||0)+1,a),{}),provenance:corpus.cases.reduce((a,c)=>(a[c.provenance.type]=(a[c.provenance.type]||0)+1,a),{}),download:'/evaluation-cases.json',stats:corpus.stats,paidModelCalls:0};}
function check(c,context={}){const failures=[],expect=(v,n)=>{if(!v)failures.push(n);};let actual='';try{
 if(c.type==='rag'||c.type==='rag-boundary'){
  const records=context.records||L.records;let result;
  if(c.type==='rag-boundary'){
   const target=records.find(r=>r.id===c.expect.sourceId);expect(Boolean(target),'fixture source exists');
   const patches={held:{active:false},expired:{reviewedAt:'2000-01-01',reviewDays:1},'wrong-city':{city:'Beijing'},'index-only':{content:'',summary:'',summaryZh:''}};
   result=R.retrieve(c.input,[{...target,...patches[c.expect.condition]}],{...context.config,city:'Shanghai'});expect(result.hits.length===0,'ineligible source excluded');
  }else{result=context.prepared?R.retrievePrepared(c.input,context.prepared):R.retrieve(c.input,records,{...context.config,city:'Shanghai'});expect(result.hits.some(h=>h.sourceId===c.expect.sourceId),'retrieval source '+c.expect.sourceId);}
  actual=result.hits.map(h=>h.sourceId).join(',');
 }
 else if(c.type==='feedback'){actual=require('./feedback-cases').classify(c.input);expect(actual===c.expect.reason,'suggested feedback category '+c.expect.reason);expect(c.history.length>0,'context available for replay');}
 else if(c.type==='noise'){actual=E.speechDecision(c.input).accepted?'accepted':'ignored';expect(actual==='ignored','filler must be ignored');}
 else{const result=I.analyze(c.input,'Shanghai',c.language,c.history);actual=result.kind;expect(result.kind===c.expect.kind,'intent '+c.expect.kind);if(c.expect.sourceId)expect(result.sourceIds.includes(c.expect.sourceId),'source '+c.expect.sourceId);
 if(c.expect.km){expect(result.request?.km===c.expect.km&&Number.isFinite(result.estimate?.total),'user distance calculation');if(c.expect.total!==undefined)expect(result.estimate?.total===c.expect.total,'independent daytime tariff arithmetic');}
 if(['metro','followup','via'].includes(c.type)){
  const request=result.metro;expect(request?.origin===c.expect.origin,'origin');expect(request?.destination===c.expect.destination,'destination');if(c.expect.via)expect(request?.via===c.expect.via,'via');
  if(request?.origin&&request?.destination){const route=M.plan(request,c.language);expect(route.origin===c.expect.origin&&route.destination===c.expect.destination,'route endpoints');expect(route.segments.length>0,'nonempty route');const visited=new Set();let previous=route.origin;for(const segment of route.segments){const line=D.lines.find(l=>l.id===segment.lineId);expect(segment.stations[0]===previous,'continuous transfer');for(let i=0;i<segment.stations.length;i++){visited.add(segment.stations[i]);const at=line.stations.indexOf(segment.stations[i]);expect(at>=0,'station on line');if(i){const diff=Math.abs(at-line.stations.indexOf(segment.stations[i-1]));expect(diff===1||(line.loop&&diff===line.stations.length-1),'adjacent network edge');}}previous=segment.stations.at(-1);}expect(previous===route.destination,'last endpoint');if(c.expect.via)expect(visited.has(c.expect.via),'visited via');if(c.expect.lines)expect(JSON.stringify(route.segments.map(s=>s.line))===JSON.stringify(c.expect.lines),'independent expected lines');if(c.expect.transfer)expect(route.segments[0].stations.at(-1)===c.expect.transfer,'independent transfer expectation');expect(!/还有哪一项具体需求/.test(result.text),'no generic deflection');}
 }
 if(c.type==='rail-scope')expect(/市域机场线|airport-rail-only/.test(result.text),'explicit suburban rail scope, no metro claim');
 if(c.type==='incomplete')expect(!result.metro?.origin||!result.metro?.destination,'no invented endpoint');
 if(c.type==='nearby')expect(result.text.length>10,'actionable reply or explicit coverage gap');
 }
 }catch(e){failures.push(e.message);}return{id:c.id,input:c.input,passed:failures.length===0,actual,failures,type:c.type,family:c.family,split:c.split,provenance:c.provenance};}
function evaluateCorpus(options={}){
 const selected=options.cases||corpus.cases,started=Date.now(),records=options.records||L.records,context={records,config:options.config,prepared:R.compile(records,{...options.config,city:'Shanghai'})},checks=selected.map(c=>check(c,context));
 const buckets=key=>checks.reduce((out,c)=>{const b=out[c[key]]||={total:0,passed:0};b.total++;if(c.passed)b.passed++;return out;},{});
 return{...catalog(),total:selected.length,passed:checks.filter(c=>c.passed).length,elapsedMs:Date.now()-started,byType:buckets('type'),byFamily:buckets('family'),bySplit:buckets('split'),snapshot:{fingerprint:context.prepared.fingerprint,compiledAt:context.prepared.compiledAt,chunks:context.prepared.all.length},checks};
}
module.exports={catalog,evaluateCorpus,check,cases:corpus.cases};
