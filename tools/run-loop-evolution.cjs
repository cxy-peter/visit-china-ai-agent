'use strict';
// Run/resume exactly the same bounded batches as Operations. Full check evidence is
// gzip-compressed; the compact release report is safe to display in the dashboard.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),L=require('../v5/loop-evolution'),O=require('../v5/operations'),{catalog}=require('../v5/ops-api');
const argv=process.argv.slice(2),arg=(key,fallback)=>{const i=argv.indexOf(key);return i<0?fallback:argv[i+1];};
const stateFile=path.resolve(arg('--state','runtime/v6.2-loop-state.json')),output=path.resolve(arg('--output','evidence/v6.2/loop-evolution.json')),trace=stateFile+'.checks.jsonl',actor={name:'offline-full-sample-runner',role:'admin'};
fs.mkdirSync(path.dirname(stateFile),{recursive:true});fs.mkdirSync(path.dirname(output),{recursive:true});
let saved=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):O.initial();
const persist=()=>{const tmp=stateFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(saved)+'\n');fs.renameSync(tmp,stateFile);};
const store={read:async()=>structuredClone(saved),mutate:async f=>{const draft=structuredClone(saved),out=f(draft);if(out?.then)throw Error('MUTATION_MUST_BE_SYNCHRONOUS');saved=draft;persist();return out;}};
(async()=>{
 let run=argv.includes('--resume')?L.summary(saved).current:await L.start(store,actor,{count:Number(arg('--count',12000)),seed:arg('--seed','release-v6.2')},catalog);
 if(!run||run.status!=='running')throw Error('LOOP_RUNNING_ROUND_REQUIRED');
 if(!argv.includes('--resume'))fs.writeFileSync(trace,'');
 let phase='';
 while(run.status==='running'){
  run=await L.step(store,actor,{id:run.id},catalog,({runId,phase,checks})=>fs.appendFileSync(trace,checks.map(row=>JSON.stringify({runId,phase,...row})).join('\n')+'\n'));
  if(run.phase!==phase){phase=run.phase;console.log(JSON.stringify({phase,status:run.status,progress:run.progress,baseline:run.baseline.passed,candidate:run.candidate.passed,improved:run.improved,regressed:run.regressed}));}
 }
 const raw=fs.readFileSync(trace),artifact=output.replace(/\.json$/,'.checks.jsonl.gz');fs.writeFileSync(artifact,zlib.gzipSync(raw));
 const dataHash=crypto.createHash('sha256');for(let i=run.start;i<run.start+run.count;i++)dataHash.update(JSON.stringify(L.item(i))+'\n');
 const report={...run,dataset:{version:L.VERSION,count:run.count,range:[run.start,run.start+run.count],sha256:dataHash.digest('hex'),seedQuestions:L.summary(saved).pool.seedQuestions,scope:'Seed labels are preserved. New wording combines authored request framing and answer constraints around existing service/document questions; these are not 12,000 independent human-labeled intents.'},fullCheckArtifact:path.basename(artifact),fullCheckSha256:crypto.createHash('sha256').update(raw).digest('hex'),paidModelCalls:0,published:false,releaseScope:'Only an accepted candidate is produced. Publishing remains a separate administrator action with an exact base/source check and rollback.'};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 const manifest={...report};delete manifest.failures;delete manifest.changes;
 if(argv.includes('--bundle'))fs.writeFileSync(path.resolve('data/evaluation/v6.2-loop-release.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({output,artifact,status:run.status,result:run.result,passed:run.candidate.passed,total:run.candidate.total,improved:run.improved,regressed:run.regressed,guard:run.guardCandidate,gate:run.gate,published:false,paidModelCalls:0},null,2));
 process.exitCode=run.status==='completed'&&run.gate?.noNewRegression&&run.gate?.noHistoricalRegression&&run.gate?.boundaries&&run.gate?.smallGold?0:1;
})().catch(error=>{console.error(error.message);process.exitCode=1;});
