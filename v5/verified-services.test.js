'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const V=require('./verified-services-data');
const D=require('./metro-data');
const L=require('./library'),S=require('./service-data'),Discovery=require('./discovery');

test('verified service references connect to real station graph IDs and primary-source URLs',()=>{
 const stations=new Set(D.stations.map(s=>s.id)),ids=new Set(V.records.map(r=>r.id));
 assert.equal(ids.size,V.records.length);
 const hosts=new Set(['www.marriott.com','www.hyatt.com','pullman.accor.com','www.96822.com','english.shanghai.gov.cn','www.shanghaiairport.com','www.12306.cn']);
 for(const item of V.items){
  assert.ok(ids.has(item.replacementOf||item.id));
  for(const url of item.sourceLinks){const parsed=new URL(url);assert.equal(parsed.protocol,'https:');assert.ok(hosts.has(parsed.hostname));}
  assert.ok(item.zh&&item.en&&item.address&&item.addressEn);
  for(const edge of item.stationEvidence){assert.ok(stations.has(edge.station),edge.station);assert.ok(edge.description&&edge.descriptionZh&&edge.sourceUrls.length);for(const url of edge.sourceUrls)assert.ok(item.sourceLinks.includes(url));}
  assert.equal(item.liveAvailability,false);
 }
});

test('public contacts retain role, extension and the source that publishes them',()=>{
 for(const item of V.items.filter(r=>r.phone)){
  const record=V.records.find(r=>r.id===(item.replacementOf||item.id));
  assert.match(item.phone,/^\+86 21 \d{4} \d{4}$/);
  assert.ok(['hotel','reservations','restaurant','restaurant-extension','hotel-switchboard'].includes(item.phoneRole));
  assert.ok(item.sourceLinks.includes(record.phoneSourceUrl));
  assert.ok(record.summary.includes(item.phone));
  if(item.phoneExtension){assert.equal(item.phoneRole,'restaurant-extension');assert.match(item.phoneExtension,/^\d{4}$/);assert.ok(record.summary.includes('ext. '+item.phoneExtension));}
 }
 const kitchen=V.cards('restaurant','虹桥火车站')[0];
 assert.equal(kitchen.phoneRole,'hotel-switchboard');
 assert.match(kitchen.description,/酒店总机/);
});

test('station-scoped cards never substitute a different airport or an unlisted nearby venue',()=>{
 assert.deepEqual(V.cards('hotel','Beijing South'),[]);
 assert.deepEqual(V.cards('luggage','人民广场'),[]);
 assert.ok(V.cards('luggage','Shanghai Railway Station','en').length);
 const pvg=V.cards('taxi','PVG');
 assert.ok(pvg.length);
 assert.ok(pvg.every(c=>c.id==='verified-pvg-taxi'));
 assert.ok(V.cards('hotel','虹桥火车站').every(c=>c.stations.includes('虹桥火车站')));
 assert.ok(!V.cards('taxi','虹桥火车站').some(c=>c.id==='verified-hongqiao-airport-taxi'));
});

test('approved-source lifecycle filters apply to factual service cards',()=>{
 const id='verified-pullman-jingan',fresh=V.records.map(r=>({...r,reviewedAt:new Date().toISOString().slice(0,10)}));
 assert.ok(V.cards('hotel','上海站','zh',fresh).some(c=>c.id===id));
 for(const patch of [{active:false},{publicationHash:'pending-new-version'},{lastCheck:{status:'changed'}},{reviewedAt:'2000-01-01'},{reviewedAt:'2099-01-01'}]){
  const pool=fresh.map(r=>r.id===id?{...r,...patch}:r);
  assert.ok(!V.cards('hotel','上海站','zh',pool).some(c=>c.id===id));
 }
});

