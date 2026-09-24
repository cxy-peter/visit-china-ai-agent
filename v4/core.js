(function(root,factory){const x=factory();if(typeof module==='object')module.exports=x;else root.ArrivalCore=x;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const categories=['power','connection','cash','payment','transport','rail','hotel','destination','general'];
const patterns={power:/battery|charging|power.?bank|充电|没电|电量/i,connection:/wi.?fi|internet|connection|network|sim|e.?sim|没网|网络|流量/i,cash:/cash|currency|exchange|coins?|换汇|现金|换钱|硬币/i,payment:/alipay|we.?chat|weixin|pay|fee|wallet|支付宝|微信|支付|手续费/i,transport:/metro|subway|taxi|transfer|airport|地铁|打车|接送|机场/i,rail:/rail|train|12306|火车|高铁/i,hotel:/hotel|accommodation|酒店|住宿/i,destination:/museum|sight|visit|food|attraction|itinerary|tour|行程|博物馆|景点|旅游|美食/i};
const labels={power:['恢复电量','Restore power'],connection:['恢复网络与通信','Get connected'],cash:['找到现金与换汇服务','Cash and exchange'],payment:['核对钱包与支付手续费','Wallet setup and fees'],transport:['安排机场与市内交通','Airport and city transport'],rail:['准备火车购票与乘车','Rail tickets and boarding'],hotel:['确认酒店与抵达安排','Hotel and arrival details'],destination:['安排游览与预约','Visits and reservations'],general:['澄清当前需求','Clarify the next step']};
const stop=new Set('the and with from this that have need want help please about current some what how for you your can not'.split(' '));
function clean(s){return String(s||'').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email removed]').replace(/\b(?:\d[ -]?){13,19}\b/g,'[number removed]').replace(/(passport|护照|验证码|otp|password|密码)\s*[:：]\s*\S+/gi,'$1: [removed]').slice(0,2400);}
function isZh(s){return /[\u4e00-\u9fff]/.test(s);}
function text(v,n=240){return typeof v==='string'?v.trim().slice(0,n):'';}
function draft(messages,revision){
 const all=messages.slice(-12).map(x=>clean(x.text||x.content||x)).join('\n'),zh=isZh(all), needs=[];let city='Unknown',battery=null,network='unknown';
 for(const m of messages){const s=clean(m.text||m.content||m);if(/beijing|北京|\bpek\b|\bpkx\b/i.test(s))city='Beijing';if(/shanghai|上海|\bpvg\b|浦东|虹桥/i.test(s))city='Shanghai';const b=s.match(/(?:battery|电量|剩)[^\d]{0,12}(\d{1,3})\s*%|(\d{1,3})\s*%\s*(?:battery|电)/i);if(b)battery=Math.min(100,Number(b[1]||b[2]));if(/no (?:internet|network)|offline|没网|断网/i.test(s))network='offline';else if(/poor|weak|弱网/i.test(s))network='poor';else if(/good (?:internet|network)|网络正常|online now/i.test(s))network='online';}
 for(const c of categories){if(c!=='general'&&patterns[c].test(all))needs.push({id:'n'+(needs.length+1),category:c,text:labels[c][zh?0:1],selected:true});}
 if(!needs.length)needs.push({id:'n1',category:'general',text:zh?'请说明你现在最想完成的一件事':'What would you like to get done first?',selected:true});
 const missing=[];if(city==='Unknown')missing.push(zh?'你先到哪个城市？上海、北京，还是其他地方？':'Which city will you arrive in first: Shanghai, Beijing, or somewhere else?');if(needs.some(n=>['cash','transport'].includes(n.category)))missing.push(zh?'你在哪个机场、航站楼和区域？':'Which airport, terminal, and access zone are you in?');
 return{revision,language:zh?'zh':'en',city,battery,network,needs:needs.slice(0,7),missing:missing.slice(0,2),summary:zh?'先确认这些需求。我会按可执行性和资料来源安排下一步。':'Confirm these needs first. I will check sources and arrange practical next steps.',mode:'local-rules'};
}
function validateDraft(out,revision,fallback){
 if(!out||typeof out!=='object'||!Array.isArray(out.needs)||out.needs.length<1||out.needs.length>7)throw Error('DRAFT_SCHEMA');
 const needs=out.needs.map((n,i)=>{if(!categories.includes(n.category)||!text(n.text,160)||/https?:\/\//i.test(n.text))throw Error('DRAFT_NEED');return{id:'n'+(i+1),category:n.category,text:text(n.text,160),selected:true};});
 const city=['Shanghai','Beijing','Unknown'].includes(out.city)?out.city:fallback.city;
 return{...fallback,revision,city,needs,missing:Array.isArray(out.missing)?out.missing.filter(x=>typeof x==='string').slice(0,2).map(x=>text(x,180)):fallback.missing,summary:text(out.summary,300)||fallback.summary,mode:'deepseek-proposed'};
}
function tokenize(q){const latin=String(q).toLowerCase().match(/[a-z0-9]{2,}/g)||[];const chinese=String(q).match(/[\u4e00-\u9fff]+/g)||[];for(const s of chinese){latin.push(s);for(let i=0;i<s.length-1;i++)latin.push(s.slice(i,i+2));}return [...new Set(latin.filter(x=>!stop.has(x)))];}
function rank(query,city,records,limit=8){const tokens=tokenize(query);return records.map(r=>{const title=String(r.title||'').toLowerCase(),body=(r.topics||[]).join(' ').toLowerCase()+' '+String(r.summary||r.excerpt||'').toLowerCase();let score=0;for(const t of tokens)score+=(title.includes(t)?5:0)+(body.includes(t)?2:0);if(score&&r.city===city)score+=4;if(score&&r.kind==='operator_primary')score+=2;return{r,score};}).filter(x=>x.score>0&&(city==='Unknown'||!x.r.city||x.r.city==='China'||x.r.city===city)).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>({...x.r,rankScore:x.score}));}
function forNeed(need,d,records){const preset={power:d.city==='Beijing'?['beijing-arrival']:['pvg-arrival'],connection:d.city==='Beijing'?['beijing-arrival']:['pvg-arrival'],cash:d.city==='Beijing'?['beijing-arrival']:['pvg-arrival'],payment:['wechat-fee','alipay-app'],transport:d.city==='Beijing'?['beijing-arrival']:['sh-metro','pvg-arrival'],rail:['rail-passport'],hotel:[],destination:[],general:[]};
 let ids=preset[need.category]||[];if(d.city==='Unknown')ids=ids.filter(id=>['wechat-fee','alipay-app','rail-passport'].includes(id));
 const rows=ids.map(id=>records.find(x=>x.id===id)).filter(Boolean);if(rows.length<2)for(const r of rank(need.text+' '+need.category,d.city,records,5))if(!rows.some(x=>x.id===r.id))rows.push(r);
 return rows.slice(0,3);
}
function current(r,date=Date.now()){return r.reviewedAt&&Number.isFinite(Date.parse(r.reviewedAt))&&date-Date.parse(r.reviewedAt)<=Number(r.reviewDays||14)*86400000;}
function publicSource(r){const {body,...p}=r;return p;}
function fallbackNode(need,d,evidence){const zh=d.language==='zh';const reliable=evidence.filter(e=>e.active!==false&&e.summary&&current(e)&&e.liveStatus!=='changed_or_unmatched');
 let actions=reliable.slice(0,2).map(r=>zh?(r.summaryZh||r.summary):r.summary);
 if(!actions.length)actions=[zh?'尚没有足够且适用的已核实依据。请先打开官方原文或联系该服务机构；不要依照未经核实的营业时间、价格和位置行动。':'There is not enough checked, applicable evidence yet. Open the official source or contact the service before relying on a location, price, or opening time.'];
 const urgent=d.battery!==null&&d.battery<=5;
 if(urgent)actions=[zh?'先停止图片、语音和扫码操作，向眼前工作人员出示求助卡。手机关机后无法继续显示卡片。':'Pause image, voice and QR-code tasks. Show the help card to staff already near you before the phone shuts down.'];
 return{id:need.id,category:need.category,title:need.text,actions,source_ids:evidence.map(e=>e.id),rationale:urgent?(zh?'当前电量优先于行程规划；这是产品安全回退，不是官方电量标准。':'Power recovery takes priority. This is a product fallback, not an official battery standard.'):(zh?'先处理前置条件，再依据来源推进；不代表已经订票、预订或联系商家。':'Check prerequisites before acting. This does not book a ticket, make a reservation, or contact a merchant.'),uncertainty:zh?'服务现状、个人资格与最终收费仍需在对应服务页面或现场确认。':'Confirm availability, personal eligibility and final charges with the service.',mode:'source-summary',audit:{citation_ids_valid:true,requirement_confirmed:true,numeric_checks:'no model output',semantic_accuracy:'not independently evaluated',evidence_coverage:reliable.length? 'reviewed_summary':'evidence_gap'},evidence:evidence.map(publicSource)};
}
function validateNode(out,need,d,evidence){if(!out||!Array.isArray(out.actions)||out.actions.length<1||out.actions.length>5||!Array.isArray(out.source_ids)||!out.source_ids.length)throw Error('NODE_SCHEMA');
 const ids=new Set(evidence.filter(e=>e.active!==false&&e.body&&e.liveStatus==='fetched').map(e=>e.id));if(out.source_ids.some(id=>!ids.has(id)))throw Error('CITATION_NOT_SUPPLIED');
 const actions=out.actions.map(x=>text(x,600));if(actions.some(x=>!x))throw Error('EMPTY_ACTION');const content=actions.join(' ')+' '+text(out.rationale,300);
 if(/https?:\/\/|send.{0,25}(?:passport|otp|password|card number)|(?:上传|发送).{0,12}(?:护照|验证码|密码)|booking confirmed|已(?:出票|扣款|预订成功)/i.test(content))throw Error('UNAUTHORIZED_CLAIM');
 const used=evidence.filter(e=>out.source_ids.includes(e.id));const reference=used.map(e=>e.body+' '+e.summary).join(' ').toLowerCase();
 for(const n of content.match(/\d+(?:\.\d+)?%?/g)||[])if(!reference.includes(n.toLowerCase()))throw Error('NUMBER_NOT_IN_EVIDENCE');
 if(need.category==='payment'&&/\d|%/.test(content))throw Error('FEE_REQUIRES_FIXED_RULE');
 return{...fallbackNode(need,d,evidence),actions,source_ids:[...new Set(out.source_ids)],rationale:text(out.rationale,300),uncertainty:text(out.uncertainty,300)||'Check applicability before acting.',mode:'deepseek-grounded',audit:{citation_ids_valid:true,requirement_confirmed:true,numeric_checks:'tokens found in cited source; not semantic proof',semantic_accuracy:'not independently evaluated',evidence_coverage:'live_text',prompt_injection_boundary:'source text treated as data; human review still required'}};
}
function fee(amount){const n=Number(amount);if(!Number.isFinite(n)||n<0||n>1000000)throw Error('INVALID_AMOUNT');return{amount:Math.round(n*100)/100,baseFee:n<=200?0:Math.round((n*.03+Number.EPSILON)*100)/100,operator:'Weixin / Tenpay only',source_id:'wechat-fee',notice:'Base rule published 2026-01-15; checkout waivers and eligibility prevail. Not an Alipay quote.'};}
return{categories,patterns,labels,clean,draft,validateDraft,tokenize,rank,forNeed,current,publicSource,fallbackNode,validateNode,fee};
});
