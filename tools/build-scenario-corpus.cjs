'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),D=require('../v5/metro-data'),P=require('../v5/place-data');
const metroStations=new Set(D.lines.filter(l=>!/市域|磁浮/.test(l.name)).flatMap(l=>l.stations));
const english=s=>D.stations.filter(x=>x.en===s.en).length>1?s.en+' (Line '+D.lines.find(l=>l.stations.includes(s.id)).name.replace('号线','')+')':s.en;
const cases=[],seen=new Set();
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const normalized=s=>String(s).normalize('NFKC').toLowerCase().replace(/[\s，。？！,?!;；:：]|(?<!\d)\.|\.(?!\d)/g,'');
const add=(type,input,expect,origin='authored',source=null,history=[],meta={})=>{
 const key=normalized(input);if(seen.has(key))return;seen.add(key);
 const legacy=!meta.family,group=expect.kind==='metro'&&expect.origin&&expect.destination?'metro:'+expect.origin+':'+expect.destination+':'+(expect.via||''):expect.sourceId&&type!=='rag-boundary'?'source:'+expect.sourceId:meta.group||type+':'+JSON.stringify(expect),id=legacy?'vc59-'+String(cases.length+1).padStart(4,'0'):'vc61-'+digest(input+JSON.stringify(history)).slice(0,16);
 cases.push({id,type,input,language:meta.language||(/[\u4e00-\u9fff]/.test(input)?'zh':'en'),family:meta.family||'legacy.'+type,group,split:parseInt(digest(group).slice(0,8),16)%5===0?'holdout':'development',provenance:{type:origin,...(source?{url:source}:{}),note:origin==='public-source-adapted'?'依据公开事实改写的测试问题，不是真实用户语录':'自行编写的组合合成测试，不是真实用户数据'},expect,history});
};
for(const [i,s]of D.stations.entries()){
 const start=D.stations[(i+37)%D.stations.length];
 add(metroStations.has(start.id)&&metroStations.has(s.id)?'metro':'rail-scope',`请问从${start.zh}乘地铁去${s.zh}，在哪里换乘？`,{kind:'metro',origin:start.id,destination:s.id});
 add(metroStations.has(start.id)&&metroStations.has(s.id)?'metro':'rail-scope',`Show the subway route from ${english(start)} to ${english(s)}.`,{kind:'metro',origin:start.id,destination:s.id});
}
for(const p of P.places)for(const query of [`介绍一下${p.zh}，地址在哪里？`,`${p.zh}可以看什么？`,`我想了解${p.zh}`,`请给我${p.zh}的实际地址`,`Tell me about ${p.en}.`,`Where is ${p.en}?`,`What is ${p.en} like?`,`Please describe ${p.en}.`])add('place',query,{kind:'nearby',sourceId:p.id},'public-source-adapted',p.url);
const source='https://english.shanghai.gov.cn/en-Transportation/20250126/484b92f86eeb49d7b26086d25010d782.html';
for(const start of ['浦东机场','浦东国际机场','PVG','Pudong Airport'])for(const end of ['上海站','上海火车站','Shanghai Railway Station','Shanghai train station'])for(const phrase of [`从${start}到${end}的地铁怎么做`,`上海的地铁，从${start}去${end}怎么换乘`])add('metro',phrase,{kind:'metro',origin:'浦东1号2号航站楼',destination:'上海火车站',lines:['2号线','1号线'],transfer:'人民广场'},'public-source-adapted',source);
for(const km of [3,5,10,15,20,25,30,35,40,50])for(const q of [`上海打车${km}公里多少钱`,`Shanghai taxi for ${km} km`,`上海出租车路程${km}公里，估算一下`,`Taxi in Shanghai, distance ${km} kilometres`])add('taxi',q,{kind:'taxi',km});
for(const city of ['北京','杭州','南京','苏州','广州','深圳','成都','西安'])for(const q of [`我想从上海到${city}坐高铁`,`请查${city}到上海的火车票`,`不是地铁，我要上海到${city}的高铁票`,`帮我比较上海到${city}的火车票`,`从${city}去上海需要高铁票`,`我想了解${city}去上海的高铁`])add('rail',q,{kind:'rail'});
for(const to of ['豫园','人民广场','陆家嘴','南京东路','静安寺','自然博物馆','曲阜路','虹桥火车站','南京西路','打浦桥'])for(const q of [`终点改成${to}`,`目的地换成${to}`,`改到${to}`])add('followup',q,{kind:'metro',origin:'浦东1号2号航站楼',destination:to},'authored',null,[{text:'从浦东机场坐地铁到上海火车站',context:{city:'Shanghai'}}]);
for(const via of ['豫园','人民广场','陆家嘴','南京东路','静安寺','自然博物馆','曲阜路','虹桥火车站','南京西路','打浦桥'])for(const from of ['上海火车站','浦东1号2号航站楼','虹桥2号航站楼','世纪大道'])add('via',`从${from}坐地铁到中山公园，途经${via}`,{kind:'metro',origin:from,destination:'中山公园',via});
for(const q of ['我','啊','嗯','哦','呃','额','喂','嗯嗯','啊啊','呃呃','哦哦','嗯啊','uh','um','hmm','ah','oh','aaa','啊啊啊','嗯嗯嗯'])add('noise',q,{accepted:false});
for(const q of ['从浦东机场坐地铁','地铁去上海站','怎么坐地铁到人民广场','Metro to Shanghai Railway Station','Metro from Pudong airport','地铁从陆家嘴出发'])add('incomplete',q,{kind:'metro',needsClarification:true});
for(const q of ['上海站附近有什么可以玩','上海火车站周边有什么好玩','上海火车站附近能吃什么','What can I visit near Shanghai Railway Station?','Where can I eat near Shanghai Railway Station?','人民广场附近有什么公园','豫园附近有什么吃的','What is there around Yuyuan?','南京东路附近有什么景点','打浦桥附近推荐几个去处','自然博物馆周边吃饭','曲阜路附近可以走走吗'])add('nearby',q,{kind:'nearby'});
for(const q of ['Tell me places to eat near Yuyuan Garden.','Where can I eat around Yuyuan Garden?','豫园附近推荐吃什么','豫园周边有什么餐厅'])add('nearby',q,{kind:'nearby',sourceId:'place-hefeng'});
add('incomplete','我要坐地铁，但是还没确定从哪出发',{kind:'metro',needsClarification:true});
const legacyCount=cases.length;
require('./corpus-families.cjs').extend(add,()=>cases.length,20000);
if(cases.length!==20000)throw Error('Expected exactly 20000 unique cases, got '+cases.length);
const counts=key=>cases.reduce((a,c)=>(a[c[key]]=(a[c[key]]||0)+1,a),{});
const stats={total:cases.length,legacyCount,uniqueNormalizedInputs:seen.size,uniqueRate:seen.size/cases.length,semanticGroups:new Set(cases.map(c=>c.group)).size,templateFamilies:counts('family'),types:counts('type'),languages:counts('language'),splits:counts('split'),provenance:cases.reduce((a,c)=>(a[c.provenance.type]=(a[c.provenance.type]||0)+1,a),{})};
const corpus={version:'travel-regression-6.1-20000',createdAt:'2026-09-25',scope:'20000条去重组合合成用例：本地意图/工具/上下文、固定资料RAG召回、反馈建议分类。不是20000次真实DeepSeek调用，不是真实用户日志，不代表生产准确率；同一家族存在相关性。固定holdout按语义组哈希划分。',stats,cases};
const dir=path.join(__dirname,'../data/evaluation');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'v6.1-cases.json'),JSON.stringify(corpus,null,2)+'\n');fs.writeFileSync(path.join(dir,'v6.1-manifest.json'),JSON.stringify({...stats,version:corpus.version,sha256:digest(JSON.stringify(corpus)),scope:corpus.scope},null,2)+'\n');console.log(JSON.stringify(stats));
