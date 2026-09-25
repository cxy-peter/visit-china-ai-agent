/* Explicit choices only; tab-session memory, not facts or confirmed bookings. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory;else root.TravelServiceChoices=factory(()=>root.sessionStorage);})(globalThis,function(storage){
'use strict';const key='vc-service-choices-v66';let rows={};try{const saved=JSON.parse(storage()?.getItem(key)||'{}');for(const [id,row] of Object.entries(saved)){if(/^[\w:.-]{1,160}$/.test(id)&&row&&Date.now()-row.at<14400000)rows[id]=row;}}catch(_){}
function get(id){return JSON.parse(JSON.stringify(rows[id]||{dismissed:[],saved:[],rail:{}}));}
function put(id,patch){if(typeof id!=='string'||!/^[\w:.-]{1,160}$/.test(id))throw Error('CHOICE_KEY');const before=get(id),next={...before};for(const k of ['saved','dismissed'])if(patch[k])next[k]=[...new Set(patch[k])].filter(x=>['rail','flight','hotel','car','transfer','tour','food','all'].includes(x)).slice(0,8);if(patch.rail){const v=patch.rail;next.rail={seat:v.seat==='first'?'first':'second',sort:v.sort==='departure'?'departure':'price',period:['morning','afternoon','evening'].includes(v.period)?v.period:'all',after:/^([01]\d|2[0-3]):[0-5]\d$/.test(v.after||'')?v.after:'',before:/^([01]\d|2[0-3]):[0-5]\d$/.test(v.before||'')?v.before:''};}next.at=Date.now();rows[id]=next;rows=Object.fromEntries(Object.entries(rows).sort((a,b)=>b[1].at-a[1].at).slice(0,100));try{storage()?.setItem(key,JSON.stringify(rows));}catch(_){}return get(id);}
function clear(){rows={};try{storage()?.removeItem(key);}catch(_){}}
return{get,put,clear};
});
