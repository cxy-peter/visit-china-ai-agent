"""Incremental official URL discovery, separate from editorial fact verification.

Keeps the V4/V6 body-checked index intact and adds *observed* government article
links. Never synthesizes pagination or article paths. Every new row has the
parent page/feed, its SHA-256, and an explicit body_not_fetched state. A title is
not an answer, a current policy, or a reviewed RAG document.
"""
import argparse, collections, datetime as dt, hashlib, json, re, time
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.robotparser import RobotFileParser
import xml.etree.ElementTree as ET
import requests
from bs4 import BeautifulSoup

UA = 'VisitChinaResearch/6.1 (+https://github.com/cxy-peter/visit-china-ai-agent)'
HOSTS = {
    'www.gov.cn': ['https://www.gov.cn/'],
    'en.nia.gov.cn': ['https://en.nia.gov.cn/'],
    'english.shanghai.gov.cn': ['https://english.shanghai.gov.cn/'],
    'english.beijing.gov.cn': ['https://english.beijing.gov.cn/'],
}
ARTICLE = re.compile(r'content[_/-]?\d*\.(?:s?html?|htm)$|/c\d+/content\.html$|/20\d{6}/[a-f0-9]{32}\.html$|/t\d{8}_\d+\.html$',re.I)
SKIP = re.compile(r'\.(?:js|css|pdf|png|jpg|jpeg|gif|svg|zip|mp4|webp|ico|woff2?)(?:$|\?)',re.I)
TOPICS = {
 'arrival_transport':r'交通|公交|地铁|铁路|高铁|民航|机场|车站|出行|假期|运输|airport|metro|rail|train|transport|ticket|luggage',
 'payment_connectivity':r'支付|银联|外卡|现金|数币|退税|通信|手机|充电|payment|bank|refund|internet|mobile',
 'public_service':r'服务|便民|入境|出入境|护照|签证|户籍|医保|社保|办理|热线|办事|service|visa|passport|immigration|registration',
 'destination':r'旅游|文旅|景区|景点|酒店|餐饮|住宿|公园|博物馆|消费|旅行|museum|park|travel|touris|hotel|restaurant',
 'event_reference':r'活动|节庆|展览|演出|比赛|赛事|展会|festival|exhibition|event',
}
def stamp(): return dt.datetime.now(dt.timezone.utc).isoformat()
def sha(value): return hashlib.sha256(value).hexdigest()
def normalize(url,host):
 p=urlparse(url)
 if p.scheme not in ('http','https') or p.hostname!=host or p.username or p.port not in (None,80,443) or p.query or SKIP.search(p.path): return None
 return urlunparse(('https',host,re.sub('/+','/',p.path or '/'),'','',''))
