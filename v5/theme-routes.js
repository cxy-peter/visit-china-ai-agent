/* Evidence-backed route candidates. Schedules are editable planning allocations,
 * not measured travel times, opening hours, tickets or reservations. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./theme-routes-data'),require('./place-data'),require('./verified-services-data'));else root.TravelThemes=factory(root.TravelThemeData,root.ShanghaiPlaces,root.VerifiedTravelServices);})(globalThis,function(Data,P,V){
'use strict';
const catalog=[...Data.places,...P.places,...V.places].map(p=>({...p,sourceIds:p.sourceIds||[p.id]}));
const localPool=[...Data.records,...V.records,...P.places.map(p=>({id:p.id,title:p.zh+' / '+p.en,url:p.url,active:true,reviewedAt:p.checkedAt,reviewDays:30}))];
const routeDefs={
 changning:{titleZh:'长宁：愚园路—中山公园—苏河华政步道',title:'Changning: Yuyuan Road — Zhongshan Park — Suzhou Creek',scopeZh:'按一个相邻街区组织慢游；愚园路和豫园是不同地点。',scope:'A walk through linked neighborhoods. Yuyuan Road and Yuyuan Garden are different places.',primary:['theme-changning-walking-map','theme-changning-yuyuan-food','theme-changning-huazheng'],days:[[
  ['theme-place-yuyuan-road',60,0,'visit'],['theme-place-yuyuan-market',60,30,'meal'],['theme-place-zhongshan',60,45,'visit'],['theme-place-huazheng',60,30,'visit'],['theme-place-zpark',45,45,'break']
 ]],hotels:['theme-place-renaissance']},
 'wwii-shanghai':{titleZh:'上海抗战历史：四行仓库—宝山—金山卫',title:'Shanghai wartime history: Sihang — Baoshan — Jinshanwei',scopeZh:'按今天参观动线分天安排，并非日军行军或战役发生先后顺序。四行仓库是战斗遗址，宝山侧重淞沪抗战与人物纪念，金山卫关联1937年11月的登陆史。',scope:'Days follow a present-day visitor itinerary, not a military advance or a chronological battle sequence. Sihang is a battle site, Baoshan provides conflict and memorial context, and Jinshanwei relates to the November 1937 landings.',primary:['theme-sihang-memorial','theme-songhu-memorial','theme-jinshan-landing'],days:[[
  ['place-sihang',90,0,'visit'],['theme-place-jinyuan',30,15,'visit'],['place-coffee',45,15,'break'],['verified-man-bao-lou',60,60,'meal']
 ],[
  ['theme-place-songhu',120,0,'visit'],['theme-place-yao',45,20,'visit']
 ],[
  ['theme-place-jinshan',120,0,'visit']
 ]],hotels:['sh-marriott-city-centre','verified-courtyard-central']}
};
for(const d of Data.districts||[]){if(routeDefs[d.id])continue;routeDefs[d.id]={titleZh:d.zh+' · 分区漫游',title:d.en+' district itinerary',scopeZh:'依据政府公开地点记录编排；日期、时段和出发位置可继续调整。没有沿用历史节庆活动。',scope:'A plan based on published place records. Adjust date, timing and starting point; historical events are excluded.',primary:['district-'+d.id],days:[[[ 'district-'+d.id+'-0',90,0,'visit'],['district-'+d.id+'-1',90,60,'visit']]],hotels:[],district:d};}
function current(r,now){const ms=Date.parse(r?.reviewedAt||'');return Boolean(r&&r.active!==false&&!r.publicationHash&&r.lastCheck?.status!=='changed'&&Number.isFinite(ms)&&ms<=now&&now-ms<=Number(r.reviewDays||30)*86400000);}
function match(text){const t=String(text||'');const district=Data.districts?.find(d=>t.includes(d.zh)||t.includes(d.zh.replace(/区$/, ''))||t.toLowerCase().includes(d.id));if(district&&!/二战|抗战|wwii|wartime/i.test(t)&&/旅游|游览|路线|行程|citywalk|itinerary|tour|walk|逛|玩/i.test(t))return district.id;if(/长宁|changning/i.test(t)&&/旅游|游览|路线|行程|citywalk|itinerary|tour|walk|逛|玩/i.test(t))return'changning';if(/二战|淞沪|抗战|四行仓库|金山卫|world war|wwii|battle of shanghai|wartime|sihang/i.test(t)&&/地点|路线|旅游|游览|参观|行程|攻入|tour|site|itinerary|walk|visit|历史/i.test(t))return'wwii-shanghai';return null;}
function time(v){if(!/^\d{2}:\d{2}$/.test(String(v||'')))return null;const [h,m]=v.split(':').map(Number);return h<=23&&m<=59?h*60+m:null;}
function stamp(n){const d=Math.floor(n/1440),m=((n%1440)+1440)%1440;return(d?'+'+d+'d ':'')+String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
function mapUrl(place){return'https://uri.amap.com/search?keyword='+encodeURIComponent('上海 '+place.zh+' '+place.address)+'&city=310000&view=map&src=visit-china';}
function build(options={}){
 const theme=options.theme||match(options.query||''),def=routeDefs[theme];if(!def)return null;
 const language=options.language==='en'?'en':'zh',zh=language==='zh',now=options.now===undefined?Date.now():Number(options.now),pool=Array.isArray(options.sourcePool)?options.sourcePool:localPool,valid=new Map(pool.filter(r=>current(r,now)).map(r=>[r.id,r])),missing=new Set(),start=time(options.startTime)??570,requestedDays=Number(options.days),dayCount=Number.isInteger(requestedDays)&&requestedDays>0?Math.min(requestedDays,def.days.length):def.days.length;
 const normalizePlace=id=>{const p=catalog.find(x=>x.id===id);if(!p)return null;const src=p.sourceIds.filter(s=>valid.has(s));if(src.length!==p.sourceIds.length){p.sourceIds.filter(s=>!valid.has(s)).forEach(s=>missing.add(s));return null;}return{id:p.id,title:zh?p.zh:p.en,nameZh:p.zh,nameEn:p.en,address:zh?p.address:p.addressEn,description:zh?p.summaryZh:p.summary,station:p.station||null,category:p.category,sourceIds:src,sourceUrls:src.map(s=>valid.get(s).url),mapUrl:mapUrl(p),url:p.url,phone:p.phone||null,phoneRole:p.phoneRole||null,liveAvailability:false};};
 const days=def.days.slice(0,dayCount).map((specs,i)=>{let cursor=start;const stops=[];for(const [id,duration,buffer,role] of specs){if(options.includeFood===false&&['meal','break'].includes(role))continue;const p=normalizePlace(id);if(!p)continue;cursor+=buffer;stops.push({...p,order:stops.length+1,role,plannedArrival:stamp(cursor),plannedDeparture:stamp(cursor+duration),plannedDurationMinutes:duration,transferBufferMinutes:buffer,timeBasis:'editorial-planning-allocation',transferNote:zh?'预留移动与休息时间；实际交通请打开地图。':'Planning buffer for travel/rest; check the map for actual directions.'});cursor+=duration;}return{day:i+1,title:zh?(def.district?def.district.zh:theme==='changning'?'长宁街区':['中心城区','宝山纪念场馆','金山卫登陆史'][i]):(def.district?def.district.en:theme==='changning'?'Changning neighborhoods':['Central Shanghai','Baoshan memorials','Jinshanwei history'][i]),stops};});
 // The central museum shares a catalog item with existing nearby cards, but
 // the history-specific reference must also remain active before we use it.
 if(theme==='wwii-shanghai'&&!valid.has('theme-sihang-memorial')){missing.add('theme-sihang-memorial');days[0].stops=days[0].stops.filter(s=>!['place-sihang','theme-place-jinyuan'].includes(s.id));}
 const accommodations=options.includeHotel===false?[]:def.hotels.map(normalizePlace).filter(Boolean).map(p=>({...p,association:theme==='changning'?(zh?'中山公园站片区，可衔接长宁游览':'Zhongshan Park station area for this Changning visit'):(zh?'中心城区住宿备选；并非宝山或金山附近酒店':'Central-Shanghai lodging options, not hotels near Baoshan or Jinshan')}));
 const allSourceIds=[...new Set([...days.flatMap(d=>d.stops.flatMap(s=>s.sourceIds)),...accommodations.flatMap(p=>p.sourceIds),...def.primary.filter(s=>valid.has(s))])];
 const notes=zh?['时间为可调整的行程建议，不是开馆时间、实时交通预测或已预约时段。','出发前核对开放、预约、天气与通行；餐饮和酒店不含实时房态、餐位、价格。']:['Times are editable itinerary suggestions, not opening hours, live journey estimates or reservations.','Check admission, reservations, weather and access before travel. No live room/table availability or price is included.'];
 if(def.district)notes.push(zh?'餐饮可围绕两个停留点搜索；当前尚未核对本区具体餐馆和酒店，不把其他区商户当作附近推荐。':'Search for meals near these stops; district-specific restaurants and hotels are not yet reviewed.');
 if(theme==='wwii-shanghai')notes.push(zh?'宝山与金山分开安排；两处尚无同片区已核验餐饮酒店记录，可在导航中就近查询或向运营补充资料。':'Baoshan and Jinshan are separate outings. This library has no reviewed food/lodging records in those two areas yet; use local navigation or add sources.');
 if(dayCount<def.days.length)notes.push(zh?'已按天数裁剪，只展示前'+dayCount+'天，其余地点没有塞入同一天。':'The plan is limited to its first '+dayCount+' day(s); remaining areas have not been compressed into one day.');
 return{schemaVersion:1,kind:'itinerary',theme,language,title:zh?def.titleZh:def.title,scope:zh?def.scopeZh:def.scope,city:'Shanghai',startTime:stamp(start),days,accommodations,sourceIds:def.primary.filter(s=>valid.has(s)).slice(0,3),allSourceIds,sources:allSourceIds.map(id=>{const r=valid.get(id);return{id,title:r.title,url:r.url,reviewedAt:r.reviewedAt,publishedAt:r.publishedAt||r.published||null};}),missingSourceIds:[...missing],status:missing.size?'partial':'ready',timeBasis:'editorial-planning-allocation',liveAvailability:false,notes};
}
function answer(plan){if(!plan)return'';const zh=plan.language!=='en';const lines=[plan.title,plan.scope,...plan.days.flatMap(d=>[(zh?'第':'Day ')+d.day+(zh?'天 · ':' · ')+d.title,...d.stops.map(s=>s.plannedArrival+' '+s.title+' · '+s.address)]),...(plan.accommodations.length?[(zh?'住宿候选：':'Lodging options: ')+plan.accommodations.map(p=>p.title+(p.phone?' ('+p.phone+')':'')).join('；')]:[]),...plan.notes];if(plan.missingSourceIds.length)lines.push(zh?'部分资料待更新，对应地点未列入当前路线。':'Some references need updating; affected places are omitted.');return lines.join('\n');}
function csvCell(v){let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return'"'+s.replace(/"/g,'""')+'"';}
function exportPlan(plan,format='markdown'){
 if(!plan||plan.kind!=='itinerary'||!Array.isArray(plan.days))throw Error('ITINERARY_REQUIRED');
 const base='visit-china-'+plan.theme,zh=plan.language!=='en';
 if(format==='json')return{filename:base+'.json',mime:'application/json;charset=utf-8',content:JSON.stringify(plan,null,2)};
 if(format==='csv'){const rows=[['day','order','planned_arrival','planned_departure','place','address','planning_basis','sources'],...plan.days.flatMap(d=>d.stops.map(s=>[d.day,s.order,s.plannedArrival,s.plannedDeparture,s.title,s.address,s.timeBasis,s.sourceUrls.join(' | ')]))];return{filename:base+'.csv',mime:'text/csv;charset=utf-8',content:'\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')};}
 if(!['markdown','md'].includes(format))throw Error('ITINERARY_EXPORT_FORMAT');
 const lines=['# '+plan.title,'',plan.scope,'',...plan.notes.map(n=>'- '+n),''];
 for(const d of plan.days){lines.push('## '+(zh?'第 '+d.day+' 天':'Day '+d.day)+' · '+d.title,'');for(const s of d.stops)lines.push(s.order+'. **'+s.plannedArrival+'–'+s.plannedDeparture+' '+s.title+'**', '   '+s.address+' — '+s.description,'   '+(zh?'地图：':'Map: ')+s.mapUrl,'   '+(zh?'来源：':'Sources: ')+s.sourceUrls.join(' | '),'');}
 if(plan.accommodations.length){lines.push('## '+(zh?'住宿候选':'Lodging options'),'');for(const h of plan.accommodations)lines.push('- '+h.title+' · '+h.address+(h.phone?' · '+h.phone:''),'  '+h.association,'  '+h.sourceUrls.join(' | '),'');}
 lines.push('## '+(zh?'资料':'References'),'');for(const s of plan.sources)lines.push('- ['+s.title+']('+s.url+') · '+(zh?'核对日期：':'Reviewed: ')+s.reviewedAt);return{filename:base+'.md',mime:'text/markdown;charset=utf-8',content:lines.join('\n')};
}
return{build,match,answer,exportPlan,places:catalog,routeDefs};
});