test('restaurants inherit only documented property associations; online guides are not physical hotels',()=>{
 const restaurants=V.places.filter(p=>p.category==='food');
 for(const row of restaurants.filter(p=>p.stationEvidence.some(e=>e.basis==='inside-verified-property'))){
  assert.ok(row.additionalSources.length);
  for(const edge of row.stationEvidence)assert.ok(edge.sourceUrls.length>=2);
 }
 assert.ok(!V.places.some(p=>p.id==='verified-rail-12306'));
 assert.ok(!V.items.some(p=>p.distanceMeters||p.walkMinutes||p.latitude||p.longitude||p.availableRooms||p.availableTickets));
 const charging=V.cards('charging','虹桥火车站')[0];
 assert.match(charging.description,/固定充电设施/);
 assert.match(charging.description,/不等于充电宝/);
});

test('shared library merges news and place data with canonical legacy hotel citations',()=>{
 assert.equal(new Set(L.records.map(r=>r.id)).size,L.records.length);
 assert.equal(L.records.filter(r=>r.url===V.sources.marquis).length,1);
 assert.equal(L.get('verified-marriott-city-centre').id,'sh-marriott-city-centre');
 assert.deepEqual(L.ids(['verified-marriott-city-centre','sh-marriott-city-centre']),['sh-marriott-city-centre']);
 assert.ok(L.choose({text:'tengopay是什么'},'Shanghai').some(r=>r.id==='news-tenpaygo-20260924'));
 assert.ok(L.search('Nihao China','Shanghai','news').some(r=>r.id==='news-nihao-china-shanghai-20260817'));
 assert.ok(!L.search('GO BEIJING','Shanghai','news').some(r=>r.city==='Beijing'));
});

test('service cards use actual station associations and current source lifecycle instead of the old citywide example',()=>{
 assert.deepEqual(S.cards('hotel','浦东机场').map(r=>r.id),['verified-dazhong-airport']);
 assert.ok(!S.cards('hotel','虹桥火车站').some(r=>r.sourceId==='sh-marriott-city-centre'));
 assert.deepEqual(S.cards('restaurant','Uncovered Station'),[]);
 assert.ok(S.cards('rail','杭州').some(r=>r.id==='verified-rail-12306'));
 const held=L.records.map(r=>r.recordType==='place'?{...r,active:false}:r);
 assert.deepEqual(S.cards('hotel','上海站','zh',held),[]);
 assert.deepEqual(S.cards('restaurant','上海站','zh',held),[]);
 assert.deepEqual(Discovery.nearby('上海站',null,30,held),[]);
 const fresh=L.records.map(r=>r.recordType==='place'?{...r,reviewedAt:'2000-01-01'}:r);
 assert.deepEqual(Discovery.nearby('人民广场',null,30,fresh),[]);
});

test('answer service UI adds addresses, public phone links, official and map actions to tool turns',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const h={text:'上海站附近有什么餐厅',language:'zh',assistance:{mode:'deepseek-tool',intent:{kind:'restaurant',destination:'上海火车站',city:'Shanghai'}}};
 const state={language:'zh',facts:{city:'Shanghai'},history:[h]},context={window:{},document:{getElementById:()=>null},URL,TravelLibrary:L,TravelServices:S,TravelDiscovery:Discovery,TravelApp:{getState:()=>state}};
 vm.runInNewContext(fs.readFileSync(require.resolve('./service-ui'),'utf8'),context);
 const ui=context.window.TravelServiceUI,html=ui.answerHTML(h);
 assert.match(html,/MoMo Café/);assert.match(html,/恒丰路338号/);assert.match(html,/tel:\+862122153888;ext=6710/);assert.match(html,/uri\.amap\.com/);assert.match(html,/marriott\.com/);
 h.assistance.intent={kind:'restaurant',destination:'虹桥火车站',city:'Shanghai'};h.language='en';
 assert.match(ui.answerHTML(h),/Hotel switchboard/);
 h.assistance.intent={kind:'hotel',destination:'Beijing South',city:'Beijing'};
 assert.equal(ui.answerRows(h).length,0);
 h.assistance.intent={kind:'hotel',destination:'Uncovered Station',city:'Shanghai'};
 assert.equal(ui.answerRows(h).length,0);
});

