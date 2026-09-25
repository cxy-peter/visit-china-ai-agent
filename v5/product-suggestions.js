(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TravelProducts=factory();})(globalThis,function(){
'use strict';
const items={
 rail:{kind:'rail',zh:'还需比较火车票？',en:'Compare train tickets?',url:'https://www.trip.com/trains/china/'},
 flight:{kind:'flight',zh:'需要机票？',en:'Need a flight?',url:'https://www.trip.com/flights/'},
 hotel:{kind:'hotel',zh:'需要住宿？',en:'Need a hotel?',url:'https://www.trip.com/hotels/'},
 car:{kind:'taxi',zh:'需要租车？',en:'Need a rental car?',url:'https://www.trip.com/carhire/to-china-1/shanghai-2/'},
 transfer:{kind:'taxi',zh:'需要接送服务？',en:'Need an airport transfer?',url:'https://www.trip.com/airport-transfers/'},
 tour:{kind:'nearby',zh:'示例：上海英文私人一日团',en:'Example: private Shanghai day tour',url:'https://www.trip.com/things-to-do/detail/50561577/'},
 food:{kind:'restaurant',zh:'大众点评：餐厅与团购查询',en:'Dianping: dining and local deals',url:'https://www.dianping.com/shanghai'}
};
function forIntent(intent={},text=''){if(intent.responseMode==='service'||['charging','luggage','metro_ticket','unclear','other'].includes(intent.kind))return[];const keys=intent.responseMode==='guide'&&/机场|airport|\bPVG\b/i.test(text)?['transfer','hotel']:({rail:['hotel','car','tour'],flight:['transfer','hotel','rail'],taxi:['transfer','car'],hotel:['tour','food'],itinerary:['tour','food','hotel'],nearby:['tour','food'],restaurant:['food'],metro:[]})[intent.kind]||[];return keys.filter(k=>!new RegExp('(?:不要|不需要).{0,4}(?:'+({hotel:'酒店|住宿',car:'租车',tour:'团|一日游',food:'餐厅|吃的',transfer:'接送'}[k]||k)+')','i').test(text)).map(k=>({id:k,...items[k],sample:k==='tour',verifiedAt:'2026-09-25',liveInventory:false}));}
return{items,forIntent};
});
