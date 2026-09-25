/* Display-only examples and a transparent, offline daytime taxi estimate. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TravelTools=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const labels={restaurant:['吃饭安排','Places to eat'],hotel:['住宿待安排','Hotel needed'],flight:['机票待安排','Flight needed'],rail:['火车行程','Rail trip'],transfer:['接驳交通','Transfer'],explore:['游玩偏好','Things to do']};
const tariffs={
 Shanghai:{base:14,rate:2.7,waitRate:2.7*1.5/4,source:'https://jtw.sh.gov.cn/czqcyj/index.html',publisher:'上海市交通委员会'},
 Beijing:{base:13,rate:2.3,waitRate:2.3/5,source:'https://jtw.beijing.gov.cn/czqc/zxts/202303/t20230310_2933641.html',publisher:'北京市交通委员会'}
};
function number(value,min,max,name){if(value===''||value==null||!Number.isFinite(Number(value))||Number(value)<min||Number(value)>max)throw Error(name);return Number(value);}
function taxi(input){const t=tariffs[input.city];if(!t)throw Error('CITY_REQUIRED');const km=number(input.km,.1,300,'DISTANCE_RANGE'),wait=number(input.wait??0,0,180,'WAIT_RANGE'),extra=number(input.extra??0,0,1000,'EXTRA_RANGE');
 const base=input.city==='Shanghai'&&input.large?16:t.base,fuel=input.city==='Beijing'&&input.fuel?1:0;
 const distanceCost=d=>Math.max(0,Math.min(d,15)-3)*t.rate+Math.max(0,d-15)*t.rate*1.5;
 const waiting=wait*t.waitRate*(input.city==='Beijing'&&input.peak?2:1),total=base+distanceCost(km)+waiting+extra+fuel,round=n=>Math.round(n*100)/100;
 return{city:input.city,km,base,rate:t.rate,distance:round(distanceCost(km)),longDistance:round(Math.max(0,km-15)*t.rate*.5),waiting:round(waiting),extra,fuel,total:round(total),low:Math.floor(base+distanceCost(Math.max(.1,km*.9))+waiting+extra+fuel),high:Math.ceil(base+distanceCost(km*1.1)+waiting+extra+fuel),source:t.source,publisher:t.publisher,checkedAt:'2026-09-24'};
}
function taxiRequest(text,city){if(!/taxi|cab\b|打车|出租车|车费|公里|kilomet|\bkm\b/i.test(text))return null;const m=text.match(/(\d+(?:\.\d+)?)\s*(?:公里|千米|km\b|kilomet(?:er|re)s?)/i);return{city:/上海|shanghai/i.test(text)?'Shanghai':/北京|beijing/i.test(text)?'Beijing':city||'',km:m?Number(m[1]):null};}
const cities={shanghai:['上海虹桥','Shanghai Hongqiao','上海','Shanghai'],beijing:['北京南','Beijing South','北京','Beijing'],hangzhou:['杭州东','Hangzhou East','杭州','Hangzhou'],nanjing:['南京南','Nanjing South','南京','Nanjing'],guangzhou:['广州南','Guangzhou South','广州','Guangzhou']};
function routeRequest(text){const source=String(text||'');const match=source.match(/(?:从|from\s+)?(.+?)(?:到|去|飞往|\s+to\s+)(.+?)(?:的|，|,|[。？！]|$)/i);if(!match)return null;const resolve=v=>Object.keys(cities).find(k=>v.toLowerCase().includes(k)||v.includes(cities[k][2]));const from=resolve(match[1]),to=resolve(match[2]);return from&&to&&from!==to?{from,to}:null;}
function transportExamples(h,language,kind,common){const zh=language==='zh',tr=(a,b)=>zh?a:b,request=routeRequest(h.text);
 if(kind==='flight'){
  const pair=request?[[request.from,request.to]]:[['beijing','shanghai'],['guangzhou','shanghai']];
  const items=pair.flatMap(([from,to])=>[0,1].map((n)=>({name:tr('模拟航班 '+(n?'B':'A')+' · '+(n?'午后出发':'直飞展示'),'Sample flight '+(n?'B':'A')+' · '+(n?'afternoon':'nonstop example')),route:cities[from][zh?2:3]+' → '+cities[to][zh?2:3],detail:tr(n?'示例 15:00 → 17:30 · 日期、机场及行李额待确认':'示例 09:00 → 11:30 · 非真实航班，日期待确认',n?'Sample 15:00 → 17:30 · confirm date, airports and baggage':'Sample 09:00 → 11:30 · fictional flight, date needed'),price:tr('示例 ¥'+(n?'1,050':'860')+' / 人','Example ¥'+(n?'1,050':'860')+' / person')})));
  return{...common,url:'https://www.trip.com/flights/',items};
 }
 const pairs=request?[[request.from,request.to]]:[['beijing','shanghai'],['hangzhou','shanghai'],['shanghai','nanjing'],['shanghai','hangzhou']];
 return{...common,url:'https://www.12306.cn/en/',items:pairs.flatMap(([from,to],index)=>(request?[0,1]:[0]).map((n)=>({name:tr('模拟高铁 '+String.fromCharCode(65+index+n)+' · '+(n?'一等座':'二等座'),'Sample train '+String.fromCharCode(65+index+n)+' · '+(n?'first class':'second class')),route:cities[from][zh?0:1]+' → '+cities[to][zh?0:1],detail:tr('示例发车 '+(n?'14:00':'09:00')+' · 非真实车次 / 时刻表','Sample departure '+(n?'14:00':'09:00')+' · fictional service / schedule'),price:tr('示例 ¥'+(from==='beijing'||to==='beijing'?(n?980:600):(n?120:75))+' / 人','Example ¥'+(from==='beijing'||to==='beijing'?(n?980:600):(n?120:75))+' / person')})))};
}
function offers(h,language){const zh=language==='zh',tr=(a,b)=>zh?a:b,prefs=h.context?.preferences||{},city=h.context?.city||'',shownCity=city==='Shanghai'?tr('上海','Shanghai'):city==='Beijing'?tr('北京','Beijing'):city||tr('目的地待确认','Destination needed');
 return (h.offers||[]).filter(id=>['hotel','flight','rail','restaurant'].includes(id)).map(id=>{
  const common={kind:id,title:labels[id][zh?0:1],disclaimer:tr('模拟展示 · 非实时价格或库存 · 未预订','Demo only · no live prices or availability · not booked')};
  if(id==='restaurant')return{...common,url:'https://www.trip.com/travel-guide/',items:[{name:tr('示例餐厅 A · '+(prefs.diet==='vegetarian'?'素食选择':'当地风味'),'Sample restaurant A · '+(prefs.diet==='vegetarian'?'vegetarian options':'local food')),route:shownCity,detail:tr('菜品、过敏原与营业时间需向商家核实','Confirm dishes, allergens and opening hours with the restaurant'),price:tr('示例预算 ¥80 / 人','Example budget ¥80 / person')},{name:tr('示例餐厅 B · 家庭聚餐','Sample restaurant B · family dining'),route:shownCity,detail:tr('示意多人共享菜式 · 未联系餐厅','Illustrative shared dishes · restaurant not contacted'),price:tr('示例预算 ¥150 / 人','Example budget ¥150 / person')}]};
  if(id==='rail'&&['Boston','New York'].includes(city))return{...common,url:'https://www.amtrak.com/home.html',items:[{name:tr('示例 A · 城际火车','Sample A · intercity train'),route:tr('示例路线：纽约 → 波士顿','Example route: New York → Boston'),detail:tr('示例 09:00 → 13:15 · 非真实班次','Sample 09:00 → 13:15 · fictional service'),price:tr('示例 US$60 / 人','Example US$60 / person')},{name:tr('示例 B · 快速列车','Sample B · faster train'),route:tr('示例路线：纽约 → 波士顿','Example route: New York → Boston'),detail:tr('示例 11:00 → 14:40 · 日期与车站待确认','Sample 11:00 → 14:40 · dates and stations to confirm'),price:tr('示例 US$120 / 人','Example US$120 / person')}]};
  if(id==='hotel')return{...common,url:'https://www.trip.com/hotels/',items:[{name:tr('示例 A · 地铁附近双床房','Example A · twin room near metro'),route:shownCity,detail:tr('适合同行家人 · 日期与入住人数待确认','For family travel · dates and guests to confirm'),price:tr('示例 ¥'+(prefs.budget==='economy'?320:prefs.budget==='comfort'?680:480)+' / 晚','Example ¥'+(prefs.budget==='economy'?320:prefs.budget==='comfort'?680:480)+' / night')},{name:tr('示例 B · 市区家庭房','Example B · city family room'),route:shownCity,detail:tr('三人房型示意 · 可取消条件待核实','Three-person layout · cancellation to verify'),price:tr('示例 ¥680 / 晚','Example ¥680 / night')}]};
  if(id==='flight'&&(!city||['Shanghai','Beijing','Hangzhou','Nanjing','Guangzhou'].includes(city)))return transportExamples(h,language,id,common);
  if(id==='flight')return{...common,url:'https://www.trip.com/flights/',items:[{name:tr('示例航班 A · 直飞','Sample flight A · nonstop'),route:tr('出发地待确认 → ','Origin needed → ')+shownCity,detail:tr('示例 09:00 → 11:20 · 经济舱','Sample 09:00 → 11:20 · economy'),price:tr('示例 ¥860 / 人','Example ¥860 / person')},{name:tr('示例航班 B · 午后出发','Sample flight B · afternoon'),route:tr('出发地待确认 → ','Origin needed → ')+shownCity,detail:tr('示例 14:30 → 16:50 · 行李额待核实','Sample 14:30 → 16:50 · baggage to verify'),price:tr('示例 ¥1,050 / 人','Example ¥1,050 / person')}]};
  return transportExamples(h,language,'rail',common);
 }).map(group=>{if(['Boston','New York'].includes(city)&&group.kind!=='rail'){const values=group.kind==='hotel'?[130,210]:group.kind==='restaurant'?[25,45]:[180,260];group.items=group.items.map((item,i)=>({...item,price:tr('示例 US$'+values[i]+' / '+(group.kind==='hotel'?'晚':'人'),'Example US$'+values[i]+' / '+(group.kind==='hotel'?'night':'person'))}));}return group;});
}
return{taxi,taxiRequest,offers,labels,tariffs,routeRequest};
});
