/* Read-only tools shared by the browser, cloud assistant and scenario evaluator. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./travel-tools'),require('./metro'));else root.TravelIntent=factory(root.TravelTools,root.TravelMetro);})(globalThis,function(T,M){
'use strict';
function analyze(text,city,language='zh',history=[]){
 const zh=language==='zh',tr=(a,b)=>zh?a:b;let t=String(text||'');
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
 if(/高铁|火车票|train|rail ticket/i.test(t)&&!/只.{0,3}打车/.test(t)){const route=T.routeRequest(t),shhz=route&&[route.from,route.to].includes('shanghai')&&[route.from,route.to].includes('hangzhou');return{kind:'rail',sourceIds:shhz?['sh-hz-rail','rail-passport']:['rail-passport'],route,text:shhz?tr('上海—杭州可以按上海虹桥、杭州东这一组车站查找。请确认出发站、到达站、日期和席别；12306 公告采用浮动票价，不能把历史公布价当成今天的售价。下面先展示对比示例，你可以继续查12306或携程。','For Shanghai–Hangzhou, one station pair to check is Shanghai Hongqiao and Hangzhou East. Confirm stations, date and class. The 12306 notice describes variable pricing, not today’s fare. Compare the labeled examples below and check the provider.'):tr('你想从哪一站到哪一站、哪天出发？下面是模拟方案；实际班次、票价和余票请查询12306。','Which stations and date do you need? The examples are simulated; check 12306 for live services, fares and availability.')};}
 if(/饭店|餐厅|吃饭|restaurant|dining/i.test(t))return{kind:'restaurant',sourceIds:[],text:tr('可以按区域、预算和口味筛选。下面是饭店类型示例；店铺营业、过敏原和实时价格需要向商家确认。','We can narrow by area, budget and food preferences. The restaurant types below are examples; confirm opening, allergens and prices with the venue.')};
 return{kind:'other',sourceIds:[],text:''};
}
return{analyze};
});
