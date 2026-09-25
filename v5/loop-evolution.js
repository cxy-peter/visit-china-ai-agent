'use strict';
// A resumable offline configuration experiment. No model calls, no weight training,
// no change to labels, and no automatic publication. Every batch runs outside CAS.
const fs=require('node:fs'),crypto=require('node:crypto'),H=require('./harness'),R=require('./rag'),C=require('./corpus-eval');
const VERSION='loop-phrasing-6.2-v1',BATCH=100,DEFAULT_COUNT=12000,MIN_COUNT=10000,MAX_COUNT=20000;
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const seeds=C.cases.filter(c=>c.type==='rag');
const before={zh:['这次我需要核对的是：','在安排行程前，请帮我查清：','我不太熟悉上海，想问：','先别替我预订，我要了解：','帮我用资料库确认一件事：','这条旅行需求请单独回答：','为了安排接下来的行程，请查询：','我想先了解实际操作，再做决定：','请根据可靠资料说明：','这一步我有疑问：','先把这个服务问题解释清楚：','我准备实际使用这项服务，请查：'],en:['Please help me verify this: ','Before planning the visit, I need to know: ','I am unfamiliar with Shanghai and want to ask: ','Before I make a booking, please explain: ','Please check the source library for this: ','Answer this travel request on its own: ','To plan my next stop, I need to ask: ','I want to understand the procedure before deciding: ','Use reliable information to explain: ','I have a question about this step: ','Please clarify this service question: ','Before using this service, I want to check: ']};
const after={zh:['请附上可以回查的出处。','先回答这个问题，再补充必要注意事项。','如果资料没有写明，请指出具体缺少哪一项。','请把已确认的信息和还需查询的项目分开。','我希望看到简短、可以照着做的说明。','以当前问题为主，不用先询问其他旅行需求。','如果只有查询入口，请明确说明它的作用。','请不要把检索到资料等同于已经完成预订。','请保留资料所限定的城市和适用范围。','适合第一次使用的人读懂就好。','请说明相关服务的下一步操作。','给我相关资料，不需要扩展无关景点。'],en:['Include a source I can check.','Answer this question first, then add necessary caveats.','If information is missing, specify exactly what is unknown.','Separate confirmed information from items still needing a lookup.','Keep the explanation brief and practical.','Focus on this request without asking about other travel needs first.','If only a lookup entry is available, explain what it does.','Do not describe a source result as a completed booking.','Preserve the city and scope stated in the source.','Explain it clearly for a first-time user.','Include the next relevant service step.','Provide relevant evidence without adding unrelated attractions.']};
const poolSize=seeds.length*144;
function item(index){
 if(!Number.isSafeInteger(index)||index<0||index>=poolSize)throw Error('LOOP_PHRASES_EXHAUSTED');
 const seed=seeds[index%seeds.length],variant=(Math.floor(index/seeds.length)*37)%144,lang=seed.language==='en'?'en':'zh';
 const input=before[lang][variant%12]+seed.input+(lang==='en'?' ':' ')+after[lang][Math.floor(variant/12)];
 return{...seed,id:VERSION+':'+index,input,split:'generated-development',family:seed.family,provenance:{type:'authored-template-variation',seedId:seed.id,seedProvenance:seed.provenance,variant,prefix:variant%12,suffix:Math.floor(variant/12)},queryHash:hash(input.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim())};
}
const evaluatorHash=hash(['./rag','./corpus-eval','./confidence','./library','./loop-evolution'].map(p=>fs.readFileSync(require.resolve(p),'utf8').replace(/\r\n/g,'\n')).join('\n'));
function configHash(c){return hash(H.config(c));}
function sourceHash(records){return hash(records.map(r=>[r.id,r.publicationHash||'',r.active,r.reviewedAt,r.reviewDays,r.content,r.summaryZh,r.summary,r.title,r.city,r.topics,r.lastCheck?.status]));}
const bitGet=(encoded,index)=>Boolean(Buffer.from(encoded||'','base64')[Math.floor(index/8)]&(1<<(index%8)));
function bitSet(encoded,index,value,length){const bits=encoded?Buffer.from(encoded,'base64'):Buffer.alloc(Math.ceil(length/8));if(value)bits[Math.floor(index/8)]|=1<<(index%8);else bits[Math.floor(index/8)]&=~(1<<(index%8));return bits.toString('base64');}
function metric(){return{total:0,passed:0,byFamily:{},byType:{},bySplit:{}};}
function add(m,c){m.total++;if(c.passed)m.passed++;for(const [prop,key] of [['byFamily','family'],['byType','type'],['bySplit','split']]){const b=m[prop][c[key]||'unknown']||={total:0,passed:0};b.total++;if(c.passed)b.passed++;}}
function safe(run){if(!run)return null;const {baselineBits,candidateBits,guardBaselineBits,guardCandidateBits,lease,...out}=run;return structuredClone(out);}
function bundled(){try{return require('../data/evaluation/v6.2-loop-release.json');}catch(_){return null;}}
function referenceFloor(){const r=bundled();return r?.version===VERSION&&Number.isSafeInteger(r.start)&&Number.isSafeInteger(r.count)?r.start+r.count:0;}
function summary(s){const state=s.loopEvolution||{},reference=bundled();return{version:VERSION,current:safe(state.current),history:(state.history||[]).map(safe),reference,pool:{total:poolSize,reserved:Math.max(state.cursor||0,referenceFloor()),remaining:poolSize-Math.max(state.cursor||0,referenceFloor()),seedQuestions:seeds.length},scope:'同场景的新组合话术，测量目标资料召回和工具/边界回归；不是独立新意图、线上解决率或模型权重训练。固定历史集单列，已用于调试，不是盲测。',paidModelCalls:0};}
async function start(store,actor,options={},recordsFor){
 if(actor?.role!=='admin')throw Error('ADMIN_REQUIRED');
 if(Object.keys(options).some(k=>!['count','seed'].includes(k)))throw Error('LOOP_OPTIONS');
 const count=options.count??DEFAULT_COUNT,seed=options.seed??crypto.randomUUID();
 if(!Number.isSafeInteger(count)||count<MIN_COUNT||count>MAX_COUNT||typeof seed!=='string'||!seed.trim()||seed.length>120)throw Error('LOOP_OPTIONS');
 return store.mutate(s=>{
  const state=s.loopEvolution||={version:VERSION,cursor:0,history:[]};
  if(state.version!==VERSION)throw Error('LOOP_CORPUS_VERSION_CHANGED');
  if(state.current?.status==='running')throw Error('LOOP_BUSY');
  state.cursor=Math.max(state.cursor||0,referenceFloor());
  if(state.cursor+count>poolSize)throw Error('LOOP_PHRASES_EXHAUSTED');
  if(state.current)state.history=(state.history||[]).concat(safe(state.current)).slice(-10);
  const active=H.state(s).active,records=recordsFor(s),start=state.cursor;
  // Reserving the entire wording range before work makes abandoned rounds safe:
  // a new round cannot recycle their inputs, regardless of seed or browser reload.
  state.cursor+=count;
  state.current={id:crypto.randomUUID(),version:VERSION,status:'running',phase:'baseline',index:0,start,count,seed,author:actor.name,at:new Date().toISOString(),baseVersion:active.version,baselineConfig:H.config(active),baselineConfigHash:configHash(active),evaluatorHash,sourceHash:sourceHash(records),sourceSnapshot:R.compile(records,{...active,city:'Shanghai'}).fingerprint,baseDatasetHash:C.catalog().sha256,baseline:metric(),candidate:metric(),guardBaseline:metric(),guardCandidate:metric(),improved:0,regressed:0,guardRegressed:0,guardImproved:0,failures:[],changes:[],elapsedMs:0,paidModelCalls:0,scope:summary({}).scope};
  return safe(state.current);
 });
}
function candidate(run){
 // A hypothesis derived from measured misses, never from the expected labels.
 // The full candidate pass tests whether widening this bounded recall window helps.
 const misses=run.baseline.total-run.baseline.passed,c={...run.baselineConfig};
 if(misses){c.topK=Math.min(12,c.topK+2);c.minCoverage=Math.max(.02,Math.min(c.minCoverage,.04));}
 return{config:c,rationale:misses?'基线存在 '+misses+' 个目标资料未召回样例；试验扩大召回窗口并小幅降低词项覆盖阈值，随后对同一全样本和历史集检查回归。':'基线无目标召回失败；保留当前参数作为对照，不制造无证据的改进。'};
}
function statusUpdate(run){if(run.phase==='baseline'&&run.index===run.count){const next=candidate(run);run.candidateConfig=next.config;run.candidateConfigHash=configHash(next.config);run.hypothesis=next.rationale;run.phase='candidate';run.index=0;}else if(run.phase==='candidate'&&run.index===run.count){run.phase='regression';run.index=0;}else if(run.phase==='regression'&&run.index===C.cases.length){run.phase='acceptance';run.index=0;}}
function progress(run){const completed=run.phase==='baseline'?run.index:run.phase==='candidate'?run.count+run.index:run.phase==='regression'?2*run.count+run.index:2*run.count+C.cases.length;return{completed,total:2*run.count+C.cases.length,phase:run.phase};}
async function step(store,actor,options,recordsFor,onChecks){
 if(actor?.role!=='admin')throw Error('ADMIN_REQUIRED');
 if(!options||Object.keys(options).some(k=>k!=='id')||typeof options.id!=='string')throw Error('LOOP_OPTIONS');
 const token=crypto.randomUUID();
 const job=await store.mutate(s=>{
  const r=s.loopEvolution?.current;if(!r||r.id!==options.id)throw Error('LOOP_NOT_FOUND');
  if(r.status!=='running')return{done:true,run:safe(r)};
  if(r.lease&&Date.now()-r.lease.at<120000)throw Error('LOOP_BATCH_BUSY');
  const records=recordsFor(s),active=H.state(s).active;
  if(r.evaluatorHash!==evaluatorHash||configHash(active)!==r.baselineConfigHash||active.version!==r.baseVersion||sourceHash(records)!==r.sourceHash||R.compile(records,{...active,city:'Shanghai'}).fingerprint!==r.sourceSnapshot){r.status='invalidated';r.reason='评测代码、资料或线上技能在评测期间改变，需要用新话术启动新一轮。';r.completedAt=new Date().toISOString();return{done:true,run:safe(r)};}
  r.lease={token,at:Date.now()};return{run:structuredClone(r),records};
 });
 if(job.done)return{...job.run,progress:progress(job.run)};
 const r=job.run,started=Date.now();let checks=[];
 try{
  if(r.phase==='acceptance'){
   const gold=H.evaluate(r.candidateConfig,job.records),sameConfig=r.baselineConfigHash===r.candidateConfigHash;
   const gate={fullNewSample:r.baseline.total===r.count&&r.candidate.total===r.count,minSample:r.count>=MIN_COUNT,fullHistorical:r.guardCandidate.total===C.cases.length&&r.guardBaseline.total===C.cases.length,targetRecall:r.candidate.total>0&&r.candidate.passed/r.candidate.total>=.95,noNewRegression:r.regressed===0,noHistoricalRegression:r.guardRegressed===0,boundaries:(r.guardCandidate.byType['rag-boundary']?.passed??0)===(r.guardCandidate.byType['rag-boundary']?.total??-1),smallGold:gold.passed===gold.total,measuredImprovement:r.improved>0&&!sameConfig};
   return store.mutate(s=>{
    const current=s.loopEvolution?.current;if(!current||current.id!==r.id||current.lease?.token!==token)throw Error('LOOP_BATCH_CONFLICT');
    // Publication evidence must describe the same catalog and base used by every batch.
    if(sourceHash(recordsFor(s))!==r.sourceHash||configHash(H.state(s).active)!==r.baselineConfigHash||H.state(s).active.version!==r.baseVersion){current.status='invalidated';current.reason='验收前资料或技能已改变。';delete current.lease;return{...safe(current),progress:progress(current)};}
    current.gate=gate;current.gold={passed:gold.passed,total:gold.total,corpusHash:gold.corpusHash};current.status='completed';current.completedAt=new Date().toISOString();current.elapsedMs+=Date.now()-started;delete current.lease;
    current.releaseEligible=Object.values(gate).every(Boolean);current.result=current.releaseEligible?'candidate-ready':sameConfig?'no-change-needed':'held';
    if(current.releaseEligible){const p=H.propose(s,current.candidateConfig,actor.name,recordsFor(s),'full-sample-loop');p.evolution={runId:current.id,count:current.count,baselinePassed:current.baseline.passed,candidatePassed:current.candidate.passed,regressed:current.regressed,guardRegressed:current.guardRegressed,sourceHash:current.sourceHash,gate,at:current.completedAt};current.candidateId=p.id;current.candidateHash=p.hash;}
    return{...safe(current),progress:progress(current)};
   });
  }
  const records=job.records,base={records,config:r.baselineConfig,prepared:R.compile(records,{...r.baselineConfig,city:'Shanghai'})},next=r.candidateConfig?{records,config:r.candidateConfig,prepared:R.compile(records,{...r.candidateConfig,city:'Shanghai'})}:null;
  const end=Math.min(r.index+BATCH,r.phase==='regression'?C.cases.length:r.count);
  for(let index=r.index;index<end;index++){
   const c=r.phase==='regression'?C.cases[index]:item(r.start+index);
   if(r.phase==='regression'){const baseline=C.check(c,base),candidate=C.check(c,next);checks.push({index,case:c,baseline,candidate});}
   else checks.push({index,case:c,result:C.check(c,r.phase==='baseline'?base:next)});
  }
  const answer=await store.mutate(s=>{
   const current=s.loopEvolution?.current;if(!current||current.id!==r.id||current.lease?.token!==token||current.phase!==r.phase||current.index!==r.index)throw Error('LOOP_BATCH_CONFLICT');
   for(const row of checks){const index=row.index;
    if(r.phase==='regression'){
     add(current.guardBaseline,row.baseline);add(current.guardCandidate,row.candidate);
     current.guardBaselineBits=bitSet(current.guardBaselineBits,index,row.baseline.passed,C.cases.length);current.guardCandidateBits=bitSet(current.guardCandidateBits,index,row.candidate.passed,C.cases.length);
     if(row.baseline.passed&&!row.candidate.passed)current.guardRegressed++;
     if(!row.baseline.passed&&row.candidate.passed)current.guardImproved++;
     if(!row.candidate.passed&&current.failures.length<100)current.failures.push({phase:r.phase,...row.candidate});
    }else{
     add(current[r.phase],row.result);const field=r.phase+'Bits';current[field]=bitSet(current[field],index,row.result.passed,current.count);
     if(!row.result.passed&&current.failures.length<100)current.failures.push({phase:r.phase,...row.result});
     if(r.phase==='candidate'){const previous=bitGet(current.baselineBits,index);if(!previous&&row.result.passed)current.improved++;if(previous&&!row.result.passed)current.regressed++;if(previous!==row.result.passed&&current.changes.length<100)current.changes.push({id:row.case.id,query:row.case.input,seedId:row.case.provenance.seedId,baseline:previous,candidate:row.result.passed,actual:row.result.actual});}
    }
   }
   current.index=end;current.elapsedMs+=Date.now()-started;delete current.lease;statusUpdate(current);return{...safe(current),progress:progress(current)};
  });
  if(onChecks)await onChecks({runId:r.id,phase:r.phase,checks});
  return answer;
 }catch(error){await store.mutate(s=>{const current=s.loopEvolution?.current;if(current?.id===r.id&&current.lease?.token===token){delete current.lease;current.lastError='LOOP_BATCH_FAILED';}return true;});throw error;}
}
module.exports={VERSION,BATCH,DEFAULT_COUNT,MIN_COUNT,MAX_COUNT,poolSize,item,summary,start,step,sourceHash,configHash,progress};
