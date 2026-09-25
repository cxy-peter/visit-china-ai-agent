'use strict';
const crypto=require('node:crypto'),{checker}=require('./source-refresh');
const feeds=[{id:'shanghai-events',url:'https://english.shanghai.gov.cn/en-Events/index.html'},{id:'shanghai-whats-new',url:'https://english.shanghai.gov.cn/en-WhatsNew/index.html'}];
function links(html,base,now=Date.now()){
 const rows=[],seen=new Set();for(const m of String(html).matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  const title=m[2].replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();let u;try{u=new URL(m[1],base);}catch{continue;}
  if(u.protocol!=='https:'||u.hostname!=='english.shanghai.gov.cn'||u.port||u.username||u.password||u.search||u.hash||seen.has(u.href)||title.length<8||title.length>300)continue;
  const date=u.pathname.match(/\/(20\d{2})(\d{2})(\d{2})\//);if(!date)continue;const publishedAt=date.slice(1).join('-'),age=now-Date.parse(publishedAt);if(!Number.isFinite(age)||age< -86400000||age>45*86400000)continue;
  if(!/event|festival|carnival|exhibition|visitor|touris|payment|transport|airport|metro|rail|service|foreign|international|travel|dining|food|refund|visa/i.test(title))continue;
  seen.add(u.href);rows.push({id:'discovered-'+crypto.createHash('sha256').update(u.href).digest('hex').slice(0,16),title,url:u.href,publisher:'International Services Shanghai',city:'Shanghai',publishedAt,status:'needs_body_review',requiresBodyFetch:true,topics:['公开更新','旅行服务']});if(rows.length===30)break;
 }return rows;
}
async function discover({fetcher=fetch,now=Date.now(),check=checker(fetcher,{includeContent:true,includeHtml:true})}={}){
 const candidates=[],checks=[];for(const feed of feeds){const result=await check(feed);const found=result.status==='fetched'?links(result.html,feed.url,now):[];candidates.push(...found);checks.push({feedId:feed.id,status:result.status,count:found.length,error:result.error});}
 return{at:new Date(now).toISOString(),candidates:[...new Map(candidates.map(r=>[r.url,r])).values()],checks};
}
async function daily(store,{fetcher=fetch,model=null,now=Date.now(),manual=false,discoverFn=discover}={}){
 const token=crypto.randomUUID();const proceed=await store.mutate(s=>{const x=s.eventRefresh||{};if(x.leaseUntil>now||!manual&&Date.parse(x.nextDueAt)>now)return false;s.eventRefresh={...x,lease:token,leaseUntil:now+150000};return true;});if(!proceed)return{skipped:true};
 try{const news=await discoverFn({fetcher,now});await store.mutate(s=>{if(s.eventRefresh?.lease!==token)throw Error('EVENT_REFRESH_CONFLICT');const known=new Set([...(s.newsCandidates||[]).map(r=>r.url),...require('./ops-api').catalog(s).filter(r=>r.summary||r.summaryZh||r.content).map(r=>r.url)]);s.newsCandidates=[...(s.newsCandidates||[]),...news.candidates.filter(r=>!known.has(r.url))].slice(-150);s.eventDiscovery={at:news.at,checks:news.checks};});
  const saved=await store.read(),pending=(saved.newsCandidates||[]).filter(r=>r.id.startsWith('discovered-')&&!saved.sources.some(x=>x.id===r.id)&&!saved.bodyAssessments?.some(x=>x.sourceId===r.id&&now-Date.parse(x.at)<3*86400000)).slice(-2),assessments=[];
  if(model?.status().configured)for(const candidate of pending){try{assessments.push(await require('./source-body').ingest(store,{sourceId:candidate.id,actor:'event-monitor',query:'Extract visitor service facts or event dates and venue; retain booking and language limitations.',model,fetcher,signal:AbortSignal.timeout(40000)}));}catch(e){assessments.push({sourceId:candidate.id,eligible:false,error:/^[A-Z_0-9]+$/.test(e.message)?e.message:'BODY_UNAVAILABLE'});}}
  return await store.mutate(s=>{if(s.eventRefresh?.lease!==token)throw Error('EVENT_REFRESH_CONFLICT');s.eventRefresh={lastCompletedAt:new Date(now).toISOString(),nextDueAt:new Date(now+86400000).toISOString(),leaseUntil:0,discovered:news.candidates.length,published:assessments.filter(x=>x.eligible).length,checks:news.checks,assessmentCount:assessments.length,scope:'Daily bounded official-list discovery; up to two bodies assessed. Not a crawl of every site.'};require('./operations').log(s,'events_discovered','scheduler',{count:news.candidates.length,published:s.eventRefresh.published});return s.eventRefresh;});
 }catch(e){await store.mutate(s=>{if(s.eventRefresh?.lease===token)s.eventRefresh.leaseUntil=0;});throw e;}
}
module.exports={feeds,links,discover,daily};
