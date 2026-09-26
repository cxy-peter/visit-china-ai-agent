'use strict';
// Explicit pre-planning needs collection is not a destination-policy answer.
// Model wording may select approved question topics, never establish facts.
const catalog = [
 {id:'dates', match:/dates?|duration|how long|length of (?:the |your )?(?:trip|stay)|日期|哪天|几天|天数|时长/i, zh:'计划什么时候来、停留多久？', en:'When would you like to travel, and how long would you stay?'},
 {id:'budget', match:/budget|spend|预算|花费预期/i, zh:'住宿和日常活动大概希望控制在什么预算？', en:'What budget would you be comfortable with for accommodation and daily activities?'},
 {id:'pace', match:/pace|relaxed|walking|rest|mobility|节奏|步行|休息|行动/i, zh:'希望每天的步行和活动强度如何，是否需要多安排休息？', en:'What walking and activity pace would suit you, and would you like extra rest time?'},
 {id:'interests', match:/interests?|food|architecture|museum|喜欢|兴趣|美食|建筑|博物馆/i, zh:'更想看哪些类型的地方，或者有什么特别想体验的？', en:'What kinds of places or experiences interest you most?'},
 {id:'accommodation', match:/hotel|accommodation|stay near|住哪里|酒店|住宿/i, zh:'住宿已经确定了吗，还是需要先比较区域？', en:'Have you chosen accommodation, or would you like to compare areas first?'},
 {id:'arrival', match:/flight|arrival|airport|train|ticket|航班|机场|到达|车票/i, zh:'来程交通是否已确定？确定后可以再衔接到店交通。', en:'Have you arranged your journey to the city? We can then connect it with your arrival transfer.'},
 {id:'party', match:/party|parents|children|companion|同行|父母|孩子/i, zh:'这次与谁同行，有没有需要一起考虑的安排？', en:'Who will be travelling with you, and are there shared needs to consider?'},
 {id:'special', match:/accessib|diet|special|request|无障碍|饮食|特别|其他需求/i, zh:'有没有饮食、无障碍或其他特别需求？', en:'Do you have any dietary, accessibility or other specific preferences?'}
];
function requested(text) {
 if(typeof text!=='string'||text.length>2000)return false;
 const q=text.replace(/\b(?:do not|don't|never)\s+(?:invent|guess|make up)\s+(?:(?:bookings|prices|opening hours|fees|reservations)(?:\s*,?\s*(?:or|and)?\s*)?)+[.]?/gi,'')
  .replace(/不要(?:编造|虚构|猜测)(?:预订|价格|开放时间|营业时间|票价|收费|[、，或和及与\s])+[。]?/g,'');
 const explicit=/\b(?:ask|clarify|confirm)\b.{0,100}\b(?:needs?|preferences?|first|before)\b|\b(?:needs?|preferences?)\b.{0,100}\b(?:clarify|ask|confirm)\b|先.{0,50}(?:问我|问我们|了解|澄清|确认).{0,40}(?:需求|偏好|问题)|先(?:问我|问我们)(?:一些|几个)?问题|(?:哪些|什么).{0,35}(?:需求|偏好).{0,35}(?:确认|了解|澄清)/i.test(q);
 if(!explicit)return false;
 // A request for factual service instructions must continue through grounded answering.
 return !/visa|passport|eligib|policy|exchange rate|opening hours|timetable|ticket|book (?:a |the )?(?:hotel|flight)|how much|how (?:do|can|to) (?:i |we )?(?:buy|pay|take|get)|签证|护照|政策|手续费|票价|汇率|购票|车票|怎么买|怎么坐|如何支付|营业时间|开放时间|酒店预订|几点开|几号口/i.test(q);
}
function build(text, modelValue, state) {
 if(!requested(text)||(Array.isArray(modelValue?.tasks)&&modelValue.tasks.length>1))return null;
 const facts=state.facts||{},language=state.language==='zh'?'zh':'en';
 const available=catalog.filter(q=>!(q.id==='party'&&facts.party)&&!(q.id==='interests'&&facts.interests)&&!(q.id==='accommodation'&&facts.hotel==='booked')&&!(q.id==='arrival'&&facts.flight==='booked'));
 const proposed=String(modelValue?.text||'');
 const chosen=available.filter(q=>q.match.test(proposed));
 for(const q of available)if(chosen.length<3&&!chosen.includes(q))chosen.push(q);
 const questions=chosen.slice(0,3).map(q=>({id:q.id,text:q[language]}));
 const intro=language==='zh'?'可以，先明确你的需求，再安排具体行程。你可以一次回答，也可以边聊边补充：':'We can clarify your needs before planning the itinerary. You can answer together or add details as we chat:';
 return {mode:'deepseek-clarification',notice:'conversation-only',text:intro+'\n\n'+questions.map(q=>q.text).join('\n'),sourceIds:[],questions,
  scope:'Model-selected question topics rendered from a bounded question catalog. No destination fact, price, eligibility, booking or source claim.'};
}
module.exports={requested,build,catalog};
