'use strict';
const crypto=require('node:crypto');
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
function select(cases,state={},options={}){
 const version=options.version||'travel-regression-6.1-20000',split=options.split||'development',seed=String(options.seed||'visit-china-v61'),count=options.count??100;
 if(!['development','holdout'].includes(split)||!Number.isSafeInteger(count)||count<1||count>20000)throw Error('EVALUATION_SAMPLE_OPTIONS');
 if(state.version&&state.version!==version)throw Error('EVALUATION_CORPUS_VERSION_CHANGED');
 const used=new Set(state.used||[]),eligible=cases.filter(c=>c.split===split&&!used.has(c.id));
 if(count>eligible.length)throw Error('EVALUATION_NO_UNSEEN_CASES:'+eligible.length);
 const families=new Map();
 for(const c of eligible){const key=c.family||c.type;if(!families.has(key))families.set(key,[]);families.get(key).push(c);}
 for(const rows of families.values())rows.sort((a,b)=>digest(seed+':'+a.id).localeCompare(digest(seed+':'+b.id)));
 const ordered=[...families].sort(([a],[b])=>digest(seed+':'+a).localeCompare(digest(seed+':'+b))),selected=[];
 while(selected.length<count)for(const [,rows] of ordered){const c=rows.shift();if(c)selected.push(c);if(selected.length===count)break;}
 const round={id:options.round||'round-'+((state.rounds||[]).length+1),seed,split,count,ids:selected.map(c=>c.id),at:new Date().toISOString()};
 if((state.rounds||[]).some(r=>r.id===round.id))throw Error('EVALUATION_ROUND_EXISTS');
 return{cases:selected,state:{version,used:[...used,...round.ids],rounds:[...(state.rounds||[]),round]},round,remaining:eligible.length-count};
}
module.exports={select};
