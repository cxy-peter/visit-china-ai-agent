/* Read-only tools shared by the browser, cloud assistant and scenario evaluator. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./travel-tools'),require('./metro'),require('./discovery'),require('./request-semantics'));else root.TravelIntent=factory(root.TravelTools,root.TravelMetro,root.TravelDiscovery,root.TravelRequest);})(globalThis,function(T,M,D,Request){
'use strict';
function analyze(text,city,language='zh',history=[]){
 const zh=language==='zh',tr=(a,b)=>zh?a:b;let t=String(text||'');
 const service=Request.serviceOnly(t);if(['charging','luggage','hotel'].includes(service)&&!Request.railRequested(t)&&!/地铁.{0,8}(?:怎么坐|怎么走|到)|metro route/i.test(t))return{kind:service,sourceIds:[],text:''};
 if(Request.arrivalGuide(t))return{kind:'other',responseMode:'guide',sourceIds:['history-airport-link','rail-passport'],text:tr('已保留你的起点和终点。请先核对机场到站交通与后续车次；连接 DeepSeek 后可结合官方资料整理到达、换乘和进站注意事项。','Your origin and destination are retained. Connect DeepSeek for an evidence-based arrival and boarding guide.')};
 const explicitMetro=M.intent(t,city,history),routeAsked=/地铁|subway|metro|终点|目的地|途经|换乘|改到/i.test(t)&&!/附近|周边|nearby|near |around/i.test(t);
 const routeCorrection=/\b(?:start|leave|depart) from\b.*\b(?:instead|previous|same|arrival)\b/i.test(t)&&history.slice(-3).some(h=>/地铁|metro|subway/i.test(h.text||''))&&!/附近|周边|nearby|around/i.test(t);
 if((routeAsked||routeCorrection)&&explicitMetro)return{kind:'metro',sourceIds:['sh-metro-map'],metro:explicitMetro,text:M.answer(explicitMetro,language)};
 const discovery=D.reply(t,{language,history:[...history,{text:t,context:{city}}]});if(discovery)return discovery;
 if(explicitMetro)return{kind:'metro',sourceIds:['sh-metro-map'],metro:explicitMetro,text:M.answer(explicitMetro,language)};
 // Short answers can finish an existing taxi question without inventing a route distance.
 if(/^(?:是|大概|大约|约|距离|路程|it's|about|around|distance)?\s*(?:T\s*[12]|[12]号航站楼|\d+(?:\.\d+)?\s*(?:公里|千米|km|kilomet(?:er|re)s?))[。.!?\s]*$/i.test(t)){
  const prior=history.slice(-3),i=prior.findLastIndex(h=>/出租车|打车|taxi|cab\b|车费/i.test(h.text||''));
  if(i>=0&&prior.slice(i+1).every(h=>(h.text||'').length<40&&!/酒店|高铁|地铁|餐厅|hotel|metro|train|restaurant/i.test(h.text)))t=prior.slice(i).map(h=>h.text).join(' ')+' '+t;
 }
 if(/出租车|打车|taxi|cab\b|车费/i.test(t)){
  const req=T.taxiRequest(t,city),airportRail=/虹桥(?:机场|航站)|hongqiao airport/i.test(t)&&/上海(?:火车)?站|shanghai (?:railway|train) station/i.test(t),terminal=t.match(/\bT\s*([12])\b|([12])号航站楼/i),needsTerminal=airportRail&&!terminal;
  if(!req.city&&/虹桥|hongqiao/i.test(t))req.city='Shanghai';let estimate=null;try{if(req.km)estimate=T.taxi({city:req.city,km:req.km});}catch(_){}
  return{kind:'taxi',sourceIds:req.city==='Shanghai'?['sh-taxi-tariff']:[],request:req,estimate,airportRail,needsTerminal,terminal:terminal?.[1]||terminal?.[2]||null,
   text:estimate?tr('按你提供的 '+req.km+' 公里，普通车型日间非高峰单程基础估算约 ¥'+estimate.total+'，未含低速等候、夜间、高峰或其他附加费。实际以计价器为准；这不是网约车或携程报价。','Using your '+req.km+' km road distance, the ordinary daytime off-peak one-way estimate is CNY '+estimate.total+', excluding waiting, night/peak and other extras. The meter applies; this is not a booking-platform quote.'):
    tr((needsTerminal?'你从虹桥机场 T1 还是 T2 出发？目的地是上海火车站，不是虹桥火车站。':'可以帮你估算。')+'还没有实际驾车里程；请填地图显示的公里数，我会按已保存的官方运价计算。','I can estimate this from the official saved tariff. '+(needsTerminal?'Are you leaving Hongqiao Airport T1 or T2? Shanghai Railway Station is different from Hongqiao Railway Station. ':'')+'Please enter the road distance shown by your map; I have not retrieved a driving route.')};
 }
 const metro=M.intent(t,city,history);if(metro)return{kind:'metro',sourceIds:['sh-metro-map'],metro,text:M.answer(metro,language)};
 if(Request.railRequested(t)&&!/只.{0,3}打车/.test(t)){const route=T.routeRequest(t),shhz=route&&[route.from,route.to].includes('shanghai')&&[route.from,route.to].includes('hangzhou');return{kind:'rail',sourceIds:shhz?['sh-hz-rail','rail-passport']:['rail-passport'],route,text:shhz?tr('上海—杭州可以按上海虹桥、杭州东这一组车站查找。请确认出发站、到达站、日期和席别；12306 公告采用浮动票价，不能把历史公布价当成今天的售价。下面按席别、价格和时段展示历史真实记录，请继续查询12306或携程。','For Shanghai–Hangzhou, one station pair to check is Shanghai Hongqiao and Hangzhou East. Confirm stations, date and class. The 12306 notice describes variable pricing, not today’s fare. Compare the dated historical records below and check the provider.'):tr('你想从哪一站到哪一站、哪天出发？实际班次、票价和余票请查询12306；没有已核对的历史记录时不填入虚构车次。','Which stations and date do you need? The examples are simulated; check 12306 for live services, fares and availability.')};}
 if(/饭店|餐厅|吃饭|restaurant|dining/i.test(t))return{kind:'restaurant',sourceIds:[],text:tr('可以按区域、预算和口味筛选。下面是饭店类型示例；店铺营业、过敏原和实时价格需要向商家确认。','We can narrow by area, budget and food preferences. The restaurant types below are examples; confirm opening, allergens and prices with the venue.')};
 return{kind:'other',sourceIds:[],text:''};
}
// Model-supplied endpoints must survive the read-only rail tool, including cities
// outside the small illustrative fare table. This does not establish a live service.
function rail(intent,language='zh'){
 const zh=language==='zh',from=intent.origin||'',to=intent.destination||'';
 const pair=T.routeRequest(from+' 到 '+to),shhz=pair&&[pair.from,pair.to].includes('shanghai')&&[pair.from,pair.to].includes('hangzhou');
 if(shhz)return analyze(from+' 到 '+to+' 高铁',intent.city,language,[]);
 const route=from&&to?from+' → '+to:from?(zh?'从 ':'From ')+from:to?(zh?'到 ':'To ')+to:'';
 const knownForeign=/Boston|New York|Tokyo|London|Paris|波士顿|纽约|东京|伦敦|巴黎/i.test([intent.city,from,to].join(' '));
 if(knownForeign)return{kind:'rail',sourceIds:[],text:(zh?'已记下':'Noted: ')+route+(zh?'。本站当前只有中国铁路查询资料，不能用12306证明这段境外路线、车次或票价。':' . This library currently covers Chinese rail guidance; 12306 does not verify this overseas route, service or fare.')};
 const missing=!from&&!to?(zh?'请补充出发地和目的地。':'Please add the origin and destination. '):!from?(zh?'请补充出发地。':'Please add the origin. '):!to?(zh?'请补充目的地。':'Please add the destination. '):'';
 return{kind:'rail',sourceIds:['rail-passport'],text:(route?(zh?'已记下 '+route+'。':'Noted: '+route+'. '):'')+missing+(zh?'查询中国铁路时，在12306按上述地点选择具体出发站、到达站和乘车日期。城市名称不等于具体车站；本助手尚未取得实时车次、余票和票价，查询结果以12306为准。':'For Chinese rail services, use these locations to select the exact departure and arrival stations and travel date on 12306. A city name is not an exact station. Live services, seats and fares have not been retrieved; check 12306 for results.')};
}
return{analyze,rail};
});
