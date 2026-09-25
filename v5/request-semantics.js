/* Presentation guardrails, shared with free-mode tools. The model remains the router. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TravelRequest=factory();})(globalThis,function(){
'use strict';
function withoutLocations(text){return String(text||'').replace(/(?:上海虹桥|上海|虹桥|杭州东|杭州|北京南|北京|南京南|苏州北)?(?:火车站|高铁站|铁路车站)|(?:Shanghai\s+Hongqiao|Shanghai|Hongqiao|Hangzhou\s+East|Hangzhou)?\s*(?:railway|train|high.speed\s+rail)\s+station/gi,' [station] ');}
function railRequested(text){const t=withoutLocations(text);if(/(?:不坐|不买|不要|不需要).{0,4}(?:高铁|火车|车票)|(?:no|not|don't|do not)\s+(?:need\s+|want\s+)?(?:a\s+)?(?:train|rail)\s*(?:ticket|trip)/i.test(t)&&!/(?:但是|另外|但要|instead).{0,15}(?:高铁|火车票|train)/i.test(t))return false;return /高铁|动车|火车票|坐火车|乘火车|铁路购票|\btrains?\b|\brail(?:way)?\s+(?:ticket|travel|trip)|high.speed/i.test(t)||/\[station\].{0,12}(?:怎么|如何|how).{0,12}(?:去|到|杭州|北京|南京|苏州|hangzhou|beijing|nanjing|suzhou)/i.test(t);}
function serviceOnly(text){const t=String(text||'');const kinds=[['charging',/充电|移动电源|power.?bank|charg(?:e|ing).{0,15}(?:phone|battery)|phone.{0,15}charg/i],['luggage',/寄存|存包|luggage\s+storage|store.{0,15}bag/i],['hotel',/酒店|住宿|\bhotel\b|accommodation/i],['restaurant',/餐厅|吃饭|吃的|restaurant|where to eat/i]];return kinds.find(([,r])=>r.test(t))?.[0]||null;}
function supportQuestion(text){return /(?:支持|可以|能否|能用|能不能|可不可以|允许|银行卡|信用卡|刷卡|AMEX|JCB|Visa|Mastercard|American Express|allowed|accept|eligible|can I use|can I pay|payment)/i.test(text)&&!/(?:比较|对比|哪班|几点出发|compare|departure time)/i.test(text);}
function arrivalGuide(text){return /机场|airport|\bPVG\b|\bSHA\b/i.test(text)&&/落地|降落|抵达|刚到|landing|landed|arrived|注意|need to know|what should|怎么走|how (?:do|can) I get/i.test(text)&&!/地铁|换乘图|路线图|\bmetro\b|\bsubway\b|route map/i.test(text);}
function eventQuery(text){return /嘉年华|光影节|设计之都|\bfestival\b|\bexhibition\b|\bcarnival\b/i.test(text)||/(?:最近|近期|这周|本周|今天|明天).{0,35}活动|(?:upcoming|recent|current|this week).{0,35}(?:events|activities)/i.test(text);}
function responseMode(text,intent={}){if(arrivalGuide(text)||eventQuery(text))return 'guide';if(intent.responseMode)return intent.responseMode;if(supportQuestion(text))return 'service';if(['metro','taxi'].includes(intent.kind))return 'route';if(intent.kind==='rail')return 'compare';return 'general';}
function showRoute(text,intent){return responseMode(text,intent)!=='guide';}
return{withoutLocations,railRequested,serviceOnly,supportQuestion,arrivalGuide,eventQuery,responseMode,showRoute};
});
