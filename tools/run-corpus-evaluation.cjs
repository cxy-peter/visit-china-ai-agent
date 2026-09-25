'use strict';
// Full run by default. --sample N rotates authored phrasings without making API calls.
const fs=require('node:fs'),path=require('node:path'),C=require('../v5/corpus-eval'),S=require('../v5/corpus-sampling');
const args=process.argv.slice(2),arg=(key,fallback)=>{const at=args.indexOf(key);return at<0?fallback:args[at+1];};
const output=path.resolve(arg('--output','evidence/v6.1/corpus-evaluation.json')),statePath=path.resolve(arg('--state','runtime/evaluation-sampling.json'));
let selected=C.cases,sample=null;
if(args.includes('--sample')){const prior=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath,'utf8')):{};sample=S.select(C.cases,prior,{version:C.catalog().version,count:Number(arg('--sample','100')),seed:arg('--seed','visit-china-v61'),split:arg('--split','development'),round:arg('--round',undefined)});selected=sample.cases;}
const report=C.evaluateCorpus({cases:selected});report.run={at:new Date().toISOString(),mode:sample?'rotating-offline-sample':'full-offline-regression',paidModelCalls:0,...(sample?{round:sample.round,remaining:sample.remaining}:{})};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
// Consume even failed cases: the next round uses different phrasings; failures remain
// replayable by immutable IDs in this report and in a full regression run.
if(sample){fs.mkdirSync(path.dirname(statePath),{recursive:true});const temp=statePath+'.tmp';fs.writeFileSync(temp,JSON.stringify(sample.state,null,2)+'\n');fs.renameSync(temp,statePath);}
console.log(JSON.stringify({output,total:report.total,passed:report.passed,failed:report.total-report.passed,elapsedMs:report.elapsedMs,byType:report.byType,paidModelCalls:0,...(sample?{round:sample.round.id,remaining:sample.remaining}:{})},null,2));
process.exitCode=report.passed===report.total?0:1;
