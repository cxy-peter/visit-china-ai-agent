'use strict';
// A transparent acceptance rubric, not a calibrated probability or an LLM judge.
const Request=require('./request-semantics');
function score(answer,intent,request){
 const text=answer?.text||'',checks={evidence:!!answer?.sourceIds?.length,direct:text.length>=20&&!/还有哪一项具体需求|请补充.*(?:起点和终点|出发地和目的地)|what else would you like/i.test(text),endpoints:![intent.origin,intent.destination].filter(Boolean).some(p=>!text.toLowerCase().includes(p.toLowerCase())),actionable:/乘|到|查|核对|跟随|指|选择|步行|carry|follow|check|take|walk|select/i.test(text),format:text.length<=1800};
 // Route tools know precise station topology; free generation gets no topology bonus.
 const weights={evidence:35,direct:25,endpoints:intent.origin&&intent.destination?20:0,actionable:15,format:5};if(!weights.endpoints)weights.direct+=20;
 const value=Object.entries(weights).reduce((n,[k,w])=>n+(checks[k]?w:0),0);
 return{score:value,checks};
}
function decide(local,generated,intent,request){
 const a=score(local,intent,request),b=score(generated,intent,request),mode=Request.responseMode(request,intent);
 let selected=generated?'deepseek':'tool';if(local&&generated){if(mode==='guide')selected=b.score>=60?'deepseek':'tool';else if(['route','compare'].includes(mode))selected=b.score>a.score+15?'combined':'tool';else selected=b.score>a.score+10?'deepseek':a.score>b.score+10?'tool':'combined';}
 return{version:'rubric-6.4',selected,local:local?a:null,deepseek:generated?b:null,threshold:60,scope:'可追溯规则评分：引用35、直接回答25、端点20、行动15、格式5；无端点要求时直接回答45。不是准确率，不检查私人思考链。',reason:mode==='guide'?'当前需求是到达说明，优先通过证据检查的完整说明；不强制展示路线图。':['route','compare'].includes(mode)?'确定性路线与历史价格保留结构化工具；通过校验的文字可补充说明。':'按已核对证据、直接回答和请求完整性选择。'};
}
function apply(local,generated,decision){
 if(decision.selected==='tool'||!generated)return{text:local.text,sourceIds:local.sourceIds};
 if(decision.selected==='combined'){
  const ids=[...new Set([...local.sourceIds,...generated.sourceIds])],text=generated.text+'\n\n'+local.text;
  if(ids.length<=3&&text.length<=1800)return{text,sourceIds:ids};
  decision.selected=decision.deepseek.score>decision.local.score?'deepseek':'tool';decision.reason+=' 合并超出引用或字数上限，采用分数较高的一份。';
  if(decision.selected==='tool')return{text:local.text,sourceIds:local.sourceIds};
 }
 return{text:generated.text,sourceIds:generated.sourceIds};
}
module.exports={score,decide,apply};
