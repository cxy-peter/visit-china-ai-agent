'use strict';
const O=require('./operations'),Q=require('./confidence');
const normalize=x=>String(x||'').normalize('NFKC').replace(/\s+/g,'').toLowerCase();
// The selected label never establishes authority. Only exact, fetched government excerpts qualify.
async function verifyGovernment(record,fetcher=fetch){
 if(!Q.governments.includes(new URL(record.url).hostname))return{mode:'human-review',score:55,reasons:['未匹配已核验政府域名']};
 const result=await require('./source-refresh').checker(fetcher,{includeContent:true})({...record,id:'submission-check'});
 if(result.status!=='fetched')return{mode:'human-review',score:45,reasons:['政府原文暂未成功获取：'+result.error]};
 const body=normalize(result.content),parts=[record.summaryZh,record.summary,record.content].filter(x=>x?.trim());
 const matches=parts.every(x=>normalize(x).length>=24&&body.includes(normalize(x)));
 const unsafe=parts.some(x=>/ignore.{0,40}instructions|system prompt|忽略.{0,20}指令|覆盖.{0,10}规则|API.?KEY|password|密码/i.test(x));
 if(!matches||unsafe)return{mode:'human-review',score:65,reasons:['域名有效，但摘要不是可逐字核对的原文摘录；需人工核对改写或翻译'],checkedAt:result.at,sourceHash:result.hash};
 return{mode:'government-excerpt',score:95,reasons:['政府域名、正文获取和摘要逐字匹配通过'],checkedAt:result.at,sourceHash:result.hash,scope:'仅确认摘录与原文一致；不扩大政策适用范围，不确认实时运营'};
}
module.exports={verifyGovernment,normalize};
