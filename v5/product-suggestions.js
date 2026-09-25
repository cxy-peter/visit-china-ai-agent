/* Relevant service extensions, not a supplier inventory or booking API. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./city-scope'));else root.TravelProducts=factory(root.TravelCities);})(globalThis,function(cities){
'use strict';
const items={
 rail:{kind:'rail',zh:'比较火车票与出发时间',en:'Compare trains and departure times',url:'https://www.trip.com/trains/china/'},
 flight:{kind:'flight',zh:'查找机票',en:'Find a flight',url:'https://www.trip.com/flights/'},
 hotel:{kind:'hotel',zh:'查看住宿选择',en:'Explore places to stay',url:'https://www.trip.com/hotels/'},
 car:{kind:'taxi',zh:'比较自驾租车',en:'Compare self-drive rentals',url:'https://www.trip.com/carhire/'},
 transfer:{kind:'taxi',zh:'比较带司机接送',en:'Compare transfers with a driver',url:'https://www.trip.com/airport-transfers/'},
 tour:{kind:'nearby',zh:'看看一日团与当地体验',en:'Explore day tours and experiences',url:'https://www.trip.com/things-to-do/'},
 food:{kind:'restaurant',zh:'查看餐饮与本地生活',en:'Explore dining and local services',url:'https://www.dianping.com/'}
};
const providers={
 rail:[['trip-rail','Trip.com','https://www.trip.com/trains/china/'],['rail-official','12306','https://www.12306.cn/']],
 flight:[['trip-flight','Trip.com','https://www.trip.com/flights/']],
 hotel:[['trip-hotel','Trip.com','https://www.trip.com/hotels/']],
 car:[['trip-car','Trip.com','https://www.trip.com/carhire/']],
 transfer:[['trip-transfer','Trip.com','https://www.trip.com/airport-transfers/'],['didi-transfer','DiDi','https://www.didiglobal.com/']],
 tour:[['trip-tour','Trip.com','https://www.trip.com/things-to-do/'],['meituan-tour','美团 / Meituan','https://www.meituan.com/']],
 food:[['dianping-food','大众点评 / Dianping','https://www.dianping.com/'],['meituan-food','美团 / Meituan','https://www.meituan.com/']]
};
const terms={hotel:'酒店|住宿|hotel|accommodation',car:'租车|自驾|rental|rent a car|self.drive',transfer:'接送|打车|taxi|transfer',tour:'一日游|一日团|跟团|tour',food:'餐厅|餐饮|restaurant|dining',rail:'火车票|高铁票|train ticket',flight:'机票|flight'};
function declined(key,text){const t=terms[key]||key;return new RegExp('(?:不要|不需要|不想|不考虑).{0,7}(?:'+t+')|(?:no|do not|don.t|without|not interested in)\\s+(?:any |a |the )?(?:'+t+')','i').test(text);}
function canonical(v){return cities?.canonical(v)||String(v||'').trim()||null;}
function forIntent(intent={},text='',context={}){
 const f=context.facts||{},city=canonical(intent.city||context.city),negative=String(text||'');
 if(context.suppressed||context.outcome==='unsolved'||Number.isFinite(f.battery)&&f.battery<=5||['offline','poor'].includes(f.network)||intent.responseMode==='service'||['charging','luggage','metro_ticket','unclear','other'].includes(intent.kind))return[];
 let keys=intent.responseMode==='guide'&&/机场|airport|\bPVG\b/i.test(negative)?['transfer','hotel']:({rail:['hotel','car','tour'],flight:['flight','transfer','hotel'],taxi:['transfer','car'],hotel:['tour','food'],itinerary:['tour','food','hotel'],nearby:['tour','food'],restaurant:['food'],metro:[]})[intent.kind]||[];
 const dismissed=context.dismissed||[];
 return keys.filter(k=>!declined(k,negative)&&!dismissed.includes(k)&&!(k==='hotel'&&(f.hotelBooked===true||f.hotel==='booked'))&&!(k==='flight'&&(f.flightBooked===true||f.flight==='booked'))).slice(0,3).map(k=>({id:k,...items[k],city,sample:true,liveInventory:false,mode:'provider-discovery',url:k==='rail'&&city==='Hong Kong'?'https://www.mtr.com.hk/en/customer/main/index.html':items[k].url,reason:intent.responseMode==='guide'?'arrival-continuation':intent.kind+'-extension'}));
}
function time(value){if(value==null||value==='')return '';if(typeof value!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))throw Error('DEPARTURE_TIME');return value;}
function departureWindow(options={}){
 const period=options.period||'all',ranges={all:['',''],morning:['00:00','11:59'],afternoon:['12:00','17:59'],evening:['18:00','23:59']};
 if(!Object.hasOwn(ranges,period))throw Error('DEPARTURE_PERIOD');
 const after=time(options.after),before=time(options.before),[low,high]=ranges[period];
 const start=[after,low].filter(Boolean).sort().at(-1)||'',end=[before,high].filter(Boolean).sort()[0]||'';
 if(start&&end&&start>end)throw Error('DEPARTURE_WINDOW');return{after:start,before:end};
}
function safePlace(v){if(v==null||v==='')return null;if(typeof v!=='string'||v.length>100||/[<>@]|https?:|\d{7,}/i.test(v))throw Error('PLACE_FIELD');return v.trim()||null;}
function prepare(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||!Object.hasOwn(items,input.product))throw Error('PRODUCT_REQUIRED');
 const allowed=new Set(['product','city','origin','destination','language','date','after','before','seat']);for(const k of Object.keys(input))if(!allowed.has(k))throw Error('UNSUPPORTED_PRODUCT_FIELD');
 const city=canonical(safePlace(input.city)),origin=safePlace(input.origin),destination=safePlace(input.destination),after=time(input.after),before=time(input.before);
 if(after&&before&&after>before)throw Error('DEPARTURE_WINDOW');
 const date=input.date||null;if(date&&(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))throw Error('TRAVEL_DATE');
 if(input.seat!=null&&!['first','second'].includes(input.seat))throw Error('SEAT_FIELD');
 const zh=input.language!=='en',request={product:input.product,city,origin,destination,date,after,before,seat:input.seat||null},missing=[];
 if(!city)missing.push('city');if(['rail','flight','transfer'].includes(input.product)){if(!origin)missing.push('origin');if(!destination)missing.push('destination');}if(!date)missing.push('date');
 let rows=providers[input.product];if(city==='Hong Kong'&&input.product==='rail')rows=[['mtr-rail','MTR','https://www.mtr.com.hk/en/customer/main/index.html']];
 if(city&&!['Shanghai','Beijing','Guangzhou','Shenzhen','China'].includes(city))rows=rows.filter(r=>!/^meituan-|dianping-|rail-official/.test(r[0]));
 return{schema:'related-services/1',mode:'mock-adapter',request,missingFields:missing,offers:rows.map(([id,provider,url])=>({id,provider,url,product:input.product,inventory:null,price:null,currency:null,availability:'not-connected',prefilled:false,bookable:false})),bookingCreated:false,providerRequestSent:false,notice:zh?'已整理查询条件，尚未发送给服务商。下面是公开平台入口，不是报价、库存或预订确认；请在平台重新核对条件。':'Search details are prepared but have not been sent to a provider. These are public entry points, not quotes, inventory or booking confirmations; recheck the details on the provider site.',qualification:input.product==='car'?(zh?'这是自驾租车，需由服务商核验驾驶资格、年龄及押金等条件；不等于带司机接送。':'Self-drive rental requires provider checks of driving eligibility, age and deposits. It is not a transfer with a driver.'):null};
}
return{items,providers,forIntent,declined,prepare,time,departureWindow};
});
