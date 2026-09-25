'use strict';
const D=require('../v5/metro-data'),P=require('../v5/place-data'),S=require('../v5/service-data');
const name=(s,lang)=>lang==='zh'?s.zh:D.stations.filter(x=>x.en===s.en).length>1?s.en+' (Line '+D.lines.find(l=>l.stations.includes(s.id)).name.replace('号线','')+')':s.en;
const zhRoutes=[
 (a,b)=>`从${a}到${b}的地铁怎么走？`,
 (a,b)=>`地铁路线想查${a}去${b}，请列出换乘站。`,
 (a,b)=>`我在${a}，要乘地铁到${b}，帮我画路线。`,
 (a,b)=>`请把${a}至${b}的地铁乘车步骤写清楚。`,
 (a,b)=>`地铁从${a}出发前往${b}，具体在哪儿换线？`,
 (a,b)=>`带着行李从${a}坐地铁到${b}，想少换乘。`,
 (a,b)=>`第一次到上海，${a}乘地铁去${b}应该怎么换？`,
 (a,b)=>`不坐出租车，${a}到${b}的地铁路线是什么？`,
 (a,b)=>`不是高铁，从${a}到${b}只查地铁。`,
 (a,b)=>`请提供${a}到${b}的地铁示意图和途经站。`,
 (a,b)=>`从${a}搭地铁至${b}，先乘哪条线再换哪条？`,
 (a,b)=>`想知道${a}与${b}之间的地铁交通，不需要买火车票。`
];
const enRoutes=[
 (a,b)=>`How do I take the metro from ${a} to ${b}?`,
 (a,b)=>`Please draw the subway journey from ${a} to ${b}.`,
 (a,b)=>`Metro directions: leaving ${a}, arriving at ${b}.`,
 (a,b)=>`I have luggage. Which metro lines connect ${a} and ${b}?`,
 (a,b)=>`Show every transfer for a subway trip from ${a} to ${b}.`,
 (a,b)=>`For a first visit, explain the metro route ${a} to ${b}.`,
 (a,b)=>`I prefer fewer changes on the metro from ${a} to ${b}.`,
 (a,b)=>`Give me the metro stops between ${a} and ${b}.`,
 (a,b)=>`Where should I change subway lines when going from ${a} to ${b}?`,
 (a,b)=>`No taxi please: metro from ${a} to ${b}.`,
 (a,b)=>`Can you map the metro route from ${a} to ${b} in English?`,
 (a,b)=>`My departure metro station is ${a}; my arrival station is ${b}.`
];
function extend(add,existing,target=20000){
 const metroIds=new Set(D.lines.filter(l=>!/市域|磁浮/.test(l.name)).flatMap(l=>l.stations)),stations=D.stations.filter(s=>metroIds.has(s.id));
 const put=(type,input,expect,family,lang='zh',history=[],source=null,group=null)=>add(type,input,expect,source?'public-source-adapted':'authored',source,history,{family,language:lang,group:group||family+':'+JSON.stringify(expect)});
 // Service retrieval questions have independent document labels. They do not claim
 // the local fallback (or a paid model that was never called) identified the intent.
 const services=[
  ['charging','sh-power-bank',['充电宝怎么租借','手机没电后如何租用充电宝','共享充电宝归还规则是什么','租充电宝前要核对哪些费用','能保证现在一定有充电宝可借吗','怎么查询附近充电宝柜机的位置'],['how can I rent a power bank','what should I check before renting a power bank','how do I return a charging power bank','can you confirm live power bank stock','where should I look up charging rental cabinets','how can I check a power bank rental fee']],
  ['luggage','sh-luggage-guide',['行李寄存去哪里查询','寄存行李前应核对什么','大箱子的寄存尺寸限制怎么查','存包服务的营业时间在哪里确认','寄存柜是否有空位能保证吗','怎么查询附近的存知己寄存服务'],['where can I look up luggage storage','how can I check luggage storage opening hours','where can I verify bag size limits for storage','can you guarantee an empty luggage locker now','how do I find the Cunzhiji luggage storage service','what should I confirm before leaving my luggage']],
  ['metro_ticket','sh-metro-tickets',['地铁单程票怎么购买','地铁乘车码在哪里打开','地铁单程票隔天能不能用','出站换乘能继续用这张地铁单程票吗','如何使用支付宝乘上海地铁','地铁单程票的票价在哪里确认'],['how can I buy a Shanghai metro single-journey ticket','where can I open a Shanghai metro QR code','is a metro single ticket valid the next day','does a metro single ticket cover an out-of-station transfer','how can I use Alipay on the Shanghai metro','where should I confirm the metro ticket fare']]
 ];
 for(const [kind,id,zhs,ens] of services)for(const s of stations.slice(0,35))for(let i=0;i<6;i++){
  put('rag',`在上海${s.zh}，${zhs[i]}？`,{sourceId:id,kind},`rag.${kind}.zh.${i}`,'zh',[],S.records.find(r=>r.id===id).url,`${kind}:${s.id}:${i}`);
  put('rag',`Near ${name(s,'en')} in Shanghai, ${ens[i]}?`,{sourceId:id,kind},`rag.${kind}.en.${i}`,'en',[],S.records.find(r=>r.id===id).url,`${kind}:${s.id}:${i}`);
 }
 for(const p of P.places)for(let i=0;i<8;i++){
  const queries=[`请核对${p.zh}的真实位置和资料来源。`,`上海${p.zh}的地址信息可以查到吗？`,`我要了解${p.zh}，请只引用资料库里的内容。`,`到${p.zh}之前，先给我官方介绍。`,`Where can I verify the address of ${p.en}?`,`What does the source library say about ${p.en}?`,`Please find a referenced introduction to ${p.en}.`,`Show saved evidence about ${p.en} in Shanghai.`];
  put('rag',queries[i],{sourceId:p.id,kind:'nearby'},`rag.place.${i}`,i<4?'zh':'en',[],p.url,'place:'+p.id);
 }
 const hotelQueries=['酒店电话怎么找','酒店地址在哪里','是否靠近人民广场地铁站','官网有没有列明交通方式','能确认现在还有空房吗','订房前去哪个官网核实'];
 for(const [i,q] of hotelQueries.entries())for(const prefix of ['想核对上海雅居乐万豪侯爵酒店','请查上海雅居乐万豪侯爵酒店','我考虑入住上海雅居乐万豪侯爵酒店'])put('rag',`${prefix}，${q}？`,{sourceId:'sh-marriott-city-centre',kind:'hotel'},'rag.hotel.zh.'+i,'zh',[],S.records.find(r=>r.id==='sh-marriott-city-centre').url);
 // Evidence gap and expiry are tested against the real retrieval eligibility code.
 for(const [i,s] of stations.slice(0,40).entries())for(const condition of ['held','expired','wrong-city','index-only'])put('rag-boundary',`上海${s.zh}附近共享充电宝资料，第${i+1}个站点的${{held:'暂停引用',expired:'过期', 'wrong-city':'外地', 'index-only':'无摘要'}[condition]}版本能进入答案吗？`,{sourceId:'sh-power-bank',condition},'rag.boundary.'+condition,'zh');
 // Newly published service: tests use the verified brand and keep the user typo.
 const newsQuestions=[
  ['TenPayGo 面向来华游客有什么新的支付功能','What is the new TenPayGo payment service for visitors to China'],
  ['我说的 Tengopay 是不是 TenPayGo，请核对名称','Is the service I called Tengopay actually named TenPayGo'],
  ['TenPayGo 可以在哪些支持微信支付的商户付款','Which Weixin Pay merchants can accept payments through TenPayGo'],
  ['TenPayGo 的交通功能是不是已经全部上线','Are all transport functions of TenPayGo already available'],
  ['TenPayGo 能不能保证直接刷上海地铁闸机','Can you guarantee TenPayGo can directly pass Shanghai metro gates'],
  ['TenPayGo 开发者和正式资料来源是什么','Who publishes TenPayGo and where can I verify its official information']
 ];
 for(const [i,pair] of newsQuestions.entries())for(const prefix of [['出发来上海之前','Before travelling to Shanghai'],['准备在上海付款时','When preparing to pay in Shanghai'],['作为第一次来华的游客','As a first-time visitor to China'],['在计划上海旅行的时候','While planning a visit to Shanghai']])for(const [j,lang] of ['zh','en'].entries())put('rag',prefix[j]+(j?', ':'，')+pair[j]+(j?'?':'？'),{sourceId:'news-tenpaygo-20260924',kind:'payment'},'rag.tenpaygo.'+i+'.'+lang,lang,[],'https://apps.apple.com/us/app/tenpaygo/id6778755338','tenpaygo:'+i);
 // Exact mathematical expectations are authored independently of the production tariff implementation.
 for(let n=1;n<=240;n++)for(let style=0;style<8;style++){
  const km=n/4,zh=style<4,queries=[`上海打车${km}公里，普通车白天的基础车费是多少？`,`地图显示上海出租车路程为${km}公里，请估算不含等候费的金额。`,`只想估算上海${km}公里的打车费用。`,`上海出租车开${km}公里，不计附加费怎么算？`,`Estimate a Shanghai taxi for ${km} km in daytime.`,`The map shows ${km} kilometres in Shanghai; what is the basic taxi estimate?`,`For a Shanghai cab travelling ${km} km, show the fare estimate without waiting.`,`I need a daytime Shanghai taxi calculation using a distance of ${km} kilometres.`];
  put('taxi',queries[style],{kind:'taxi',km,total:Math.round(1400+Math.max(0,Math.min(km,15)-3)*270+Math.max(0,km-15)*405)/100},'taxi.distance.'+style,zh?'zh':'en',[],null,'taxi:'+km);
 }
 const cities=[['北京','Beijing'],['杭州','Hangzhou'],['南京','Nanjing'],['苏州','Suzhou'],['广州','Guangzhou'],['深圳','Shenzhen'],['成都','Chengdu'],['西安','Xian'],['武汉','Wuhan'],['长沙','Changsha'],['天津','Tianjin'],['重庆','Chongqing'],['合肥','Hefei'],['宁波','Ningbo'],['无锡','Wuxi'],['济南','Jinan'],['青岛','Qingdao'],['郑州','Zhengzhou'],['福州','Fuzhou'],['南昌','Nanchang']];
 for(const [a,ae] of cities)for(const [b,be] of [['上海','Shanghai'],...cities.filter(c=>c[0]!==a).slice(0,4)])for(let i=0;i<6;i++){
  const queries=[`请查从${a}到${b}的高铁票，不是市内地铁。`,`我要了解${a}到${b}的火车票，先核对出发到达站。`,`从${a}去${b}乘高铁，票价余票需要以官方查询为准吗？`,`How can I check train tickets from ${ae} to ${be}?`,`I need intercity rail tickets from ${ae} to ${be}, not the metro.`,`Please help compare train travel from ${ae} to ${be}; do not invent live availability.`];
  put('rail',queries[i],{kind:'rail'},'rail.intercity.'+i,i<3?'zh':'en',[],null,`rail:${a}:${b}`);
 }
 // Multi-turn changes test both the latest correction and retention of the other endpoint.
 for(let i=0;i<240;i++){
  const a=stations[i],old=stations[(i+83)%stations.length],b=stations[(i+151)%stations.length];
  for(let j=0;j<8;j++){
   const en=j>=4,origin=j%4>=2,query=origin?(en?`Start from ${name(b,'en')} instead.`:`出发站改成${b.zh}。`):(en?`Change the destination to ${name(b,'en')} instead.`:`终点改成${b.zh}。`);
   // Context makes the case substantively different even where a correction repeats.
   const varied=origin?(en?[`Actually, metro from ${name(b,'en')}; keep the earlier destination.`,`Start from ${name(b,'en')} instead; the previous arrival stays.`][j%2]:[`地铁改从${b.zh}出发，保持刚才的终点。`,`出发站改成${b.zh}，仍按前文的目的地坐地铁。`][j%2]):(en?[`Metro destination is now ${name(b,'en')}; keep the departure station.`,`Change the destination to ${name(b,'en')} instead; still taking the metro.`][j%2]:[`终点改成${b.zh}，还是乘地铁。`,`目的地换成${b.zh}，继续从刚才那站坐地铁。`][j%2]);
   const history=[{text:en?`Metro from ${name(a,'en')} to ${name(old,'en')}.`:`从${a.zh}乘地铁到${old.zh}`,context:{city:'Shanghai'},assistance:{intent:{kind:'metro',origin:a.id,destination:old.id}}}];
   put('followup',varied,{kind:'metro',origin:origin?b.id:a.id,destination:origin?old.id:b.id},'metro.correction.'+j,en?'en':'zh',history,null,`correction:${a.id}:${old.id}:${b.id}`);
  }
 }
 for(let i=0;i<240;i++)for(let j=0;j<4;j++){
  const a=stations[i],b=stations[(i+67)%stations.length],v=stations[(i+29)%stations.length],queries=[`从${a.zh}坐地铁到${b.zh}，途经${v.zh}。`,`地铁行程是${a.zh}去${b.zh}，经过${v.zh}。`,`Metro from ${name(a,'en')} to ${name(b,'en')} via ${name(v,'en')}.`,`Plan a subway journey from ${name(a,'en')} to ${name(b,'en')}, stop at ${name(v,'en')}.`];
  put('via',queries[j],{kind:'metro',origin:a.id,destination:b.id,via:v.id},'metro.via.'+j,j<2?'zh':'en',[],null,`via:${a.id}:${b.id}:${v.id}`);
 }
 const feedback={
  intent_error:['我问的是地铁，不是火车票，你理解错了。','I asked for a metro route, not intercity train tickets. You misunderstood my intent.'],
  fact_error:['你提供的地址和电话是错误的，请核对事实。','The address and phone number are factually wrong. Please check the source.'],
  stale_info:['你的新闻信息已过期，政府发布了更新，请更新资料。','Your information is outdated; the government has published an update.'],
  wrong_route:['你给的路线换乘站不对，走错了，应该检查路线。','The route has the wrong transfer station; please correct the route.'],
  missing_detail:['你的回答缺少地址和营业时间，细节不全。','The answer is missing the address and opening hours; details are incomplete.'],
  process_issue:['已经告诉你出发站了，你还重复追问，流程卡住了。','I already gave the departure station but you keep asking again; the process is stuck.'],
  language_issue:['我要求用英语回答，你却用了中文，语言不对。','I requested English but you replied in Chinese; the response language is wrong.'],
  connection_issue:['体验码输入后连接失败，显示 ACCESS_CODE_INVALID。','The experience code failed to connect: ACCESS_CODE_INVALID.'],
  other:['我对这轮回答有个建议，希望可以人工看看。','I have a suggestion about this answer and would like someone to review it.']
 };
 for(const [reason,phrases] of Object.entries(feedback))for(let i=0;i<80;i++){
  const a=stations[i],b=stations[(i+79)%stations.length],en=i%2===1;
  put('feedback',en?`About my journey from ${name(a,'en')} to ${name(b,'en')}: ${phrases[1]}`:`关于我从${a.zh}去${b.zh}的这轮对话：${phrases[0]}`,{reason},'feedback.'+reason+'.'+(en?'en':'zh'),en?'en':'zh',[{text:en?`Metro from ${name(a,'en')} to ${name(b,'en')}.`:`从${a.zh}坐地铁到${b.zh}`,context:{city:'Shanghai'}}],null,`feedback:${a.id}:${b.id}`);
 }
 // Each pair is a different graph task. Families vary the actual user constraint
 // (transfers, stops, luggage, modal negation), never just punctuation or random suffixes.
 for(let offset=1;existing()<target&&offset<stations.length;offset++)for(let i=0;existing()<target&&i<stations.length;i++){
  const a=stations[i],b=stations[(i+offset*37)%stations.length];if(a.id===b.id)continue;
  const j=(i+offset)%24,zh=j<12,query=(zh?zhRoutes[j]:enRoutes[j-12])(name(a,zh?'zh':'en'),name(b,zh?'zh':'en'));
  put('metro',query,{kind:'metro',origin:a.id,destination:b.id},'metro.route.'+(zh?'zh.':'en.')+(j%12),zh?'zh':'en',[],null,`route:${a.id}:${b.id}`);
 }
}
module.exports={extend};
