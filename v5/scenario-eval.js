'use strict';
const crypto=require('node:crypto'),E=require('./engine'),I=require('./intent-tools'),{createModel}=require('../v4/server'),{assist}=require('./assistant'),seeds=require('./source-seeds'),L=require('./library');
const cases=[
 {id:'rail-sh-hz',input:'我想了解上海到杭州的高铁',kind:'rail',expectSource:'sh-hz-rail'},
 {id:'rail-inbound',input:'我需要从北京到上海的火车票',kind:'rail'},
 {id:'airport-taxi-missing',input:'虹桥机场到上海火车站打车多少钱',kind:'taxi',missingDistance:true,terminal:true},
 {id:'taxi-known-km',input:'上海打车25公里大概多少钱',kind:'taxi',total:86.9},
 {id:'metro-hongqiao',input:'从虹桥火车站坐地铁到豫园',kind:'metro',line:'10'},
 {id:'metro-lujiazui-en',input:'Metro from Lujiazui to Yuyuan Garden',kind:'metro',line:'14'},
 {id:'restaurant',input:'我想找上海的饭店',kind:'restaurant'},
 {id:'noise',input:'嗯嗯',accepted:false},
 {id:'one-char',input:'我',accepted:false},
 {id:'relaxed',input:'我和父母想轻松游览上海',kind:'other'},
];
async function evaluate({modelConsent=false,env={},fetcher=fetch}={}){
 const basic=cases.map(c=>{const result=I.analyze(c.input,'Shanghai',/[\u4e00-\u9fff]/.test(c.input)?'zh':'en'),tests=[];if(c.kind)tests.push(result.kind===c.kind);if(c.expectSource)tests.push(result.sourceIds.includes(c.expectSource));if(c.missingDistance)tests.push(!result.estimate&&!result.request.km);if(c.terminal)tests.push(result.needsTerminal);if(c.total)tests.push(result.estimate?.total===c.total);if(c.line)tests.push(require('./metro').route(result.metro.origin).line===c.line);if(c.accepted!==undefined)tests.push(E.speechDecision(c.input).accepted===c.accepted);return{id:c.id,input:c.input,passed:tests.every(Boolean),actual:result.kind,scope:'synthetic deterministic tool regression'};});
 const corpus=require('./corpus-eval').evaluateCorpus(),checks=[...basic,...corpus.checks];
 let model=null;if(modelConsent){const client=createModel(env,fetcher);client.configure({maxTokens:500});if(!client.status().configured)throw Error('DEEPSEEK_KEY_MISSING');const state=E.apply(E.state(),{type:'text',text:'我想和父母轻松游览上海，请给简短建议。'});try{const answer=await assist({state,model:client,records:[...L.records,...seeds]});model={mode:answer.mode,answer:answer.text,usage:answer.usage,schemaPassed:true};}catch(e){model={schemaPassed:false,error:/^[A-Z_0-9]+$/.test(e.message)?e.message:'MODEL_UNAVAILABLE'};}}
 return{id:crypto.randomUUID(),at:new Date().toISOString(),dataset:corpus.version,promptVersion:'model-intent-and-location-v2',corpus:require('./corpus-eval').catalog(),total:checks.length,passed:checks.filter(c=>c.passed).length,checks,model,scope:'Tool/prompt regression, not weight training, live traffic, or independent semantic accuracy. No automatic publication.'};
}
module.exports={cases,evaluate,catalog:()=>({...require('./corpus-eval').catalog(),baselineCases:cases.length})};
