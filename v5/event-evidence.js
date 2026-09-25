'use strict';
// Restrictive date admission: a page publication date is never the event date.
function verify(e,body,now=Date.now()){
 if(!e||typeof e.dateQuote!=='string'||!body.includes(e.dateQuote)||e.dateQuote.length<8||e.dateQuote.length>500||typeof e.location!=='string'||e.location.length<3||e.location.length>180||!body.includes(e.location))return null;
 const dates=[e.startDate,e.endDate];if(dates.some(d=>!/^20\d\d-\d\d-\d\d$/.test(d||'')||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d))return null;
 if(Date.parse(e.endDate)<Date.parse(e.startDate)||Date.parse(e.endDate)-Date.parse(e.startDate)>90*86400000||Date.parse(e.endDate)+16*3600000<=now)return null;
 const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
 for(const d of dates){const [year,month,day]=d.split('-').map(Number),q=e.dateQuote.toLowerCase();if(!q.includes(String(year))||!new RegExp('(^|[^0-9])0?'+day+'([^0-9]|$)').test(q)||!(q.includes(months[month-1])||q.includes(month+'月')||q.includes(d)))return null;}
 return{startDate:e.startDate,endDate:e.endDate,locationZh:e.location,locationEn:e.location,dateEvidence:e.dateQuote};
}
module.exports={verify};
