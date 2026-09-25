/* Public sources checked 2026-09-25. No live inventory or partner integration. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./verified-services-data'));else root.TravelServices=factory(root.VerifiedTravelServices);})(globalThis,function(V){
'use strict';
const definitions=[
 ['sh-metro-tickets','上海地铁购票与乘车 · Metro tickets','https://english.shanghai.gov.cn/en-Individuals-Transportation-PublicTransport/20260813/f257d5c373db4da3a8bde717b9f46b27.html','Shanghai Government','official',['地铁票','买票','乘车码','metro tickets','QR code'],'地铁可使用 Metro 大都会或支付宝、微信中的乘车服务。单程票可在车站购买，当日有效；出站换乘不能沿用同一张单程票。票价按距离计算，以车站和官方查询结果为准。','Use Metro Daduhui or supported Alipay/WeChat transit services. Buy single-journey tickets at stations; they are valid on the purchase day and do not cover out-of-station transfers. Confirm distance-based fares with the operator.'],
 ['sh-power-bank','上海共享充电宝使用指引 · Power banks','https://english.shanghai.gov.cn/en-MobileAndInternet/20260727/56b62a3a9d2f4ddaa8d77367c206b2ae.html','Shanghai Government','official',['充电宝','手机充电','没电','power bank','charging'],'商场、餐厅、地铁站等公共场所可寻找共享充电宝租借柜。扫码后先核对费用和归还规则，再按页面操作租借。本站没有接入柜机定位、剩余数量或实时价格，请使用地图和柜机运营商核实附近可借、可还的位置。','Look for rental cabinets in malls, restaurants and metro stations. Check rental fees and return instructions before renting. This site has no live cabinet locations, stock or prices; verify nearby rental and return points with the operator.'],
 ['sh-luggage-guide','上海行李寄存查询 · Luggage storage','https://english.shanghai.gov.cn/en-Individuals-Tourism-TouristServices/20260916/719ada5276444dfdb0d4f342ff68da26.html','Shanghai Government','official',['行李','寄存','存包','luggage','storage','bounce'],'上海官方旅游服务页提供地铁站、公园和商圈的行李寄存指引，以及存知己查询入口。可按所在地点查找寄存服务；是否营业、柜子余量、收费和行李尺寸限制需要在服务商页面再次核对。','The official tourist-service guide links to metro, park and commercial-area luggage storage and the Cunzhiji search platform. Check the provider for current hours, availability, fees and bag-size limits.'],
 ['sh-marriott-city-centre','上海雅居乐万豪侯爵酒店 · Marriott Marquis City Centre','https://www.marriott.com/en-us/hotels/shamc-shanghai-marriott-marquis-city-centre/overview/','Marriott','operator',['酒店','人民广场','住宿','hotel','Marriott','People Square'],'上海雅居乐万豪侯爵酒店位于黄浦区西藏中路555号。酒店官网列出附近人民广场地铁站，可乘1、2、8号线。这里展示真实酒店示例和官网入口；没有实时房价、房态，也没有替用户预订。','Shanghai Marriott Marquis City Centre is at 555 Middle Xizang Road, Huangpu. The hotel lists People’s Square station (lines 1, 2 and 8) nearby. This is a real hotel example with an official link, without live rates, availability or a reservation.']
];
const baseRecords=definitions.map(([id,title,url,publisher,sourceType,topics,summaryZh,summary])=>({id,title,url,publisher,sourceType,topics,summaryZh,summary,city:'Shanghai',kind:'reviewed_reference',recordType:'service',reviewedAt:'2026-09-25',reviewDays:30,active:true}));
// Canonical IDs preserve existing citations while replacing the old single-property example.
const records=[...new Map([...baseRecords,...V.records].map(r=>[r.id,r])).values()];
const categories={hotel:['酒店','Hotels'],restaurant:['餐厅','Restaurants'],charging:['充电／充电宝','Charging / power banks'],luggage:['行李寄存','Luggage storage'],taxi:['出租车上车点','Taxi pickup'],rail:['火车票与车站','Rail / stations'],metro_ticket:['地铁票','Metro tickets'],station_service:['站内服务','Station services']};
const sourceFor={hotel:'sh-marriott-city-centre',charging:'sh-power-bank',luggage:'sh-luggage-guide',rail:'verified-rail-12306',metro_ticket:'sh-metro-tickets'};
function current(r){return Boolean(r&&r.active!==false&&!r.publicationHash&&r.lastCheck?.status!=='changed'&&r.reviewedAt&&Date.parse(r.reviewedAt)<=Date.now()&&Date.now()-Date.parse(r.reviewedAt)<=Number(r.reviewDays||30)*86400000);}
function cards(kind,location='',language='zh',pool=records){
 const key=categories[kind]?kind:null;if(!key)return[];
 const zh=language==='zh',raw=String(location||'').trim().slice(0,100),station=V.resolveStation(raw),anchor=station||raw||'上海';
 // Location-specific records require a documented station association. A known property name
 // can identify its own station, but never makes all city-wide examples "nearby".
 const property=V.places.find(p=>[p.zh,p.en].some(n=>n.toLowerCase()===raw.toLowerCase()));
 const factual=V.cards(key,property?.station||raw,language,pool).filter(r=>!property||property.kind!==key||r.sourceId===property.id);
 if(['hotel','restaurant','taxi','station_service'].includes(key))return factual;
 const row=pool.find(r=>r.id===sourceFor[key]),guide=current(row)?row:null;
 const result=[...factual];
 if(key==='metro_ticket'&&guide)result.push({id:'service-metro_ticket',kind:key,title:zh?'上海地铁购票与乘车':'Shanghai Metro ticket guide',description:zh?guide.summaryZh:guide.summary,url:guide.url,sourceId:guide.id,status:'official-guide',liveAvailability:false});
 if(['charging','luggage'].includes(key)&&guide){
  // This is explicitly a search link, not evidence that a cabinet exists at the anchor.
  result.push({id:'service-'+key,kind:key,title:zh?anchor+' · 查询'+(key==='charging'?'充电宝租借柜':'寄存服务'):'Search '+(key==='charging'?'power-bank rentals':'luggage storage')+' around '+anchor,description:zh?'查询入口；此链接不证明该位置设有柜机。请在运营方核对位置、收费与可用量。':'Search only; this link does not establish that a cabinet exists here. Confirm location, fees and availability with the operator.',url:'https://uri.amap.com/search?keyword='+encodeURIComponent(anchor+' '+(key==='charging'?'充电宝':'行李寄存'))+'&city=上海&view=map',sourceId:guide.id,status:'provider-search',liveAvailability:false});
  result.push({id:'guide-'+key,kind:key,title:zh?'官方使用与查询指引':'Official service guide',description:zh?guide.summaryZh:guide.summary,url:guide.url,sourceId:guide.id,status:'official-guide',liveAvailability:false});
 }
 return [...new Map(result.map(r=>[r.id,r])).values()];
}
return{records,categories,sourceFor,cards,current,verified:V};
});
