/* One source catalog for the library, text chat and voice transcript. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../v4/core'),require('../v4/data'),require('../data/official/records.json'),require('./discovery'));else root.TravelLibrary=factory(root.ArrivalCore,root.ArrivalData,root.ArrivalCorpus,root.TravelDiscovery);})(globalThis,function(C,D,corpus,Discovery){
'use strict';
const indexed=Array.isArray(corpus)?corpus:corpus?.records||[],seen=new Set();
const records=[...D.sources,...indexed].filter(r=>{if(seen.has(r.url))return false;seen.add(r.url);return true;}).map(r=>({...r,kind:r.kind||r.source_kind}));
records.push(...Discovery.records());
const byId=new Map(records.map(r=>[r.id,r])),baseline=new Map(byId);let dynamicIds=new Set();
const ids=value=>[...new Set((Array.isArray(value)?value:[]).filter(id=>typeof id==='string'&&byId.has(id)))].slice(0,3);
function search(query='',city='Unknown',kind='all'){
 const rows=records.filter(r=>(city==='Unknown'||!r.city||r.city==='China'||r.city===city)&&(kind==='all'||(kind==='station'||kind==='place'?r.recordType===kind:kind==='summary'?Boolean(r.summary||r.summaryZh)&&!r.recordType:!r.summary&&!r.summaryZh)));
 return query.trim()?C.rank(query,city,rows.map(r=>({...r,summary:[r.summary,r.summaryZh,r.excerpt].filter(Boolean).join(' ')})),rows.length).map(r=>({...byId.get(r.id),rankScore:r.rankScore})):rows;
}
function merge(rows){const next=new Set(rows.map(r=>r.id));for(const id of dynamicIds){if(!next.has(id)){const i=records.findIndex(r=>r.id===id);if(i>=0)records.splice(i,1);if(baseline.has(id)){records.push(baseline.get(id));byId.set(id,baseline.get(id));}else byId.delete(id);}}dynamicIds=next;for(const r of rows){const i=records.findIndex(x=>x.id===r.id);if(i<0)records.push(r);else records[i]=r;byId.set(r.id,r);}}
function choose(h,city,pool=records){const map=new Map(pool.map(r=>[r.id,r])),explicit=(h?.sourceIds||[]).filter(id=>map.has(id)).slice(0,3);if(explicit.length)return explicit.map(id=>map.get(id));
 if(city&&!['Shanghai','Beijing'].includes(city))return [];
 if(!/附近|景点|广场|公园|餐厅|签证|入境|支付|地铁|豫园|护照|铁路|火车|高铁|机场|政策|出租车|打车|车费|nearby|park|food|visa|entry|payment|metro|passport|rail|train|airport|policy|taxi|yuyuan|yu garden/i.test(h?.text||'')&&!pool.some(r=>(r.topics||[]).some(t=>t.length>1&&!/^(上海|北京|杭州|中国|shanghai|beijing|hangzhou|china|travel|旅行)$/i.test(t)&&(h?.text||'').toLowerCase().includes(t.toLowerCase()))))return [];
 const q=(h?.text||'').replace(/地铁/g,' metro ').replace(/火车|铁路/g,' rail passport ').replace(/支付/g,' payment ').replace(/机场/g,' airport ').replace(/签证/g,' visa ');
 const preferred=/出租车|打车|车费|taxi/i.test(q)?['sh-taxi-tariff']:/豫园|yuyuan|yu garden/i.test(q)?['sh-metro-map']:/上海|shanghai/i.test(q)&&/杭州|hangzhou/i.test(q)?['sh-hz-rail','rail-passport']:[];
 const policy=/签证|入境|护照|政策|visa|entry|passport|policy|eligibility/i.test(h?.text||''),metro=/地铁|几号线|metro|subway/i.test(h?.text||'');
 const rows=pool.filter(r=>(!city||r.city===city||r.city==='China'||!r.city)&&(!r.recordType||!policy&&(r.recordType==='place'||metro))&&(!policy||/签证|入境|护照|政策|visa|entry|passport|policy|eligibility/i.test([r.title,...r.topics||[],r.summary,r.summaryZh].join(' ')))),ranked=C.rank(q,city||'Unknown',rows.map(r=>({...r,summary:[r.summary,r.summaryZh,r.excerpt].filter(Boolean).join(' ')})),rows.length);
 return [...new Set([...preferred.filter(id=>map.has(id)),...ranked.map(r=>r.id)])].slice(0,3).map(id=>map.get(id));
}
function summary(row,language='zh'){return language==='zh'?(row.summaryZh||row.summary||row.excerpt||'没有已保存摘要，请查看原文。'):(row.summary||row.summaryZh||row.excerpt||'No saved summary. Read the original source.');}
function label(row,language='zh'){if(row.active===false)return language==='zh'?'暂停引用 · 等待复核':'Held from answers · review pending';return row.summary||row.summaryZh?(C.current(row)?(language==='zh'?'已保存摘要 · 在复核周期内':'Saved summary · within review window'):(language==='zh'?'已保存摘要 · 待复核':'Saved summary · review due')):(language==='zh'?'仅索引 · 未人工核对':'Index only · not editorially reviewed');}
return{records,indexCount:indexed.length,confidence:row=>globalThis.TravelConfidence?.source(row),ids,get:id=>byId.get(id),search,choose,merge,summary,label,current:r=>r.active!==false&&C.current(r)};
});
