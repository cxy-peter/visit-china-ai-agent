'use strict';
const crypto=require('node:crypto'),corpus=require('../data/evaluation/v5.9-cases.json'),I=require('./intent-tools'),M=require('./metro'),D=require('./metro-data'),E=require('./engine'),Places=require('./discovery');
function catalog(){return{version:corpus.version,total:corpus.cases.length,sha256:crypto.createHash('sha256').update(JSON.stringify(corpus)).digest('hex'),scope:corpus.scope,types:corpus.cases.reduce((a,c)=>(a[c.type]=(a[c.type]||0)+1,a),{}),provenance:corpus.cases.reduce((a,c)=>(a[c.provenance.type]=(a[c.provenance.type]||0)+1,a),{}),download:'/evaluation-cases.json'};}
function check(c){const failures=[],expect=(v,n)=>{if(!v)failures.push(n);};let actual='';try{
 if(c.type==='noise'){actual=E.speechDecision(c.input).accepted?'accepted':'ignored';expect(actual==='ignored','filler must be ignored');}
 else{const result=I.analyze(c.input,'Shanghai',c.language,c.history);actual=result.kind;expect(result.kind===c.expect.kind,'intent '+c.expect.kind);if(c.expect.sourceId)expect(result.sourceIds.includes(c.expect.sourceId),'source '+c.expect.sourceId);
 if(c.expect.km)expect(result.request?.km===c.expect.km&&Number.isFinite(result.estimate?.total),'user distance calculation');
 if(['metro','followup','via'].includes(c.type)){
  const request=result.metro;expect(request?.origin===c.expect.origin,'origin');expect(request?.destination===c.expect.destination,'destination');if(c.expect.via)expect(request?.via===c.expect.via,'via');
  if(request?.origin&&request?.destination){const route=M.plan(request,c.language);expect(route.origin===c.expect.origin&&route.destination===c.expect.destination,'route endpoints');expect(route.segments.length>0,'nonempty route');const visited=new Set();let previous=route.origin;for(const segment of route.segments){const line=D.lines.find(l=>l.id===segment.lineId);expect(segment.stations[0]===previous,'continuous transfer');for(let i=0;i<segment.stations.length;i++){visited.add(segment.stations[i]);const at=line.stations.indexOf(segment.stations[i]);expect(at>=0,'station on line');if(i){const diff=Math.abs(at-line.stations.indexOf(segment.stations[i-1]));expect(diff===1||(line.loop&&diff===line.stations.length-1),'adjacent network edge');}}previous=segment.stations.at(-1);}expect(previous===route.destination,'last endpoint');if(c.expect.via)expect(visited.has(c.expect.via),'visited via');if(c.expect.lines)expect(JSON.stringify(route.segments.map(s=>s.line))===JSON.stringify(c.expect.lines),'independent expected lines');if(c.expect.transfer)expect(route.segments[0].stations.at(-1)===c.expect.transfer,'independent transfer expectation');expect(!/还有哪一项具体需求/.test(result.text),'no generic deflection');}
 }
 if(c.type==='rail-scope')expect(/市域机场线|airport-rail-only/.test(result.text),'explicit suburban rail scope, no metro claim');
 if(c.type==='incomplete')expect(!result.metro?.origin||!result.metro?.destination,'no invented endpoint');
 if(c.type==='nearby')expect(result.text.length>10,'actionable reply or explicit coverage gap');
 }
 }catch(e){failures.push(e.message);}return{id:c.id,input:c.input,passed:failures.length===0,actual,failures,type:c.type,provenance:c.provenance};}
function evaluateCorpus(){const checks=corpus.cases.map(check);return{...catalog(),passed:checks.filter(c=>c.passed).length,checks};}
module.exports={catalog,evaluateCorpus,check};
