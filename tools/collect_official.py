"""Collect public government travel records; never bypass robots/login/captcha.
Exports metadata, <=20-word excerpts and source hashes, not a mirrored website.
An HTTP fetch is NOT editorial approval or proof that a policy is still effective.
"""
import argparse, collections, datetime as dt, hashlib, json, re, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.robotparser import RobotFileParser
import requests
from bs4 import BeautifulSoup

UA = 'VisitChinaResearch/4.0 (+https://github.com/cxy-peter/visit-china-ai-agent)'
SEEDS = {
 'english.shanghai.gov.cn': ['https://english.shanghai.gov.cn/en-LivinginShanghai/index.html','https://english.shanghai.gov.cn/en-TravelinShanghai/index.html','https://english.shanghai.gov.cn/'],
 'english.beijing.gov.cn': ['https://english.beijing.gov.cn/'],
}
TOPICS = {
 'arrival_transport': r'airport|arrival|terminal|metro|subway|train|railway|taxi|transport|bus\b|flight|luggage|baggage|transit|driving|driver|ticket|station|traffic',
 'payment_connectivity': r'payment|alipay|wechat|weixin|bank|currency|exchange|cash|coin|refund|tax.free|sim.card|mobile|wi.fi|internet|phone|charging|power.bank',
 'public_service': r'guide|how to|visa|passport|immigration|customs|registration|permit|hotline|emergency|volunteer|service.center|service.centre|service.station|help|accessible|disabil|foreign.visitor|foreigner|international.student|scholarship',
 'destination': r'museum|park\b|garden|scenic|attraction|historic|theat|library|libraries|bookstore|restaurant|cafe|hotel|accommodation|tour|travel|itinerar|shopping|mall|temple|beach|resort|cruise|heritage|pedestrian|landmark|gallery|galleries',
 'event_reference': r'festival|exhibition|performance|concert|flower|blossom|sport|weekend|event|lantern|art\b|culture',
}
EXCLUDE = re.compile(r'economic growth|gdp|investment environment|industrial output|unicorn compan|world skills|worldskills|political bureau|party congress|business registration|foreign.invested|investment promotion|entrepreneur|recruitment', re.I)
PATH_GOOD = re.compile(r'travel|living|transport|payment|banking|mobile|guide|faq|attraction|museum|park|service|scenic|historic|theater|theatre|food|hotel|shopping|consum|tour|studying|student|visa|arrival|refund|bookstore|cafe|nightlife|barspubs', re.I)
ARTICLE = re.compile(r'/(?:20\d{6})/|/t\d{8}_|/[a-f0-9]{32}\.html', re.I)
SKIP = re.compile(r'\.(?:js|css|pdf|png|jpg|jpeg|gif|svg|zip|mp4|webp|ico|woff2?)(?:$|\?)', re.I)
NOW = dt.datetime.now(dt.timezone.utc).isoformat()

def normalize(url, host):
 p = urlparse(url)
 if p.scheme not in ('http','https') or p.hostname != host or p.username or p.port not in (None,80,443): return None
 if SKIP.search(p.path) or p.query: return None
 return urlunparse(('https',host,p.path or '/','','',''))

def classify(title, url):
 text = title.lower()
 if EXCLUDE.search(text): return []
 tags = [k for k,v in TOPICS.items() if re.search(v,text,re.I)]
 if not tags and PATH_GOOD.search(url): tags = ['destination' if re.search(r'museum|park|scenic|historic|theat|food|hotel|shopping|attraction',url,re.I) else 'public_service']
 return tags

