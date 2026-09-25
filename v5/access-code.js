/* Accept the private code itself, or the locally delivered credential document. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TravelAccess=factory();})(globalThis,function(){
'use strict';
function parse(input){
 if(typeof input!=='string'||input.length>12000)return null;
 const value=input.replace(/[\uFEFF\u200B-\u200D\u2060]/g,'').trim();
 const clean=v=>/^VC-(?:[a-f0-9]{5}-){3}[a-f0-9]{5}$/i.test(v)?v.toUpperCase():v;
 if(/^[A-Za-z0-9_-]{24,200}$/.test(value))return clean(value);
 try{const json=JSON.parse(value);const v=json.code||json.accessCode;if(typeof v==='string'&&/^[A-Za-z0-9_-]{24,200}$/.test(v.trim()))return clean(v.trim());}catch(_){}
 const candidates=value.split(/\r?\n/).map(x=>x.trim()).filter(x=>/^[A-Za-z0-9_-]{24,200}$/.test(x));
 return new Set(candidates).size===1?clean(candidates[0]):null;
}
function apiKey(input){return typeof input==='string'&&/(?:^|[\s"'=：:])sk-[a-z0-9_-]{8,}/i.test(input);}
return{parse,apiKey};
});
