"""Real browser/server check; no paid model, external website or microphone is used."""
import json, pathlib, time, subprocess, socket, tempfile, shutil, os, urllib.request
from playwright.sync_api import sync_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/v6.5/browser';OUT.mkdir(parents=True,exist_ok=True)
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
runtime=tempfile.mkdtemp(prefix='vc65-browser-');URL=f'http://127.0.0.1:{port}';checks=[];errors=[];requests=[]
server=subprocess.Popen(['node','v5/v62-browser-fixture.cjs'],cwd=ROOT,env={**os.environ,'PORT':str(port),'LOCAL_DATA_DIR':runtime},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def check(name,condition):
 checks.append({'name':name,'passed':bool(condition)})
 assert condition,name
try:
 for _ in range(100):
  try:urllib.request.urlopen(URL,timeout=1);break
  except Exception:time.sleep(.1)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or shutil.which("chromium"));page=browser.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.post_data_json) if r.method=='POST' and r.url.endswith('/api/chat') else None)
  page.goto(URL);expect(page.locator('[data-arrival-starter]')).to_have_count(5);check('five arrival guide choices visible',True);expect(page.locator('[data-starter]')).to_have_count(20);check('original 20 questions preserved',True)
  for i,city in enumerate(['Shanghai','Beijing','Guangzhou','Shenzhen','Hong Kong']):
   if i:page.locator('#new-chat-top').click();expect(page.locator('[data-arrival-starter]')).to_have_count(5)
   with page.expect_response(lambda r:r.url.endswith('/api/chat') and r.request.method=='POST' and r.request.post_data_json.get('action')=='kb',timeout=20000) as response:page.locator(f'[data-arrival-starter="{i}"]').click()
   body=response.value.json();expect(page.locator('.assistant-answer')).to_contain_text('标准KB答案')
   check(city+' public KB returns actual server answer',body['answer']['mode']=='kb-direct')
   check(city+' zero model tokens',body['answer']['usage']['total_tokens']==0)
   check(city+' shared trip state',page.evaluate('TravelApp.getState().facts.city')==city)
   check(city+' source reference available',page.locator('[data-source-detail="'+body['answer']['sourceIds'][0]+'"]').count()>0)
  check('public guide session has zero model-answer requests',not any(x.get('action')=='answer' for x in requests))
  page.screenshot(path=str(OUT/'hong-kong-guide.png'),full_page=True)
  page.locator('#nav-library').click();page.locator('#library-city').select_option('Hong Kong');page.locator('#library-query').fill('');page.locator('#library-search button').click();expect(page.locator('#library-results')).to_contain_text('MTR')
  check('Hong Kong library excludes mainland city sources','Shanghai' not in page.locator('#library-results').inner_text() and 'Shenzhen' not in page.locator('#library-results').inner_text())
  page.locator('#nav-ops').click();expect(page.locator('#ops-cloud-login')).to_be_visible();page.locator('#ops-cloud-login [name=username]').fill('admin');page.locator('#ops-cloud-login [name=password]').fill('fixture-admin');page.locator('#ops-cloud-login button').click();expect(page.locator('.ops-top')).to_contain_text('管理员');check('Operations login remains usable',True)
  page.locator('[data-ops-tab="metrics"]').click();expect(page.locator('#ops-content')).to_contain_text('标准KB直出占比');check('KB metric present with denominator',True)
  page.locator('[data-ops-tab="retrieval"]').click();expect(page.locator('#ops-content')).to_contain_text('标准KB直出');check('actual server KB traces visible in Operations',True);page.screenshot(path=str(OUT/'operations.png'),full_page=True)
  page.locator('#ops-close').click();page.locator('#nav-call').click();page.set_viewport_size({'width':390,'height':844});check('mobile no page overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));page.screenshot(path=str(OUT/'mobile.png'),full_page=True)
  check('no uncaught browser errors',not errors);browser.close()
finally:
 server.terminate();server.wait(timeout=10);shutil.rmtree(runtime,ignore_errors=True)
 (OUT/'report.json').write_text(json.dumps({'checks':checks,'errors':errors,'scope':'Local real browser plus actual API endpoints. Mock provider fixture exists but no model answer requests were made. No microphone or live stock verification.'},ensure_ascii=False,indent=2))
print(json.dumps({'passed':sum(c['passed'] for c in checks),'total':len(checks),'errors':errors}))
