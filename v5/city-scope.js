/* Five destinations share a schema, not a promise of equal inventory or route coverage. */
(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f();else r.TravelCities=f();})(globalThis,function(){
'use strict';
const profiles=[
 {id:'Shanghai',zh:'上海',jurisdiction:'mainland',currency:'CNY',aliases:['上海','上海市','shanghai'],airports:['PVG','SHA'],coverage:'source-guides-and-static-metro'},
 {id:'Beijing',zh:'北京',jurisdiction:'mainland',currency:'CNY',aliases:['北京','北京市','beijing','peking'],airports:['PEK','PKX'],coverage:'source-guides'},
 {id:'Guangzhou',zh:'广州',jurisdiction:'mainland',currency:'CNY',aliases:['广州','廣州','广州市','廣州市','guangzhou','canton'],airports:['CAN'],coverage:'arrival-starter-guides'},
 {id:'Shenzhen',zh:'深圳',jurisdiction:'mainland',currency:'CNY',aliases:['深圳','深圳市','shenzhen'],airports:['SZX'],coverage:'arrival-starter-guides'},
 {id:'Hong Kong',zh:'香港',jurisdiction:'hong-kong',currency:'HKD',aliases:['香港','香港特别行政区','香港特別行政區','hong kong','hongkong','hk'],airports:['HKG'],coverage:'operator-starter-guides'}
];
function canonical(value){if(!value)return null;const raw=String(value).trim(),s=raw.toLowerCase().replace(/\s+(?:city|municipality)$/,'').replace(/[,，]\s*(china|中国)$/,'');if(/^(unknown|未知|不确定|null)$/.test(s))return null;if(/^(中国|中华人民共和国|china|prc|mainland china)$/.test(s))return 'China';return profiles.find(p=>p.aliases.includes(s))?.id||raw;}
function mentioned(text){const s=String(text).toLowerCase(),found=[];for(const p of profiles)if(p.aliases.some(a=>/^[a-z ]+$/.test(a)?new RegExp('\\b'+a+'\\b','i').test(s):s.includes(a)))found.push(p.id);return found;}
function detect(text){const s=String(text),dest=s.match(/(?:going to|heading to|visit|to|飞往|去|到)\s*(shanghai|beijing|guangzhou|shenzhen|hong\s*kong|上海|北京|广州|廣州|深圳|香港)/i);if(dest)return canonical(dest[1]);const list=mentioned(s);if(list.length===1)return list[0];for(const p of profiles)if(p.airports.some(a=>a!=='CAN'&&new RegExp('\\b'+a+'\\b','i').test(s)))return p.id;return null;}
function applies(record,city){const c=canonical(city);if(!c)return true;const rc=canonical(record.city),targets=record.appliesTo;if(Array.isArray(targets)&&targets.length)return targets.map(canonical).includes(c);if(rc===c)return true;
 // A generic Mainland/China tag does not establish applicability in Hong Kong.
 if(c==='Hong Kong')return record.jurisdiction==='global'||record.jurisdiction==='hong-kong';
 if(record.jurisdiction==='hong-kong'||rc==='Hong Kong')return false;
 if(rc==='China'||!rc)return profiles.some(p=>p.id===c&&p.jurisdiction==='mainland')||c==='China'||record.jurisdiction==='global';return false;}
return{profiles,canonical,mentioned,detect,applies,known:c=>profiles.some(p=>p.id===canonical(c))};
});
