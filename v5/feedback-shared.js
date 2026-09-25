(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TravelFeedback=factory();})(globalThis,function(){
'use strict';
const labels={intent_error:'意图理解错误',fact_error:'事实错误',stale_info:'资料过期',wrong_route:'路线问题',missing_detail:'信息不完整',process_issue:'流程问题',language_issue:'语言问题',connection_issue:'连接问题',other:'其他问题'};
function classify(text){const t=String(text||'');for(const [kind,pattern] of [
 ['connection_issue',/连不上|连接|掉线|断线|体验码|access.?code|api.?key|登录|超时|网络错误|connect|login|timeout|network error/i],
 ['language_issue',/英文|中文|语言|翻译|language|translation|English|Chinese/i],
 ['stale_info',/过期|过时|旧消息|旧信息|更新|最新|已停用|outdated|stale|expired|out.of.date|no longer/i],
 ['wrong_route',/路线|换乘|方向|走错|绕路|站名|wrong route|transfer|wrong station|detour|direction/i],
 ['intent_error',/理解|识别|答非所问|没问|不是.*而是|串场|意图|误判|misunderstand|misunderstood|intent|not what|wrong question|irrelevant/i],
 ['fact_error',/事实|价格.*错|费用.*错|电话.*错|地址.*错|瞎编|编造|不真实|不存在|错误信息|fake|fabricat|incorrect|inaccurate|wrong (?:price|fare|phone|address|fact)|factual/i],
 ['process_issue',/流程|步骤|下一步|重复问|反复问|卡住|按钮|不能点击|跳转|顺序|重复确认|step|workflow|process|stuck|button|repeat|loop|navigate/i],
 ['missing_detail',/缺少|不完整|不详细|没说|漏了|遗漏|没给|未提供|补充|missing|incomplete|not enough|more detail|omitted/i]])if(pattern.test(t))return kind;return 'other';}
function redact(value,max=2000){return String(value||'').replace(/sk-[A-Za-z0-9_-]{8,}/g,'[已隐藏 API Key]').replace(/VC-(?:[a-f0-9]{5}-){3}[a-f0-9]{5}/gi,'[已隐藏体验码]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[已隐藏邮箱]').replace(/\b1[3-9]\d{9}\b/g,'[已隐藏手机号]').replace(/\b\d{13,19}\b/g,'[已隐藏长号码]').replace(/((?:password|密码|验证码|otp|passport|护照号)\s*[:：=]?\s*)[A-Za-z0-9_-]{4,}/gi,'$1[已隐藏]').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').slice(0,max);}
function snapshot(state,revision){const history=Array.isArray(state.history)?state.history:[],index=history.findIndex(h=>h.revision===revision),selected=history.slice(Math.max(0,index-7),index+1);return selected.map(h=>({revision:h.revision,question:redact(h.text,600),answer:redact(h.assistance?.text||h.reply,1400),language:h.language==='en'?'en':'zh',kind:h.assistance?.intent?.kind||'other',sourceIds:(h.assistance?.sourceIds||[]).filter(x=>typeof x==='string').slice(0,8),executionId:typeof h.assistance?.executionId==='string'?h.assistance.executionId:null}));}
return{labels,classify,redact,snapshot};
});
