'use strict';
// Reserve IDs inside the durable store's synchronous CAS transaction before running.
// A crash can leave a reserved round, but cannot cause a later round to repeat it.
const crypto=require('node:crypto'),C=require('./corpus-eval'),S=require('./corpus-sampling');
async function evaluate(store,options={}){
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['seed','count'].includes(k)))throw Error('EVALUATION_SAMPLE_OPTIONS');
 const count=options.count??120;if(!Number.isSafeInteger(count)||count<1||count>300)throw Error('EVALUATION_SAMPLE_OPTIONS');
 const id=crypto.randomUUID(),seed=options.seed===undefined?'round-'+id:options.seed;
 if(typeof seed!=='string'||!seed.trim()||seed.length>120)throw Error('EVALUATION_SAMPLE_OPTIONS');
 const version=C.catalog().version,reserved=await store.mutate(s=>{
  const picked=S.select(C.cases,s.samplingState||{},{version,seed,count,round:id,split:'development'});
  picked.state.rounds.at(-1).status='reserved';picked.state.rounds=picked.state.rounds.slice(-200);s.samplingState=picked.state;
  return{ids:picked.round.ids,round:picked.round,remaining:picked.remaining};
 });
 let report;
 try{const ids=new Set(reserved.ids);report=C.evaluateCorpus({cases:C.cases.filter(c=>ids.has(c.id))});}
 catch(error){await store.mutate(s=>{const round=s.samplingState?.rounds?.find(r=>r.id===id);if(round)Object.assign(round,{status:'failed-to-run',completedAt:new Date().toISOString()});return true;});throw error;}
 const failed=report.checks.filter(c=>!c.passed),passed=report.checks.filter(c=>c.passed);
 const run={id,at:new Date().toISOString(),dataset:version,promptVersion:'rotating-offline-v6.1',scope:'轮换的本地工具、RAG、反馈分类检查；不调用DeepSeek、不代表线上模型准确率。',displayScope:'轮换新问法：'+count+' 条 development 用例，跨轮不重复；失败最多展示80条、通过展示20条。',total:report.total,passed:report.passed,elapsedMs:report.elapsedMs,byType:report.byType,byFamily:report.byFamily,bySplit:report.bySplit,corpusHash:report.sha256,round:id,seed,remaining:reserved.remaining,split:'development',checks:[...failed.slice(0,80),...passed.slice(0,20)],checksTruncated:report.checks.length>Math.min(80,failed.length)+Math.min(20,passed.length),failedCount:failed.length,paidModelCalls:0,snapshot:report.snapshot};
 await store.mutate(s=>{const round=s.samplingState?.rounds?.find(r=>r.id===id);if(round)Object.assign(round,{status:'completed',completedAt:run.at,passed:run.passed,total:run.total});return true;});
 return run;
}
module.exports={evaluate};
