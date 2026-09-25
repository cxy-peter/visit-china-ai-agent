'use strict';
const crypto=require('node:crypto');
const {robotsAllowed}=require('../v4/server');
const {discoveryFeeds}=require('./news-data');
const HOST='www.gov.cn',UA='VisitChinaResearch/6.1',LIMIT=1024*1024,REDIRECTS=new Set([301,302,303,307,308]);
function safe(value,base){const u=new URL(value,base);if(u.protocol!=='https:'||u.hostname!==HOST||u.port||u.username||u.password||u.search||u.hash)throw Error('DISCOVERY_URL');return u;}
async function limited(response,max=LIMIT){let bytes=0;const parts=[];if(!response.body)throw Error('DISCOVERY_EMPTY');for await(const chunk of response.body){bytes+=chunk.length;if(bytes>max)throw Error('DISCOVERY_TOO_LARGE');parts.push(Buffer.from(chunk));}return Buffer.concat(parts).toString('utf8').replace(/^\uFEFF/,'');}
function candidatesFrom(value,feed,policy,seen,now){
 if(!Array.isArray(value)||value.length>10000||value.some(r=>!r||typeof r!=='object'||Array.isArray(r)||typeof r.TITLE!=='string'||typeof r.URL!=='string'||typeof r.DOCRELPUBTIME!=='string'))throw Error('DISCOVERY_SCHEMA');
 const rows=[];
 for(const r of value){if(rows.length>=20)break;const title=r.TITLE.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,300);if(title.length<4||!feed.topics.some(t=>title.toLowerCase().includes(t.toLowerCase())))continue;
  let u;try{u=safe(r.URL,feed.url);}catch{continue;}if(!/\.(?:s?html?|htm)$/i.test(u.pathname)||!robotsAllowed(policy,u.href).allowed||seen.has(u.href))continue;
  const date=r.DOCRELPUBTIME.slice(0,10);if(!/^20\d\d-\d\d-\d\d$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||Date.parse(date)>now+86400000)continue;
  seen.add(u.href);rows.push({id:'news-candidate-'+crypto.createHash('sha256').update(u.href).digest('hex').slice(0,16),title,url:u.href,city:feed.city,publishedAt:date,feedId:feed.id,status:'needs_body_review',requiresBodyFetch:true});
 }
 return rows;
}
async function discover({fetcher=fetch,now=Date.now()}={}){
 const at=new Date(now).toISOString(),checks=[],candidates=[],seen=new Set(),budget=AbortSignal.timeout(22000);let policy,lastRequest=0,blocked=false;
 async function request(url,{robots=false}={}){
  let current=safe(url);
  for(let i=0;i<=3;i++){
   if(budget.aborted)throw Error('DISCOVERY_TIME_BUDGET');
   let delay=1;if(!robots){const rule=robotsAllowed(policy,current.href);if(!rule.allowed)throw Error('ROBOTS_DISALLOWED');if(rule.delay>5)throw Error('CRAWL_DELAY_REQUIRES_MANUAL');delay=Math.max(1,rule.delay);}
   const wait=Math.max(0,delay*1000-(Date.now()-lastRequest));if(wait)await new Promise(r=>setTimeout(r,wait));lastRequest=Date.now();
   if(budget.aborted)throw Error('DISCOVERY_TIME_BUDGET');
   const response=await fetcher(current.href,{redirect:'manual',signal:AbortSignal.any([budget,AbortSignal.timeout(7000)]),headers:{'User-Agent':UA,Accept:robots?'text/plain':'application/json'}});
   if([401,403,429].includes(response.status)){blocked=true;throw Error(robots?'ROBOTS_UNAVAILABLE':'DISCOVERY_HTTP_'+response.status);}
   if(REDIRECTS.has(response.status)){const location=response.headers.get('location');if(robots||i===3||!location)throw Error('DISCOVERY_REDIRECT');try{current=safe(location,current.href);}catch{throw Error('DISCOVERY_REDIRECT');}continue;}
   return response;
  }
  throw Error('DISCOVERY_REDIRECT');
 }
 let robotsError;try{const response=await request('https://'+HOST+'/robots.txt',{robots:true});if([404,410].includes(response.status))policy='';else if(response.ok){policy=await limited(response,150000);if(!/user-agent\s*:/i.test(policy))throw Error('ROBOTS_UNAVAILABLE');}else throw Error('ROBOTS_UNAVAILABLE');}catch(e){robotsError=/^[A-Z_0-9]+$/.test(e.message)?e.message:'ROBOTS_UNAVAILABLE';}
 for(const feed of discoveryFeeds.slice(0,2)){
  try{if(robotsError)throw Error(robotsError);if(blocked)throw Error('DISCOVERY_HOST_BLOCKED');const response=await request(feed.url);if(!response.ok)throw Error('DISCOVERY_HTTP_'+response.status);const type=response.headers.get('content-type')||'';if(type&&/html|image|audio|video|pdf/i.test(type))throw Error('DISCOVERY_FORMAT');const raw=await limited(response);let value;try{value=JSON.parse(raw);}catch{throw Error('DISCOVERY_JSON');}const found=candidatesFrom(value,feed,policy,seen,now);candidates.push(...found);checks.push({feedId:feed.id,status:'discovered',count:found.length});}
  catch(e){checks.push({feedId:feed.id,status:'unavailable',error:/^[A-Z_0-9]+$/.test(e.message)?e.message:'DISCOVERY_UNAVAILABLE',count:0});}
 }
 return{at,candidates,checks};
}
module.exports={discover,candidatesFrom};