def crawl_host(host, seeds, limit, minutes, output):
 session = requests.Session(); session.headers['User-Agent'] = UA
 robots = RobotFileParser(); robots.set_url('https://'+host+'/robots.txt')
 log, records, seen, hashes, queued = [], [], set(), set(), set()
 pending = collections.deque((u,0) for u in seeds); queued.update(seeds)
 start = time.monotonic(); delay = 0.8; last = 0; consecutive = 0
 def fetch(url):
  nonlocal last
  time.sleep(max(0,delay-(time.monotonic()-last))); last=time.monotonic()
  r=session.get(url,timeout=(8,20),allow_redirects=False)
  for _ in range(3):
   if r.status_code not in (301,302,303,307,308): break
   dest=normalize(urljoin(url,r.headers.get('Location','')),host)
   if not dest: raise ValueError('Cross-host redirect blocked')
   url=dest; r=session.get(url,timeout=(8,20),allow_redirects=False)
  if len(r.content)>3_000_000: raise ValueError('Oversized page')
  return r
 try:
  rr=fetch(robots.url)
  if rr.status_code==200 and 'User-agent' in rr.text:
   robots.parse(rr.text.splitlines()); delay=max(delay,robots.crawl_delay(UA) or robots.crawl_delay('*') or 0)
  elif rr.status_code in (404,410): robots.parse([])
  else: raise ValueError('robots unavailable: '+str(rr.status_code))
  log.append({'url':robots.url,'status':rr.status_code,'kind':'robots','sha256':hashlib.sha256(rr.content).hexdigest()})
 except Exception as e:
  log.append({'kind':'host_stopped','reason':str(e)}); return records,log
 def checkpoint():
  output.mkdir(parents=True,exist_ok=True)
  (output/(host+'.json')).write_text(json.dumps(records,ensure_ascii=False,indent=2))
  (output/(host+'.log.json')).write_text(json.dumps(log,ensure_ascii=False,indent=2))
 while pending and len(records)<limit and time.monotonic()-start<minutes*60:
  url,depth=pending.popleft()
  if url in seen: continue
  seen.add(url)
  if not robots.can_fetch(UA,url):
   log.append({'url':url,'kind':'robots_blocked'}); continue
  try:
   r=fetch(url)
   if r.status_code in (401,403,429):
    log.append({'url':url,'status':r.status_code,'kind':'host_stopped_access_control'}); break
   if r.status_code!=200 or 'html' not in r.headers.get('Content-Type','').lower():
    log.append({'url':url,'status':r.status_code,'kind':'http_skip'}); continue
   consecutive=0
   soup=BeautifulSoup(r.content,'html.parser')
   title_meta=soup.find('meta',attrs={'name':re.compile('ArticleTitle',re.I)})
   title=(title_meta.get('content') if title_meta else None) or (soup.h1.get_text(' ',strip=True) if soup.h1 else '') or (soup.title.get_text(' ',strip=True) if soup.title else '')
   if re.search(r'verify you are human|access denied|security check|captcha',title,re.I):
    log.append({'url':url,'kind':'host_stopped_challenge'}); break
   is_article=bool(ARTICLE.search(url))
   links=[]
   if depth<5:
    for a in soup.find_all('a',href=True):
     dest=normalize(urljoin(url,a['href']),host)
     if dest and dest not in queued:
      label=a.get_text(' ',strip=True)
      if EXCLUDE.search(label): continue
      if ARTICLE.search(dest) and not classify(label,dest): continue
      if not ARTICLE.search(dest) and not PATH_GOOD.search(dest) and dest not in seeds and not re.search(r'latest|news|index',dest,re.I): continue
      queued.add(dest); links.append((dest,depth+1))
    # Explore relevant lists first, then article pages; never invent page URLs.
    for item in reversed([x for x in links if not ARTICLE.search(x[0])]): pending.appendleft(item)
    pending.extend(x for x in links if ARTICLE.search(x[0]))
   tags=classify(title,url)
   if not is_article or not tags or not title:
    log.append({'url':url,'kind':'discovery_only','links':len(links)}); continue
   container=soup.select_one('.TRS_Editor, .Article_content, .article-content, .article_content, #zoom, #zoomcon, #UCAP-CONTENT, article, .content_body, .content')
   if container is None: container=soup.body or soup
   for bad in container.find_all(['script','style','nav','header','footer','form']): bad.decompose()
   paragraphs=[p.get_text(' ',strip=True) for p in container.find_all('p')]
   body='\n'.join(p for p in paragraphs if len(p)>35)
   if len(body)<120: body=container.get_text(' ',strip=True)
   if len(body)<120 or len(body)>150000:
    log.append({'url':url,'kind':'content_rejected'}); continue
   digest=hashlib.sha256(re.sub(r'\s+',' ',body).strip().encode()).hexdigest()
   if digest in hashes:
    log.append({'url':url,'kind':'duplicate_body'}); continue
   hashes.add(digest)
   date_meta=soup.find('meta',attrs={'name':re.compile('PubDate|pubdate|publishdate|date',re.I)})
   published=(date_meta.get('content','') if date_meta else '')
   date_match=re.search(r'(20\d{2})[-/]?(\d{2})[-/]?(\d{2})',published or url)
   publication_date='-'.join(date_match.groups()) if date_match else None
   images=[]
   for im in container.find_all('img',src=True):
    image=urljoin(url,im['src'])
    if urlparse(image).scheme=='https' and not re.search(r'logo|icon|share|qrcode|weixin|wechat',image,re.I):
     images.append({'url':image,'alt':im.get('alt','')[:160],'rights':'not licensed for redistribution; open on publisher site','availability':'not separately checked'})
   words=body.split()
   rec={'id':'off-'+hashlib.sha256(url.encode()).hexdigest()[:16], 'url':url, 'canonical_url':url, 'title':title[:300], 'publisher':host, 'source_kind':'government_published', 'city':'Shanghai' if 'shanghai' in host else 'Beijing', 'topics':tags,'publication_date':publication_date,'retrieved_at':dt.datetime.now(dt.timezone.utc).isoformat(),'fetch_status':200,'content_sha256':digest,'extract_chars':len(body),'excerpt':' '.join(words[:20]),'excerpt_is_summary':False,'media':images[:4],'editorial_status':'not_reviewed','operational_status':'requires_freshness_and_applicability_check','discovery_depth':depth}
   records.append(rec)
   if len(records)%50==0:
    print(host,'accepted',len(records),'seen',len(seen),'queue',len(pending),flush=True); checkpoint()
  except Exception as e:
   consecutive+=1; log.append({'url':url,'kind':'fetch_error','reason':str(e)[:250]})
   if consecutive>=6: break
 checkpoint(); print(host,'finished',len(records),'seen',len(seen),flush=True)
 return records,log

