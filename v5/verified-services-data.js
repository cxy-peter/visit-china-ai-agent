/* Public business/transport facts checked against the linked operator or government pages.
 * These are reviewed records, not live availability, telephone-call verification or booking APIs. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.VerifiedTravelServices=factory();})(globalThis,function(){
'use strict';
const checkedAt='2026-09-25';
const sources={
 pullman:'https://pullman.accor.com/en/hotels/shanghai/7598.html',
 courtyard:'https://www.marriott.com/en-us/hotels/shapx-courtyard-shanghai-central/overview/',
 courtyardDining:'https://www.marriott.com/en-us/hotels/shapx-courtyard-shanghai-central/dining/',
 marquis:'https://www.marriott.com/en-us/hotels/shamc-shanghai-marriott-marquis-city-centre/overview/',
 marquisDining:'https://www.marriott.com/en-us/hotels/shamc-shanghai-marriott-marquis-city-centre/dining/',
 jw:'https://www.marriott.com/en-us/hotels/shajw-jw-marriott-hotel-shanghai-at-tomorrow-square/overview/',
 jwDining:'https://www.marriott.com/en-us/hotels/shajw-jw-marriott-hotel-shanghai-at-tomorrow-square/dining/',
 hyatt:'https://www.hyatt.com/hyatt-place/zh-CN/shazh-hyatt-place-shanghai-hongqiao-cbd',
 hyattDining:'https://www.hyatt.com/hyatt-place/en-US/shazh-hyatt-place-shanghai-hongqiao-cbd/dining',
 dazhong:'https://www.96822.com/Choose1_Details.aspx?DetailID=20&ID=11',
 pvgCafe:'https://english.shanghai.gov.cn/en-Cafes/20240718/2d6c75b52aad47cba2e60fff2548358e.html',
 airportTransport:'https://english.shanghai.gov.cn/en-Transportation/20231214/649e06ea38f74aaeb573fa2debbe97d3.html',
 hongqiaoTaxi:'https://www.shanghaiairport.com/enhq/czc/index.html',
 stations:'https://english.shanghai.gov.cn/en-Transportation/20250126/484b92f86eeb49d7b26086d25010d782.html',
 railFaq:'https://www.12306.cn/en/faq.html',
 hongqiaoNavigation:'https://english.shanghai.gov.cn/en-LatestNews/20251107/2ee190bc581c4b53b953b64eb3749534.html',
 hongqiaoPickup:'https://english.shanghai.gov.cn/en-Latest-WhatsNew/20260802/f314cad958d4426f832031a1c87fe1e9.html',
 lockers:'https://english.shanghai.gov.cn/en-EasyShanghai/20260909/7ff66d198288406e8fd17c5c4c430eea.html',
 pvgRest:'https://english.shanghai.gov.cn/en-Latest-WhatsNew/20250710/4da2065f8ff94173bd996ad69f1e99cd.html'
};
const stationNames={
 '上海火车站':{en:'Shanghai Railway Station',aliases:['上海站','Shanghai Station']},
 '汉中路':{en:'Hanzhong Road',aliases:[]},
 '人民广场':{en:"People's Square",aliases:['People’s Square','People Square']},
 '虹桥火车站':{en:'Hongqiao Railway Station',aliases:['上海虹桥站','虹桥站','虹桥高铁站','Shanghai Hongqiao Railway Station','Hongqiao Transportation Hub','虹桥枢纽']},
 '虹桥1号航站楼':{en:'Hongqiao Airport Terminal 1',aliases:['虹桥机场T1','SHA T1']},
 '虹桥2号航站楼':{en:'Hongqiao Airport Terminal 2',aliases:['虹桥机场T2','SHA T2']},
 '浦东1号2号航站楼':{en:'Pudong Airport Terminal 1&2',aliases:['浦东机场','浦东国际机场','Pudong Airport','Pudong International Airport','PVG']},
 '南京东路':{en:'East Nanjing Road',aliases:['Nanjing East Road']},
 '徐家汇':{en:'Xujiahui',aliases:[]},
 '豫园':{en:'Yuyuan Garden',aliases:['Yuyuan','Yu Garden']},
 '迪士尼':{en:'Disney Resort',aliases:['Shanghai Disney Resort']}
};
const boundaryZh='页面核对记录；营业、可用量和价格请向运营方确认。未接实时库存或预订接口。';
const boundaryEn='Reviewed public record. Confirm operation, availability and prices with the provider; no live inventory or booking API.';
const link=(station,basis,zh,en,sourceKeys)=>({station,basis,descriptionZh:zh,description:en,sourceUrls:sourceKeys.map(k=>sources[k])});
const hotelStation=(station,sourceKey,zh,en)=>link(station,'operator-nearby',zh,en,[sourceKey]);
const containerStation=(station,keys,zh,en)=>link(station,'inside-verified-property',zh,en,keys);
const facilityStation=(station,key,zh,en)=>link(station,'official-facility-location',zh,en,[key]);
const items=[
 {
  id:'verified-pullman-jingan',kind:'hotel',zh:'上海静安铂尔曼酒店',en:"Pullman Shanghai Jing'an",publisher:'Accor / Pullman',sourceType:'operator',sourceKey:'pullman',
  address:'静安区梅园路330号',addressEn:"330 Meiyuan Road, Jing'an",phone:'+86 21 6353 5555',phoneRole:'hotel',
  summaryZh:'酒店官网列出上海火车站为可步行到达的邻近铁路站。',summary:'The hotel identifies Shanghai Railway Station as a nearby walkable rail station.',
  stationEvidence:[hotelStation('上海火车站','pullman','运营方到达指南明确列出上海火车站可步行前往。','The operator explicitly describes walking from Shanghai Railway Station.')]
 },
 {
  id:'verified-courtyard-central',kind:'hotel',zh:'上海浦西万怡酒店',en:'Courtyard by Marriott Shanghai Central',publisher:'Marriott',sourceType:'operator',sourceKey:'courtyard',
  address:'静安区恒丰路338号',addressEn:"338 Hengfeng Road, Jing'an",phone:'+86 21 2215 3888',phoneRole:'hotel',
  summaryZh:'官网附近交通列出汉中路站和上海火车站。',summary:'The hotel lists Hanzhong Road and Shanghai Railway Station in its nearby transport section.',
  stationEvidence:[hotelStation('汉中路','courtyard','官网附近地铁站明确列出汉中路站。','The nearby subway list names Hanzhong Road.'),hotelStation('上海火车站','courtyard','官网附近地铁及铁路站列出上海火车站。','The nearby subway and rail lists name Shanghai Railway Station.')]
 },
 {
  id:'verified-marriott-city-centre',replacementOf:'sh-marriott-city-centre',kind:'hotel',zh:'上海雅居乐万豪侯爵酒店',en:'Shanghai Marriott Marquis City Centre',publisher:'Marriott',sourceType:'operator',sourceKey:'marquis',
  address:'黄浦区西藏中路555号',addressEn:'555 Middle Xizang Road, Huangpu',phone:'+86 21 2312 9888',phoneRole:'hotel',
  summaryZh:'酒店官网明确列出附近人民广场地铁站。',summary:"The hotel's nearby transport information identifies People's Square metro station.",
  stationEvidence:[hotelStation('人民广场','marquis','官网说明人民广场地铁枢纽可步行抵达。',"The operator describes People's Square metro hub as within walking distance.")]
 },
 {
  id:'verified-jw-tomorrow-square',kind:'hotel',zh:'上海明天广场JW万豪酒店',en:'JW Marriott Hotel Shanghai at Tomorrow Square',publisher:'Marriott',sourceType:'operator',sourceKey:'jw',
  address:'黄浦区南京西路399号',addressEn:'399 West Nanjing Road, Huangpu',phone:'+86 21 5359 4969',phoneRole:'hotel',
  summaryZh:'酒店官网附近交通列出人民广场地铁站。',summary:"The hotel lists People's Square as its nearby subway station.",
  stationEvidence:[hotelStation('人民广场','jw','官网附近地铁站列出人民广场站。',"The nearby subway list names People's Square.")]
 },
 {
  id:'verified-hyatt-place-hongqiao',kind:'hotel',zh:'上海虹桥商务区凯悦嘉轩酒店',en:'Hyatt Place Shanghai Hongqiao CBD',publisher:'Hyatt',sourceType:'operator',sourceKey:'hyatt',
  address:'闵行区申虹路9号',addressEn:'9 Shenhong Road, Minhang',phone:'+86 21 3329 5588',phoneRole:'hotel',
  summaryZh:'官网说明酒店邻近虹桥交通枢纽；不等同于位于候车厅内。',summary:'The operator describes the hotel as near Hongqiao Transportation Hub; it is not inside the railway waiting hall.',
  stationEvidence:[hotelStation('虹桥火车站','hyatt','官网说明可步行到达虹桥交通枢纽；按枢纽关联，未承诺最近出口。','The operator describes a walkable connection to Hongqiao Transportation Hub; this is a hub association, not a nearest-exit claim.')]
 },
 {
  id:'verified-dazhong-airport',kind:'hotel',zh:'上海大众空港宾馆',en:'Shanghai Dazhong Airport Hotel',publisher:'大众交通集团 / Dazhong Transportation Group',sourceType:'operator',sourceKey:'dazhong',sourcePublishedAt:'2017-08-23',
  address:'浦东新区迎宾大道6001号（浦东机场）',addressEn:'6001 Yingbin Avenue, Pudong Airport',phone:'+86 21 3879 9999',phoneRole:'reservations',
  summaryZh:'大众集团官网将宾馆定位在浦东机场T1与T2之间；电话来自集团订房信息，未电话实拨核验。',summary:'The group locates the hotel between Pudong Airport T1 and T2. The reservation number is published by the operator and has not been test-called.',
  stationEvidence:[hotelStation('浦东1号2号航站楼','dazhong','集团官网将酒店定位在浦东机场T1、T2之间，按同一航站楼枢纽关联。','The group locates the property between T1 and T2; association is to the shared terminal hub.')]
 },
 {
  id:'verified-momo-cafe',kind:'restaurant',zh:'MoMo Café（上海浦西万怡酒店）',en:'MoMo Café at Courtyard Shanghai Central',publisher:'Marriott',sourceType:'operator',sourceKey:'courtyardDining',additionalSources:['courtyard'],
  address:'静安区恒丰路338号，上海浦西万怡酒店内',addressEn:'Inside Courtyard Shanghai Central, 338 Hengfeng Road',phone:'+86 21 2215 3888',phoneExtension:'6710',phoneRole:'restaurant-extension',
  summaryZh:'酒店官网收录的全天餐厅；菜单、营业与席位以餐厅确认结果为准。',summary:'An all-day restaurant listed by its hotel; contact the restaurant for current menus, hours and tables.',
  stationEvidence:[containerStation('汉中路',['courtyardDining','courtyard'],'餐厅位于酒店内，酒店官网列出汉中路站。','The restaurant is inside the hotel whose transport page lists Hanzhong Road.'),containerStation('上海火车站',['courtyardDining','courtyard'],'餐厅位于酒店内，酒店官网列出上海火车站。','The restaurant is inside the hotel whose transport page lists Shanghai Railway Station.')]
 },
 {
  id:'verified-man-bao-lou',kind:'restaurant',zh:'满宝楼（雅居乐万豪侯爵酒店）',en:'Man Bao Lou at Shanghai Marriott Marquis City Centre',publisher:'Marriott',sourceType:'operator',sourceKey:'marquisDining',additionalSources:['marquis'],
  address:'黄浦区西藏中路555号，雅居乐万豪侯爵酒店内',addressEn:'Inside Shanghai Marriott Marquis City Centre, 555 Middle Xizang Road',phone:'+86 21 2312 9732',phoneRole:'restaurant',
  summaryZh:'当前酒店官网将中餐厅列为满宝楼；保留当前名称，避免沿用第三方旧称。',summary:'The current hotel dining page names the Chinese restaurant Man Bao Lou.',
  stationEvidence:[containerStation('人民广场',['marquisDining','marquis'],'餐厅位于酒店内；酒店官网说明人民广场地铁枢纽可步行抵达。',"The restaurant is inside a hotel the operator links to People's Square metro hub.")]
 },
 {
  id:'verified-wan-hao-xuan',kind:'restaurant',zh:'万豪轩中餐厅（明天广场）',en:'Wan Hao Xuan Chinese Restaurant at Tomorrow Square',publisher:'Marriott',sourceType:'operator',sourceKey:'jwDining',additionalSources:['jw'],
  address:'黄浦区南京西路399号，明天广场JW万豪酒店内',addressEn:'Inside JW Marriott at Tomorrow Square, 399 West Nanjing Road',phone:'+86 21 5359 4969',phoneExtension:'6436',phoneRole:'restaurant-extension',
  summaryZh:'酒店官网收录的中餐厅，菜式介绍包括粤菜与点心。',summary:'The hotel lists this Chinese restaurant with Cantonese dishes and dim sum.',
  stationEvidence:[containerStation('人民广场',['jwDining','jw'],'餐厅位于酒店内，酒店附近地铁站为人民广场。',"The restaurant is inside the hotel whose nearby subway station is People's Square.")]
 },
 {
  id:'verified-hyatt-kitchen',kind:'restaurant',zh:'嘉味餐厅（虹桥商务区凯悦嘉轩）',en:'The Kitchen Menu at Hyatt Place Shanghai Hongqiao CBD',publisher:'Hyatt',sourceType:'operator',sourceKey:'hyattDining',additionalSources:['hyatt'],
  address:'闵行区申虹路9号，凯悦嘉轩酒店内',addressEn:'Inside Hyatt Place Shanghai Hongqiao CBD, 9 Shenhong Road',phone:'+86 21 3329 5588',phoneRole:'hotel-switchboard',
  summaryZh:'凯悦官网餐饮页提供嘉味餐厅菜单信息；联系电话是酒店总机，营业时间需向酒店询问。',summary:'The Hyatt dining page lists The Kitchen Menu. The phone is the hotel switchboard; ask the hotel about dining hours.',
  stationEvidence:[containerStation('虹桥火车站',['hyattDining','hyatt'],'酒店内餐厅；酒店官网说明邻近虹桥交通枢纽。','An in-hotel restaurant; the hotel is described by Hyatt as near Hongqiao Transportation Hub.')]
 },
 {
  id:'verified-mstand-pvg-t1',kind:'restaurant',zh:'M Stand（浦东机场T1到达）',en:'M Stand at Pudong Airport T1 Arrivals',publisher:'上海市政府国际服务门户',sourceType:'official',sourceKey:'pvgCafe',sourcePublishedAt:'2024-07-18',
  address:'浦东机场T1到达层4号门附近',addressEn:'Near Arrival Gate 4, Pudong Airport Terminal 1',
  summaryZh:'政府机场咖啡指南收录的位置；不代表已核实此刻开门，出发前查询机场商户目录。',summary:'A location listed in the government airport café guide; check the airport directory for current operation.',
  stationEvidence:[facilityStation('浦东1号2号航站楼','pvgCafe','政府指南明确定位于浦东机场T1到达层4号门附近；按机场枢纽关联。','The government guide places it near Arrival Gate 4 in T1; linked to the airport hub.')]
 },
 {
  id:'verified-pvg-taxi',kind:'taxi',zh:'浦东机场官方出租车上车点',en:'Pudong Airport official taxi pickup',publisher:'上海市政府国际服务门户 / Shanghai Airport Authority',sourceType:'official',sourceKey:'airportTransport',sourceUpdatedAt:'2026-06-04',
  address:'浦东机场T1到达12号门外；T2到达25号门外',addressEn:'Outside Arrival Gate 12 at T1; outside Arrival Gate 25 at T2, Pudong Airport',
  summaryZh:'按机场出租车指示前往对应航站楼排队点，并以现场标识为准。出租车排队点与网约车上车点不同。未提供实时报价或排队时间。',summary:'Follow official taxi signs for your terminal and current on-site directions. Taxi ranks differ from ride-hailing pickup areas. No live fare or queue estimate is provided.',
  stationEvidence:[facilityStation('浦东1号2号航站楼','airportTransport','政府交通指南明确列出浦东机场T1/T2出租车到达门位置。','The government transport guide names the taxi arrival gates at Pudong T1 and T2.')]
 },
 {
  id:'verified-hongqiao-airport-taxi',kind:'taxi',zh:'虹桥机场官方出租车上车点',en:'Hongqiao Airport official taxi pickup',publisher:'上海机场集团 / Shanghai Airport Authority',sourceType:'operator',sourceKey:'hongqiaoTaxi',additionalSources:['airportTransport'],sourceUpdatedAt:'2024-04-16',
  address:'虹桥机场T1到达层1号门外；T2到达层4号门外',addressEn:'Outside Arrival Gate 1 at T1; outside Arrival Gate 4 at T2, Hongqiao Airport',
  summaryZh:'机场官网与政府交通指南均列出这两个上车点；按所到航站楼选择，并以现场标识为准。此条不是虹桥火车站出租车点。',summary:'The airport and government guide identify these terminal taxi ranks. Choose your actual terminal and follow current signage. This record is not the railway-station taxi rank.',
  stationEvidence:[facilityStation('虹桥1号航站楼','hongqiaoTaxi','机场官网明确列出虹桥T1到达层1号门。','The airport lists T1 Arrival Gate 1.'),facilityStation('虹桥2号航站楼','hongqiaoTaxi','机场官网明确列出虹桥T2到达层4号门。','The airport lists T2 Arrival Gate 4.')]
 },
 {
  id:'verified-shanghai-rail-station',kind:'rail',zh:'上海站（国铁）',en:'Shanghai Railway Station (China Railway)',publisher:'上海市政府国际服务门户',sourceType:'official',sourceKey:'stations',additionalSources:['railFaq'],sourcePublishedAt:'2025-01-26',
  address:'静安区秣陵路，上海站',addressEn:"Shanghai Railway Station, Moling Road, Jing'an",providerUrl:'https://www.12306.cn/en/',
  summaryZh:'政府站场指南列出上海站位于秣陵路，可接地铁1、3、4号线。铁路票应核对出发站名称、日期和车次；上海站不是上海虹桥站。',summary:'The official guide places Shanghai Railway Station on Moling Road with metro lines 1, 3 and 4. Match your railway ticket to its station, date and train; Shanghai and Shanghai Hongqiao are different stations.',
  stationEvidence:[facilityStation('上海火车站','stations','政府指南明确列出上海站与地铁1、3、4号线相接。','The official station guide links Shanghai Railway Station with metro lines 1, 3 and 4.')]
 },
 {
  id:'verified-hongqiao-rail-station',kind:'rail',zh:'上海虹桥站（国铁）',en:'Shanghai Hongqiao Railway Station (China Railway)',publisher:'上海市政府国际服务门户',sourceType:'official',sourceKey:'stations',additionalSources:['railFaq'],sourcePublishedAt:'2025-01-26',
  address:'闵行区申贵路，上海虹桥站',addressEn:'Shanghai Hongqiao Railway Station, Shengui Road, Minhang',providerUrl:'https://www.12306.cn/en/',
  summaryZh:'政府站场指南列出上海虹桥站位于申贵路，可接地铁2、10、17号线。高铁查询使用12306，并先确认出发日期、到达站和实际车次。',summary:'The official guide places Shanghai Hongqiao Railway Station on Shengui Road with metro lines 2, 10 and 17. Query 12306 using the travel date and destination; confirm the actual train and station.',
  stationEvidence:[facilityStation('虹桥火车站','stations','政府指南明确列出上海虹桥站与地铁2、10、17号线相接。','The official station guide links Shanghai Hongqiao with metro lines 2, 10 and 17.')]
 },
 {
  id:'verified-rail-12306',kind:'rail',zh:'铁路12306英文购票与证件指引',en:'China Railway 12306 English ticket and ID guide',publisher:'China Railway 12306',sourceType:'operator',sourceKey:'railFaq',providerUrl:'https://www.12306.cn/en/',
  address:'线上官方服务；非实体门店',addressEn:'Official online service, not a physical outlet',globalScope:true,
  summaryZh:'12306英文站提供购票、改签、退票等服务；外国旅客可按规则使用有效护照购票。乘车使用购票时的有效证件，行程信息单不能作为车票。未接入本站实时余票、价格或下单。',summary:'The English 12306 site supports ticket purchase, changes and refunds. Eligible foreign passengers can use valid passports. Carry the ID used to buy the ticket; an itinerary sheet is not a ticket. This app has no live inventory, fare or ordering connection.',
  stationEvidence:[]
 },
 {
  id:'verified-hongqiao-indoor-navigation',kind:'station_service',zh:'虹桥火车站随申行室内导航',en:'SH MaaS indoor navigation at Hongqiao Railway Station',publisher:'上海市政府国际服务门户 / Shanghai Municipal Commission of Transport',sourceType:'official',sourceKey:'hongqiaoNavigation',sourcePublishedAt:'2025-11-07',
  address:'虹桥火车站；在随申行的枢纽通内使用',addressEn:'Hongqiao Railway Station; access via Hub Connect in SH MaaS',
  summaryZh:'打开随申行／SH MaaS，进入枢纽通，切换虹桥火车站后选择室内导航，可查询地铁、出租车、网约车及站内设施路线。实时结果在官方应用查看，本站不读取室内定位。',summary:'In SH MaaS / Suishenxing, open Hub Connect, select Hongqiao Railway Station and choose Indoor Navigation for transport pickup and station amenities. Live navigation stays in the official app; this site does not access indoor positioning.',
  stationEvidence:[facilityStation('虹桥火车站','hongqiaoNavigation','交通委来源的政府报道明确针对虹桥火车站室内导航。','The transport-commission sourced government guide is specifically for Hongqiao Railway Station.')]
 },
 {
  id:'verified-hongqiao-p10-charging',kind:'charging',zh:'虹桥火车站P10网约车候车区充电设施',en:'Phone charging facilities at Hongqiao P10 ride-hailing waiting area',publisher:'上海市政府国际服务门户',sourceType:'official',sourceKey:'hongqiaoPickup',sourcePublishedAt:'2026-08-02',
  address:'虹桥枢纽P10停车库地下一层网约车上客、候车区域',addressEn:'Ride-hailing pickup and waiting area on B1 of Hongqiao P10 parking garage',
  summaryZh:'政府报道确认P10地下一层网约车候车区域增加手机充电设施。它是固定充电设施，不等于充电宝租借柜；插口、收费及当时可用情况请现场核实。',summary:'A government report confirms phone charging facilities in the P10 B1 ride-hailing waiting area. These are fixed facilities, not verified power-bank rental cabinets; confirm connectors, fees and availability on site.',
  stationEvidence:[facilityStation('虹桥火车站','hongqiaoPickup','政府报道将P10地下一层上客区及充电设施归于虹桥火车站出站服务。','The government report identifies P10 B1 pickup and charging facilities as part of Hongqiao Railway Station arrival services.')]
 },
 {
  id:'verified-metro-lockers',kind:'luggage',zh:'上海地铁站行李寄存柜查询',en:'Shanghai Metro station luggage-locker lookup',publisher:'上海市政府国际服务门户 / Shanghai Metro',sourceType:'official',sourceKey:'lockers',sourcePublishedAt:'2026-08-13',
  address:'具体柜位在Metro大都会按线路、站点查询',addressEn:'Find exact lockers by line and station in Metro Daduhui',
  summaryZh:'官方指南列出上海火车站、虹桥火车站、南京东路、徐家汇、豫园和迪士尼等站点的寄存服务。在Metro大都会的服务页选择寄存柜，按线路和站点查询位置、规格与余量。本站不宣称当前有空柜。',summary:'The official guide names locker services at Shanghai Railway Station, Hongqiao Railway Station, East Nanjing Road, Xujiahui, Yuyuan Garden and Disney Resort. In Metro Daduhui, choose storage cabinets under Service and look up a line and station for locations, sizes and availability. This site cannot confirm a free locker.',
  stationEvidence:['上海火车站','虹桥火车站','南京东路','徐家汇','豫园','迪士尼'].map(station=>facilityStation(station,'lockers','政府转载的地铁服务指南明确列出该站点／景区的寄存服务；柜体位置需在官方应用查询。','The official metro-service guide names this station or attraction for lockers; exact cabinets must be located in the official app.'))
 },
 {
  id:'verified-pvg-rest-charging',kind:'charging',zh:'浦东机场T1/T2过夜休息区充电设施',en:'Charging facilities in Pudong T1/T2 overnight rest areas',publisher:'上海市政府国际服务门户',sourceType:'official',sourceKey:'pvgRest',sourcePublishedAt:'2025-07-08',
  address:'浦东机场T1、T2指定过夜休息区；具体位置查机场导览',addressEn:'Designated overnight rest areas in Pudong T1 and T2; consult the airport map for exact locations',
  summaryZh:'政府服务报道介绍T1、T2过夜休息区配套充电设施。原文未给出每个插座位置；按航站楼导览寻找，勿将国际出发安检区设施当成所有旅客都可进入。',summary:'The government service report describes charging facilities in T1/T2 overnight rest areas. It does not specify every outlet. Consult terminal guidance and do not assume international-departure secure areas are accessible to all travelers.',
  stationEvidence:[facilityStation('浦东1号2号航站楼','pvgRest','政府报道明确是浦东机场T1/T2休息区的充电设施，未提供插座级坐标。','The government report identifies rest-area charging in Pudong T1/T2 without outlet-level coordinates.')]
 }
].map(row=>({...row,city:'Shanghai',url:sources[row.sourceKey],checkedAt,station:row.stationEvidence[0]?.station||null,stations:row.stationEvidence.map(e=>e.station),sourceLinks:[...new Set([row.sourceKey,...row.additionalSources||[]].map(key=>sources[key]))],liveAvailability:false}));
const records=items.map(p=>({
 id:p.replacementOf||p.id,title:p.zh+' / '+p.en,city:p.city,publisher:p.publisher,url:p.url,sourceType:p.sourceType,
 kind:p.sourceType==='official'?'official_portal':'operator_primary',recordType:['hotel','restaurant'].includes(p.kind)?'place':'service',serviceKind:p.kind,placeId:p.replacementOf||p.id,
 station:p.station,stations:p.stations,stationEvidence:p.stationEvidence,address:p.address,addressEn:p.addressEn,
 ...(p.phone?{phone:p.phone,phoneExtension:p.phoneExtension||null,phoneRole:p.phoneRole,phoneSourceUrl:p.url}:{}),
 sourceLinks:p.sourceLinks,sourcePublishedAt:p.sourcePublishedAt||null,sourceUpdatedAt:p.sourceUpdatedAt||null,replacementOf:p.replacementOf||null,
 topics:[p.zh,p.en,p.kind,...p.stations,...p.stations.map(s=>stationNames[s]?.en||s),...({hotel:['酒店','住宿','hotel','stay'],restaurant:['饭店','餐厅','吃饭','food','restaurant'],rail:['高铁','火车票','国铁','train','rail'],taxi:['出租车','打车','上车点','taxi','pickup'],charging:['手机没电','充电','充电设施','phone charging'],luggage:['行李','寄存','存包','luggage storage'],station_service:['站内导航','枢纽通','导航','indoor navigation']})[p.kind]||[]],
 summaryZh:p.summaryZh+' 地址：'+p.address+'。'+(p.phone?'公开联系电话：'+p.phone+(p.phoneExtension?' 转 '+p.phoneExtension:'')+'（'+({hotel:'酒店总机',reservations:'订房',restaurant:'餐厅', 'restaurant-extension':'餐厅分机','hotel-switchboard':'酒店总机，非餐厅直拨'})[p.phoneRole]+'）。':'')+' '+boundaryZh,
 summary:p.summary+' Location: '+p.addressEn+'. '+(p.phone?'Published contact: '+p.phone+(p.phoneExtension?' ext. '+p.phoneExtension:'')+' ('+p.phoneRole+'). ':'')+boundaryEn,
 reviewedAt:checkedAt,reviewDays:30,active:true,liveAvailability:false
}));
const places=items.filter(p=>['hotel','restaurant'].includes(p.kind)).map(p=>({...p,id:p.replacementOf||p.id,category:p.kind==='restaurant'?'food':'hotel'}));
function resolveStation(location){
 const text=String(location||'').trim().toLowerCase().replace(/’/g,"'");
 if(!text)return null;
 for(const [id,s] of Object.entries(stationNames))if([id,s.en,...s.aliases].some(v=>v.toLowerCase().replace(/’/g,"'")===text))return id;
 return null;
}
function cards(kind,location='',language='zh',pool=records){
 const zh=language==='zh',station=resolveStation(location),unknown=String(location||'').trim()&&!station&&!/^(上海|shanghai)$/i.test(String(location).trim());
 const usable=new Set(pool.filter(r=>r.active!==false&&!r.publicationHash&&r.lastCheck?.status!=='changed'&&r.reviewedAt&&Date.parse(r.reviewedAt)<=Date.now()&&Date.now()-Date.parse(r.reviewedAt)<=Number(r.reviewDays||30)*86400000).map(r=>r.id));
 return items.filter(p=>(!kind||p.kind===kind)&&(unknown?p.globalScope:station?p.stations.includes(station)||p.globalScope:true)&&usable.has(p.replacementOf||p.id)).map(p=>({
  id:p.id,kind:p.kind,title:zh?p.zh:p.en,description:(zh?p.summaryZh:p.summary)+' '+(zh?p.address:p.addressEn)+(p.phone?' · '+p.phone+(p.phoneExtension?(zh?' 转 ':' ext. ')+p.phoneExtension:''):'')+' · '+(zh?boundaryZh:boundaryEn),
  url:p.providerUrl||p.url,sourceUrl:p.url,sourceId:p.replacementOf||p.id,status:['hotel','restaurant'].includes(p.kind)?'verified-place':'official-guide',
  address:zh?p.address:p.addressEn,phone:p.phone||null,phoneExtension:p.phoneExtension||null,phoneRole:p.phoneRole||null,
  station:p.station,stations:p.stations,stationEvidence:p.stationEvidence,checkedAt,liveAvailability:false
 }));
}
return{checkedAt,sources,stationNames,items,records,places,cards,resolveStation,boundaryZh,boundaryEn};
});
