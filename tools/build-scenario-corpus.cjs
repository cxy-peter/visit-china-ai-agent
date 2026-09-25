'use strict';
const fs=require('node:fs'),path=require('node:path'),D=require('../v5/metro-data'),P=require('../v5/place-data');
const metroStations=new Set(D.lines.filter(l=>!/市域|磁浮/.test(l.name)).flatMap(l=>l.stations));
const english=s=>D.stations.filter(x=>x.en===s.en).length>1?s.en+' (Line '+D.lines.find(l=>l.stations.includes(s.id)).name.replace('号线','')+')':s.en;
const cases=[];const add=(type,input,expect,origin='authored',source=null,history=[])=>cases.push({id:'vc59-'+String(cases.length+1).padStart(4,'0'),type,input,language:/[\u4e00-\u9fff]/.test(input)?'zh':'en',provenance:{type:origin,...(source?{url:source}:{}),note:origin==='public-source-adapted'?'依据公开事实改写的测试问题，不是真实用户语录':'自行编写的合成测试，不是真实用户数据'},expect,history});
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
const corpus={version:'travel-regression-5.9',createdAt:'2026-09-25',scope:'本地路由、工具、检索及上下文回归；不是 1000 次真实 DeepSeek 语义评测，也不是训练数据。公开资料问题均为改写。',cases};
const dir=path.join(__dirname,'../data/evaluation');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'v5.9-cases.json'),JSON.stringify(corpus,null,2)+'\n');console.log(JSON.stringify({total:cases.length,types:cases.reduce((a,c)=>(a[c.type]=(a[c.type]||0)+1,a),{}),publicSourceAdapted:cases.filter(c=>c.provenance.type==='public-source-adapted').length}));