test('free-mode service rendering uses the same actual records without inventing an assistance turn',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const h={text:'上海站附近有什么酒店',language:'zh',context:{city:'Shanghai'}},state={language:'zh',facts:{city:'Shanghai'},history:[h]};
 const context={window:{},document:{getElementById:()=>null},URL,TravelLibrary:L,TravelServices:S,TravelDiscovery:Discovery,TravelApp:{getState:()=>state}};
 vm.runInNewContext(fs.readFileSync(require.resolve('./service-ui'),'utf8'),context);
 const ui=context.window.TravelServiceUI;
 assert.ok(ui.hasVerified(h));assert.ok(ui.answerRows(h).some(r=>r.id==='verified-pullman-jingan'));assert.match(ui.answerHTML(h),/梅园路330号/);assert.equal(h.assistance,undefined);
 h.text='人民广场附近有什么餐厅';assert.ok(ui.answerRows(h).some(r=>r.id==='verified-man-bao-lou'));
 h.text='上海到杭州的高铁怎么买票';assert.ok(ui.answerRows(h).some(r=>r.id==='verified-rail-12306'));assert.ok(ui.hasVerified(h));
 h.text='浦东机场到上海火车站坐地铁';assert.equal(ui.answerRows(h).length,0);assert.equal(ui.hasVerified(h),false);
 h.text='基隆路附近有什么酒店';assert.equal(ui.answerRows(h).length,0);
 h.text='未收录地点附近有什么酒店';assert.equal(ui.answerRows(h).length,0);
 h.text='Beijing hotels';h.context.city='Beijing';assert.equal(ui.answerRows(h).length,0);
 assert.equal(h.assistance,undefined);
});

test('a named property selects its own current contact card instead of other hotels at that station',()=>{
 const selected=S.cards('hotel','上海雅居乐万豪侯爵酒店','zh',L.records);
 assert.deepEqual(selected.map(r=>r.sourceId),['sh-marriott-city-centre']);
 assert.ok(!selected.some(r=>r.sourceId==='verified-jw-tomorrow-square'));
});

test('deep-copied browser state resolves old service follow-ups by answer ID then numeric revision without future stations',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const history=[
  {revision:1,answerId:'route-to-shanghai',text:'从浦东机场到上海站坐地铁'},
  {revision:2,answerId:'hotel-at-shanghai',text:'附近有什么酒店'},
  {revision:3,answerId:'route-to-square',text:'从上海站到人民广场坐地铁'},
  {revision:4,answerId:'hotel-at-square',text:'附近有什么酒店'}
 ].map(h=>({...h,language:'zh',context:{city:'Shanghai'}}));
 const state={language:'zh',facts:{city:'Shanghai'},history},context={window:{},document:{getElementById:()=>null},URL,TravelLibrary:L,TravelServices:S,TravelDiscovery:Discovery,TravelApp:{getState:()=>JSON.parse(JSON.stringify(state))}};
 vm.runInNewContext(fs.readFileSync(require.resolve('./service-ui'),'utf8'),context);
 const ui=context.window.TravelServiceUI,sourceIds=h=>ui.answerRows(h).map(r=>r.sourceId);
 const oldTurn=JSON.parse(JSON.stringify(history[1]));
 assert.ok(sourceIds(oldTurn).includes('verified-pullman-jingan'));
 assert.ok(!sourceIds(oldTurn).includes('sh-marriott-city-centre'));
 assert.ok(sourceIds(history[3]).includes('sh-marriott-city-centre'));
 assert.ok(!sourceIds(history[3]).includes('verified-pullman-jingan'));
 // A stable answer ID wins over a conflicting revision; a legacy numeric revision still works.
 assert.ok(sourceIds({...oldTurn,revision:4}).includes('verified-pullman-jingan'));
 delete oldTurn.answerId;
 assert.ok(sourceIds(oldTurn).includes('verified-pullman-jingan'));
 assert.equal(sourceIds({...oldTurn,revision:'2'}).length,0);
 assert.equal(history[1].assistance,undefined);
});
