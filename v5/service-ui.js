(function(){'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const webUrl=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch(_){return null;}};
let kind='luggage',location='',contextKey='',last='';
function usable(row){const source=TravelLibrary.get(row.sourceId);return source&&TravelLibrary.current(source)&&!source.publicationHash;}
function cards(rows,zh){return rows.filter(usable).map(r=>{
 const item=TravelServices.verified.items.find(p=>p.id===r.id||(p.replacementOf||p.id)===r.sourceId);
 const description=item?(zh?item.summaryZh:item.summary):r.description;
 const address=r.address||(item?(zh?item.address:item.addressEn):''),phone=r.phone||item?.phone,extension=r.phoneExtension||item?.phoneExtension;
 const role=r.phoneRole||item?.phoneRole,label=({hotel:zh?'酒店电话':'Hotel contact',reservations:zh?'订房电话':'Reservations',restaurant:zh?'餐厅电话':'Restaurant contact','restaurant-extension':zh?'餐厅分机':'Restaurant extension','hotel-switchboard':zh?'酒店总机':'Hotel switchboard'})[role]||(zh?'公开电话':'Published contact');
 const url=webUrl(r.url),sourceUrl=webUrl(r.sourceUrl||TravelLibrary.get(r.sourceId)?.url),map=item&&!item.globalScope?'https://uri.amap.com/search?keyword='+encodeURIComponent('上海 '+item.zh+' '+item.address)+'&city=310000&view=map':null;
 const phoneLink=phone&&/^\+?[\d\s-]+$/.test(phone)?'tel:'+phone.replace(/[^+\d]/g,'')+(extension&&/^\d+$/.test(extension)?';ext='+extension:''):null;
 const status=({'provider-search':zh?'平台查询':'Provider search','verified-place':zh?'已核对地点':'Verified place','official-guide':zh?'官方指引':'Official guide'})[r.status]||(zh?'服务资料':'Service reference');
 return '<article class="service-card" data-metric-kind="'+esc(r.kind)+'" data-metric-item="'+esc(r.id)+'"><small>'+status+'</small><strong>'+esc(r.title)+'</strong><p>'+esc(description)+'</p>'+(address?'<p class="place-address">'+esc(address)+'</p>':'')+(phoneLink?'<p class="place-contact">'+label+'：<a href="'+esc(phoneLink)+'">'+esc(phone)+(extension?esc((zh?' 转 ':' ext. ')+extension):'')+'</a></p>':'')+'<div class="place-actions">'+(url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" data-product-kind="'+esc(r.kind)+'" data-product-item="'+esc(r.id)+'">'+(zh?(r.status==='verified-place'?'官方页面 ↗':'打开查询 ↗'):(r.status==='verified-place'?'Official page ↗':'Open provider ↗'))+'</a>':'')+(map?'<a href="'+esc(map)+'" target="_blank" rel="noopener noreferrer" data-product-kind="'+esc(r.kind)+'" data-product-item="'+esc(r.id)+'">'+(zh?'查看地图 ↗':'Map ↗')+'</a>':'')+(sourceUrl&&sourceUrl!==url?'<a href="'+esc(sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+(zh?'资料来源 ↗':'Source ↗')+'</a>':'')+'</div></article>';
 }).join('');}
function render(){
 const root=document.getElementById('service-explorer');if(!root)return;
 const s=TravelApp.getState(),zh=s.language==='zh',c=TravelDiscovery.context(s),next=c.destination||'';
 if(next!==contextKey){contextKey=next;location=next;}
 const key=JSON.stringify([kind,location,zh,TravelServices.records.map(r=>{const row=TravelLibrary.get(r.id);return[row?.id,row?.active,row?.reviewedAt,row?.publicationHash,row?.lastCheck?.status,TravelLibrary.current(row||{active:false})];})]);
 if(last===key)return;last=key;
 const rows=TravelServices.cards(kind,location,zh?'zh':'en',TravelLibrary.records);
 root.innerHTML='<span class="eyebrow">NEAR YOUR NEXT STOP</span><h2>'+(zh?'找附近服务':'Find nearby services')+'</h2><label>'+(zh?'地点或地铁站':'Place or metro station')+'<input id="service-location" maxlength="100" value="'+esc(location)+'" placeholder="'+(zh?'例如：上海火车站、人民广场':'e.g. Shanghai Railway Station')+'"></label><div class="service-tabs">'+Object.entries(TravelServices.categories).map(([id,labels])=>'<button data-service-kind="'+id+'" aria-pressed="'+(id===kind)+'">'+labels[zh?0:1]+'</button>').join('')+'</div><div id="service-cards">'+(cards(rows,zh)||'<p class="empty">'+(zh?'这个地点暂没有已核对的此类记录，请换一个站点或补充来源。':'No reviewed records of this type cover this location yet. Try another station or add a source.')+'</p>')+'</div><p class="muted">'+(zh?'按你填写的地点查询。房态、余票、柜位和价格以运营方为准；电话来自公开网页，未实拨确认。':'Search by the place you enter. Check providers for rooms, tickets, lockers and prices. Contacts come from public pages and have not been test-called.')+'</p>';
 document.getElementById('service-location').onchange=e=>{location=e.target.value.trim();last='';render();};
 for(const b of root.querySelectorAll('[data-service-kind]'))b.onclick=()=>{kind=b.dataset.serviceKind;location=document.getElementById('service-location').value.trim();last='';render();window.TravelOpsClient?.observe();};
 window.TravelOpsClient?.observe();
}
function answerRows(h){
 const a=h.assistance;if(a?.mode==='ignored')return[];
 const state=TravelApp.getState();
 // getState() returns a deep copy in the browser. Identify this historical turn
 // by its stable answer ID (preferred), then its numeric revision; never use a later turn.
 let index=h.answerId?state.history.findIndex(row=>row.answerId===h.answerId):-1;
 if(index<0&&Number.isSafeInteger(h.revision))index=state.history.findIndex(row=>row.revision===h.revision);
 if(index<0)index=state.history.indexOf(h);
 const turnState={...state,history:index>=0?state.history.slice(0,index+1):[h]},context=TravelDiscovery.context(turnState),intent=a?.intent||{},key=intent.kind;
 const city=intent.city||h.context?.city||(!a?state.facts?.city:'');
 if(city&&!['Shanghai','China','Unknown'].includes(city))return[];
 if(!TravelServices.categories[key]){
  if(a?.intent)return a.services||[];
  // Free mode can show source-backed records for explicit requests. This is a
  // presentation fallback, not a fabricated model interpretation or chat turn.
  const text=h.text||'',rules=[['hotel',/酒店|住宿|\bhotel\b|accommodation/i],['restaurant',/餐厅|饭店|吃饭|美食|吃的|restaurant|where (?:can i|to) eat|dining/i],['charging',/充电|充电宝|power.?bank|phone.{0,12}charg/i],['luggage',/寄存|存包|luggage storage|store.{0,12}bag/i],['taxi',/出租车|打车|车费|\btaxi\b|\bcab\b/i],['metro_ticket',/地铁票|乘车码|metro.{0,12}(?:ticket|qr|pay)|subway.{0,12}ticket/i],['rail',/火车票|高铁|动车|国铁|train tickets?|rail tickets?|high.speed|坐火车|乘火车/i]];
  const kinds=rules.filter(([,rx])=>rx.test(text)).map(([k])=>k),property=TravelDiscovery.mentioned(text).find(p=>kinds.includes(p.kind));
  const anchor=property?(h.language==='en'?property.en:property.zh):context.destination||'';
  if(!anchor&&/附近|周边|nearby|near |around/i.test(text))return[];
  if(!anchor&&!/上海|shanghai|\bpvg\b/i.test(text)&&city!=='Shanghai')return[];
  return kinds.flatMap(k=>TravelServices.cards(k,anchor,h.language||state.language,TravelLibrary.records).slice(0,kinds.length>1?3:6));
 }
 const previous=context.destination;
 const anchor=key==='taxi'?(intent.origin||intent.destination||previous||''):(intent.destination||intent.origin||previous||'');
 return TravelServices.cards(key,anchor,h.language||state.language,TravelLibrary.records);
}
function visibleRows(rows,limit=6){
 const groups=new Map(),seen=new Set();
 for(const row of rows){if(!usable(row)||seen.has(row.id))continue;seen.add(row.id);if(!groups.has(row.kind))groups.set(row.kind,[]);groups.get(row.kind).push(row);}
 const queues=[...groups.values()],result=[],capacity=Math.max(limit,queues.length);
 // Give each requested service a slot before adding another option of one kind.
 // If a question covers more than six kinds, retain one per kind rather than hide one.
 while(result.length<capacity&&queues.some(group=>group.length))for(const group of queues){if(group.length)result.push(group.shift());if(result.length>=capacity)break;}
 return result;
}
function answerHTML(h){
 const a=h.assistance,zh=(h.language||TravelApp.getState().language)==='zh',rows=answerRows(h),body=cards(visibleRows(rows),zh);
 const evidence=[...new Set((a?.execution?.retrieval?.hits||[]).map(hit=>hit.sourceId))].map(id=>TravelLibrary.get(id)).filter(Boolean);
 return (window.TravelThemeUI?.html(h)||'')+(a?.modelRouting?'<small class="answer-model">'+esc(a.modelRouting.selected.toUpperCase())+' · '+esc(a.modelRouting.reason)+'</small>':'')+(body?'<div class="answer-services">'+body+'</div><p class="muted">'+(zh?'可在运营方查询当前价格和可用量；未下单或预订。':'Check providers for current prices and availability; no order or reservation has been made.')+'</p>':'')+(a?.execution?'<details class="answer-evidence"><summary>'+(zh?'这次回答查了哪些资料？':'What evidence was retrieved?')+'</summary><ul>'+evidence.map(r=>{const url=webUrl(r.url);return url?'<li><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(r.title)+' ↗</a></li>':'';}).join('')+'</ul></details>':'');
}
function hasVerified(h){return answerRows(h).some(row=>row.status!=='provider-search'&&usable(row));}
window.TravelServiceUI={render,answerHTML,answerRows,cards,hasVerified};render();
// app.js restores memory before this module loads. Redraw once after exporting;
// ordinary service renders never call refresh, so app -> service render cannot recurse.
if(TravelApp.getState().history.length)TravelApp.refresh?.();
})();
