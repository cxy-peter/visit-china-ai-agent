/* Operator objectives produce bounded candidates, never active policy changes. */
(function(r,f){if(typeof module==='object'&&module.exports)module.exports=factory();else r.TravelSkillPresets=factory();function factory(){return f();}})(globalThis,function(){'use strict';
const list=[{id:'coverage',name:'减少相关资料漏召回',note:'只将 top-k 增加 2（上限12）；先比较是否改善，不默认有效。'},
{id:'precision',name:'减少弱相关片段',note:'提高最低词项覆盖要求；可能漏召回，必须查看回归。'},
{id:'concise',name:'先结论，再行动',note:'添加有限表达要求；检索检查不证明表达变好，需人工回放。'}];
function apply(id,c){if(!list.some(p=>p.id===id))throw Error('SKILL_PRESET');const out={...c};if(id==='coverage')out.topK=Math.min(12,c.topK+2);if(id==='precision')out.minCoverage=Math.min(.4,Math.round((c.minCoverage+.02)*100)/100);if(id==='concise')out.guidance=(c.guidance+' 先用一句话回答当前问题，再列行动步骤和必要条件；保留全部关键限制。').slice(0,500);return out;}
return{list,apply};});