def json_save(path,value):
 # Readers must never observe half-written JSON during a later incremental run.
 temporary=path.with_name(path.name+'.tmp')
 temporary.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 temporary.replace(path)

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--target',type=int,default=5000);ap.add_argument('--minutes',type=int,default=20);ap.add_argument('--max-pages',type=int,default=500);ap.add_argument('--output',default='data/official');ap.add_argument('--verify-only',action='store_true');args=ap.parse_args()
 if not 1<=args.target<=20000: raise SystemExit('target must be 1..20000')
 out=Path(args.output);out.mkdir(parents=True,exist_ok=True);audit=out/'audit-v61';audit.mkdir(exist_ok=True)
 rows=json.loads((out/'records.json').read_text(encoding='utf-8')) if (out/'records.json').exists() else []
 if args.verify_only:
  report=json.loads((out/'collection-report.json').read_text(encoding='utf-8'));fresh=[r for r in rows if r.get('fetch_status') is None]
  checks={'target_reached':len(rows)>=args.target,'unique_urls':len({r['url'] for r in rows})==len(rows),'unique_ids':len({r['id'] for r in rows})==len(rows),'hash_matches_report':report['records_sha256']==sha((out/'records.json').read_bytes()),'only_known_government_hosts':all(urlparse(r['url']).hostname in HOSTS for r in rows),'new_rows_are_index_only':all(r.get('operational_status')=='body_not_fetched' and not r.get('summary') and not r.get('summaryZh') and not r.get('excerpt') for r in fresh),'new_rows_have_provenance':all(r.get('discovered_on') and re.fullmatch('[a-f0-9]{64}',r.get('discovery_document_sha256','')) for r in fresh),'new_rows_not_marked_body_fetched':all(r.get('content_sha256') is None and r.get('extract_chars')==0 for r in fresh),'old_body_hashes_preserved':all(re.fullmatch('[a-f0-9]{64}',r.get('content_sha256','')) for r in rows if r.get('fetch_status')==200)}
  print(json.dumps({'checks':checks,'passed':all(checks.values()),'count':len(rows)},ensure_ascii=False,indent=2));raise SystemExit(0 if all(checks.values()) else 1)
 known={r['url'] for r in rows}; seen=set();logs=[];counts=collections.Counter();initial=len(rows);start=time.monotonic();session=requests.Session();session.headers['User-Agent']=UA
 robots={};delays={};last={};queue=collections.deque();parent_docs={}
 def fetch(url,robot=False):
  host=urlparse(url).hostname;time.sleep(max(0,delays.get(host,1)-(time.monotonic()-last.get(host,0))));last[host]=time.monotonic()
  r=session.get(url,timeout=(7,15),allow_redirects=False)
  for _ in range(3):
   if r.status_code not in (301,302,303,307,308):break
   dest=normalize(urljoin(url,r.headers.get('Location','')),host)
   if not dest or not robot and not robots[host].can_fetch(UA,dest):raise ValueError('redirect outside approved path')
   time.sleep(delays.get(host,1));r=session.get(dest,timeout=(7,15),allow_redirects=False);url=dest
  if len(r.content)>5_000_000:raise ValueError('response exceeds 5 MB')
  r.encoding='utf-8-sig';return r
 for host,seeds in HOSTS.items():
  rp=RobotFileParser();rp.set_url('https://'+host+'/robots.txt')
  try:
   r=fetch(rp.url,True)
   if r.status_code==200 and re.search(r'user-agent\s*:',r.text,re.I):rp.parse(r.text.splitlines())
   elif r.status_code in (404,410):rp.parse([])
   else:raise ValueError('robots unavailable or not robots: '+str(r.status_code))
   robots[host]=rp;delays[host]=max(1,rp.crawl_delay(UA) or rp.crawl_delay('*') or 0);logs.append({'url':rp.url,'status':r.status_code,'kind':'robots','sha256':sha(r.content)})
   for u in seeds+(rp.site_maps() or []):
    dest=normalize(u,host)
    if dest:queue.append((dest,0))
  except Exception as e:logs.append({'host':host,'kind':'host_stopped','reason':str(e)[:180]})
 def add(url,title,parent,digest,date=None):
  host=urlparse(parent).hostname;u=normalize(urljoin(parent,url),host)
  if not u or u in known or not ARTICLE.search(u) or not robots[host].can_fetch(UA,u):return
  title=re.sub(r'\s+',' ',str(title or '')).strip()[:300]
  if len(title)<4:return
  if re.search('习近平|李强|政治局|人大常委|外交部|国防部|军队|军事|会见|贺电|欢迎宴|祝酒辞',title):return
  tags=[k for k,p in TOPICS.items() if re.search(p,title,re.I)] or ['government_news']
  if len(rows)>=args.target:return
  known.add(u);counts[host]+=1
  rows.append({'id':'off-'+sha(u.encode())[:16],'url':u,'canonical_url':u,'title':title,'publisher':host,'source_kind':'government_index','city':'Shanghai' if 'shanghai' in host else 'Beijing' if 'beijing' in host else 'China','topics':tags,'publication_date':date if date and re.fullmatch(r'20\d\d-\d\d-\d\d',str(date)) else None,'retrieved_at':stamp(),'fetch_status':None,'content_sha256':None,'extract_chars':0,'excerpt':'','excerpt_is_summary':False,'media':[],'editorial_status':'not_reviewed','operational_status':'body_not_fetched','discovered_on':parent,'discovery_document_sha256':digest,'discovery_method':'official_published_link'})
 def checkpoint():
  rows.sort(key=lambda r:(r['city'],r['url']));json_save(out/'records.json',rows);(out/'records.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows),encoding='utf-8');json_save(audit/'discovery-log.json',logs)
 while queue and len(rows)<args.target and len(seen)<args.max_pages and time.monotonic()-start<args.minutes*60:
  url,depth=queue.popleft();host=urlparse(url).hostname
  if url in seen or host not in robots:continue
  seen.add(url)
  if not robots[host].can_fetch(UA,url):logs.append({'url':url,'kind':'robots_blocked'});continue
  try:
   r=fetch(url)
   if r.status_code in (401,403,429):logs.append({'url':url,'kind':'host_stopped_access_control','status':r.status_code});del robots[host];continue
   if r.status_code!=200:logs.append({'url':url,'kind':'http_skip','status':r.status_code});continue
   digest=sha(r.content);before=len(rows);links=[]
   if url.endswith('.json'):
    data=r.json()
    def walk(x):
     if isinstance(x,list):
      for a in x:walk(a)
     elif isinstance(x,dict):
      if x.get('URL') and x.get('TITLE'):add(x['URL'],x['TITLE'],url,digest,x.get('DOCRELPUBTIME'))
      for k,v in x.items():
       if isinstance(v,(dict,list)):walk(v)
    walk(data)
   elif 'xml' in r.headers.get('Content-Type','') or url.endswith('.xml'):
    root=ET.fromstring(r.content)
    for loc in root.iter():
     if loc.tag.rsplit('}',1)[-1]=='loc' and loc.text:
      dest=normalize(loc.text,host)
      if dest and dest.endswith('.xml'):links.append(dest)
   else:
    soup=BeautifulSoup(r.text,'html.parser')
    for a in soup.select('a[href]'):
     dest=normalize(urljoin(url,a['href']),host)
     if not dest:continue
     if ARTICLE.search(dest):add(dest,a.get_text(' ',strip=True),url,digest)
     elif depth<5 and (dest.endswith(('/','.htm','.html','.json','.xml'))):links.append(dest)
    # These exact JSON paths are referenced by the publisher's page code.
    for path in re.findall(r'[\"\x27]([^\"\x27\s<>]+\.json)[\"\x27]',r.text):
     dest=normalize(urljoin(url,path),host)
     if dest:links.insert(0,dest)
   logs.append({'url':url,'kind':'discovery','status':200,'sha256':digest,'added':len(rows)-before,'outgoing':len(set(links))})
   if len(rows)>before:parent_docs[url]={'sha256':digest,'seen_at':stamp()}
   for link in dict.fromkeys(links):
    if link not in seen and not ARTICLE.search(link):queue.append((link,depth+1))
   if len(seen)%20==0:print('index',len(rows),'pages',len(seen),'queue',len(queue),flush=True);checkpoint()
  except Exception as e:logs.append({'url':url,'kind':'fetch_error','reason':str(e)[:200]})
 checkpoint();json_save(audit/'discovery-documents.json',parent_docs)
 report={'started_at_utc':dt.datetime.fromtimestamp(time.time()-(time.monotonic()-start),dt.timezone.utc).isoformat(),'finished_at_utc':stamp(),'requested_target':args.target,'unique_index_urls':len(rows),'target_met':len(rows)>=args.target,'preserved_prior_rows':initial,'new_observed_links':len(rows)-initial,'unique_fetched_pages':sum(r.get('fetch_status')==200 for r in rows),'body_not_fetched':sum(r.get('fetch_status') is None for r in rows),'reviewed_for_current_policy':0,'by_city':dict(collections.Counter(r['city'] for r in rows)),'by_publisher':dict(collections.Counter(r['publisher'] for r in rows)),'topic_counts_nonexclusive':dict(collections.Counter(t for r in rows for t in r['topics'])),'records_sha256':sha((out/'records.json').read_bytes()),'stop_reasons':[r for r in logs if 'stopped' in r['kind']],'count_definition':'Unique official article URLs. Prior body-fetched metadata retained. New URLs were observed in official HTML/JSON; body_not_fetched rows are discovery leads only, never verified facts or current operational guidance. No generated article or pagination URL.'}
 json_save(out/'collection-report.json',report);json_save(audit/'integrity.json',{'unique_urls':len(known),'row_count':len(rows),'unique_ids':len({r['id'] for r in rows}),'all_new_rows_have_parent_hash':all(r.get('discovered_on') and r.get('discovery_document_sha256') for r in rows if r.get('fetch_status') is None),'all_new_rows_have_no_summary':all(not r.get('summary') and not r.get('summaryZh') for r in rows if r.get('fetch_status') is None)});print(json.dumps(report,ensure_ascii=False,indent=2),flush=True)
if __name__=='__main__':main()
