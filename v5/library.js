/* One source catalog for the library, text chat and voice transcript. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../v4/core'),require('../v4/data'),require('../data/official/records.json'));else root.TravelLibrary=factory(root.ArrivalCore,root.ArrivalData,root.ArrivalCorpus);})(globalThis,function(C,D,corpus){
'use strict';
const indexed=Array.isArray(corpus)?corpus:corpus?.records||[],seen=new Set();
const records=[...D.sources,...indexed].filter(r=>{if(seen.has(r.url))return false;seen.add(r.url);return true;}).map(r=>({...r,kind:r.kind||r.source_kind}));
const byId=new Map(records.map(r=>[r.id,r]));
const ids=value=>[...new Set((Array.isArray(value)?value:[]).filter(id=>typeof id==='string'&&byId.has(id)))].slice(0,3);
function search(query='',city='Unknown',kind='all'){
 const rows=records.filter(r=>(city==='Unknown'||!r.city||r.city==='China'||r.city===city)&&(kind==='all'||(kind==='summary'?Boolean(r.summary||r.summaryZh):!r.summary&&!r.summaryZh)));
 return query.trim()?C.rank(query,city,rows.map(r=>({...r,summary:[r.summary,r.summaryZh,r.excerpt].filter(Boolean).join(' ')})),rows.length).map(r=>({...byId.get(r.id),rankScore:r.rankScore})):rows;
}
function choose(h,city){const explicit=ids(h?.sourceIds);if(explicit.length)return explicit.map(id=>byId.get(id));
 if(city&&!['Shanghai','Beijing'].includes(city))return [];
 if(!/签证|入境|支付|地铁|护照|铁路|火车|机场|政策|visa|entry|payment|metro|passport|rail|airport|policy/i.test(h?.text||''))return [];
 const q=(h?.text||'').replace(/地铁/g,' metro ').replace(/火车|铁路/g,' rail passport ').replace(/支付/g,' payment ').replace(/机场/g,' airport ').replace(/签证/g,' visa ');
 return search(q,city||'Unknown').slice(0,3);
}
function summary(row,language='zh'){return language==='zh'?(row.summaryZh||row.summary||row.excerpt||'没有已保存摘要，请查看原文。'):(row.summary||row.excerpt||'No saved summary. Read the original source.');}
function label(row,language='zh'){return row.summary||row.summaryZh?(C.current(row)?(language==='zh'?'已保存摘要 · 在复核周期内':'Saved summary · within review window'):(language==='zh'?'已保存摘要 · 待复核':'Saved summary · review due')):(language==='zh'?'仅索引 · 未人工核对':'Index only · not editorially reviewed');}
return{records,indexCount:indexed.length,ids,get:id=>byId.get(id),search,choose,summary,label,current:C.current};
});
