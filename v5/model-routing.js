'use strict';
const MODES=['auto','flash','pro'];
// Routing is request-scoped: concurrent visitors never mutate the shared client.
function select(state,mode='auto'){
 if(!MODES.includes(mode))throw Error('MODEL_MODE_INVALID');
 const text=state.history?.at(-1)?.text||'',reasons=[];
 if(/路线|行程|主题|历史|二战|抗战|长宁|itinerary|themed|history|world war/i.test(text))reasons.push('多地点或主题行程');
 if(/比较|对比|区别|但是|不是|纠正|之前.{0,12}(?:错误|不对)|compare|difference|actually|correction/i.test(text))reasons.push('比较、条件或纠正');
 if(/JCB|银行卡|免密|visa|eligib|签证|入境|政策/i.test(text))reasons.push('需要区分适用条件');
 if(text.length>240)reasons.push('较长的复合需求');
 const selected=mode==='auto'?(reasons.length?'pro':'flash'):mode;
 return{requested:mode,selected,model:selected==='pro'?'deepseek-v4-pro':'deepseek-flash',thinking:selected==='pro',effort:selected==='pro'?'low':'none',reason:mode==='auto'?(reasons.join('；')||'单一查询，优先快速响应'):'由你手动选择',method:mode==='auto'?'bounded-complexity-rules':'manual'};
}
function scoped(model,route){return{status:()=>({...model.status(),model:route.model}),call:(system,payload,signal,options={})=>model.call(system,payload,signal,{...options,model:route.model,thinking:route.thinking,reasoningEffort:route.effort,maxTokens:route.thinking?6000:1800,timeoutMs:route.thinking?75000:35000})};}
module.exports={MODES,select,scoped};