def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--target',type=int,default=1200); ap.add_argument('--minutes',type=int,default=20); ap.add_argument('--output',default='data/official'); args=ap.parse_args()
 if not 1<=args.target<=5000: raise SystemExit('target must be between 1 and 5000')
 output=Path(args.output); per_host=(args.target+1)//2
 with ThreadPoolExecutor(max_workers=2) as pool:
  jobs=[pool.submit(crawl_host,h,s,per_host,args.minutes,output/'audit') for h,s in SEEDS.items()]
  results=[j.result() for j in jobs]
 records=[]; seen_urls=set(); seen_content=set()
 for rows,logs in results:
  for r in rows:
   if r['canonical_url'] not in seen_urls and r['content_sha256'] not in seen_content:
    seen_urls.add(r['canonical_url']); seen_content.add(r['content_sha256']); records.append(r)
 records.sort(key=lambda x:(x['city'],x['url']))
 output.mkdir(parents=True,exist_ok=True)
 (output/'records.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
 (output/'records.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in records))
 report={'started_at':NOW,'finished_at':dt.datetime.now(dt.timezone.utc).isoformat(),'requested_target':args.target,'unique_fetched_pages':len(records),'target_met':len(records)>=args.target,'minimum_1000_met':len(records)>=1000,'reviewed_for_current_policy':0,'by_city':dict(collections.Counter(r['city'] for r in records)),'topic_counts_nonexclusive':dict(collections.Counter(t for r in records for t in r['topics'])),'records_sha256':hashlib.sha256((output/'records.json').read_bytes()).hexdigest(),'count_definition':'One unique successful HTML article URL and unique extracted-body hash. Discovery lists, fragments, failed fetches and duplicate bodies excluded. Not all records are operational guides; destination and event references are separately tagged. Fetch != editorial validation.'}
 (output/'collection-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False,indent=2),flush=True)
if __name__=='__main__': main()
