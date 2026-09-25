/* Scores express evidence checks, not calibrated probabilities of truth. */
(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f();else r.TravelConfidence=f();})(globalThis,function(){
'use strict';
const governments=new Set(['en.shio.gov.cn','german.beijing.gov.cn','english.shanghai.gov.cn','www.shanghai.gov.cn','jtw.sh.gov.cn','service.shanghai.gov.cn','english.beijing.gov.cn','jtw.beijing.gov.cn','sww.sh.gov.cn','www.gov.cn','kab.sww.sh.gov.cn','www.shcn.gov.cn','www.shbsq.gov.cn','www.jinshan.gov.cn','www.jingan.gov.cn','www.shjjjc.gov.cn','whlyj.sh.gov.cn']);
const operators=new Set(['www.trip.com','www.shairport.com','service.shmetro.com','map.amap.com','www.12306.cn','mobile.12306.cn','kyfw.12306.cn','www.marriott.com','pullman.accor.com','www.hyatt.com','www.96822.com','www.shanghaiairport.com','tenpaygo.com','www.global.jcb']);
function host(url){try{return new URL(url).hostname;}catch(_){return '';}}
function source(row,now=Date.now()){
 const gov=governments.has(host(row.url)),operator=operators.has(host(row.url)),summary=Boolean(row.summary||row.summaryZh),current=Boolean(row.reviewedAt&&Date.parse(row.reviewedAt)<=now&&now-Date.parse(row.reviewedAt)<=Number(row.reviewDays||14)*86400000),held=row.active===false||row.lastCheck?.status==='changed';
 const score=held?15:!summary?30:!current?45:Number.isFinite(row.verification?.score)?Math.min(95,row.verification.score):gov?90:operator?85:row.publicationHash?72:60;
 const reasons=[gov?'已匹配政府域名':operator?'已匹配运营方域名':'非已核验政府/运营方域名',summary?'有保存摘要':'仅网页索引',current?'摘要在复核周期内':'摘要缺失或待复核',...(held?['暂停用于事实回答']:[]),...(row.recordType==='station'?['静态站点快照，非实时运营']:[])];
 return{score,level:score>=85?'high':score>=60?'medium':'low',requiresReview:score<60,government:gov,reasons,scope:'资料证据评分；不是事实正确概率，也不保证实时适用'};
}
function answer(intent,records,tool,modelConfidence){
 const sources=records.map(r=>({id:r.id,...source(r)})),score=sources.length?Math.min(...sources.map(r=>r.score)):null;
 const structured=Number.isFinite(modelConfidence)&&modelConfidence>=0&&modelConfidence<=1?modelConfidence:null;
 const complete=tool?.kind==='metro'?Boolean(tool.metro?.origin&&tool.metro?.destination&&!tool.scopeGap):tool?.kind==='nearby'?Boolean(tool.places?.length):tool?.kind==='taxi'?Boolean(tool.estimate):Boolean(tool?.text||intent?.kind==='other');
 return{model:structured,modelLabel:'DeepSeek 自评（未经校准，非正确率）',sources,sourceScore:score,requiresReview:score!==null&&score<60,needsClarification:!complete,reasons:[...(!complete?['缺少完成本次请求所需的信息']:[]),...(structured!==null&&structured<0.75?['模型意图自评偏低']:[]),...(score!==null&&score<60?['资料证据不足或待复核']:[])],scope:'置信度辅助排查，不替代原文核对；高分不保证答案正确'};
}
return{source,answer,governments:[...governments]};
});
