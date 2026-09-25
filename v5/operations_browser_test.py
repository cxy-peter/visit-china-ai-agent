import json,pathlib,os,time,tempfile,subprocess,socket,hashlib,shutil,urllib.request
from playwright.sync_api import sync_playwright,expect
BASE=pathlib.Path(__file__).resolve().parents[1]
OUT=BASE/'evidence/v6.1/legacy-browser';OUT.mkdir(parents=True,exist_ok=True)
IMAGES=BASE.parent/'v6.1-legacy-browser';IMAGES.mkdir(parents=True,exist_ok=True)
accounts={name:'local-test-password' for name in ['admin','reviewer1','reviewer2','reviewer3','reviewer4','reviewer5']}
users={name:{'role':'admin' if name=='admin' else 'reviewer','salt':'test-salt','hash':hashlib.scrypt(password.encode(),salt=b'test-salt',n=16384,r=8,p=1,dklen=32).hex()} for name,password in accounts.items()}
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
URL=f'http://127.0.0.1:{port}'
runtime=tempfile.mkdtemp(prefix='vc57-operations-')
env={**os.environ,'CLOUD_OPERATIONS':'1','LOCAL_DATA_DIR':runtime,'OPS_USERS_JSON':json.dumps(users),'OPS_SESSION_SECRET':'test-signing-secret-32-characters','PORT':str(port)}
for key in ['BLOB_STORE_ID','BLOB_READ_WRITE_TOKEN','DEEPSEEK_API_KEY']:env.pop(key,None)
server=subprocess.Popen(['node','v5/server.js'],cwd=BASE,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
for _ in range(60):
 try:urllib.request.urlopen(URL+'/api/ops?view=library',timeout=1);break
 except Exception:time.sleep(.2)
checks=[];errors=[]
def check(name,value):
 assert value,name
 checks.append({'name':name,'passed':True})
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();context=browser.new_context(viewport={'width':1500,'height':1050});page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(URL);expect(page.locator('#library-refresh-status')).to_contain_text('每三天',timeout=30000)
  expect(page.locator('#messages')).to_contain_text('有什么我可以帮您？')
  check('needs-first greeting has no flight/hotel questionnaire',page.locator('#choices button').count()==0)
  def send(text):page.locator('#message').fill(text);page.locator('#send').click()
  send('我想了解上海到杭州的高铁')
  expect(page.locator('#messages')).to_contain_text('浮动票价')
  expect(page.locator('.utterance.companion').last).to_contain_text('上海虹桥、杭州东')
  check('rail reference is automatically attached',page.locator('[data-source-detail="sh-hz-rail"]').count()>0)
  provider=page.locator('.utterance.companion').last.locator('a[data-product-kind=rail][href*="12306"]').first
  provider.scroll_into_view_if_needed()
  with context.expect_page() as popup:provider.click()
  popup.value.close()
  send('虹桥机场到上海火车站打车多少钱')
  expect(page.locator('.utterance.companion').last).to_contain_text('T1 还是 T2')
  check('missing road distance produces no invented fare','¥' not in page.locator('.utterance.companion').last.inner_text())
  send('上海打车25公里大概多少钱')
  expect(page.locator('.utterance.companion').last).to_contain_text('86.9')
  check('taxi estimate includes query products',page.locator('.utterance.companion').last.locator('a[href="https://car.ctrip.com/"]').count()==1)
  page.locator('[data-taxi-km="25"]').click();expect(page.locator('#taxi-result')).to_contain_text('86.90');page.locator('#taxi-close').click()
  send('从虹桥火车站坐地铁到豫园')
  expect(page.locator('.metro-map')).to_be_visible();expect(page.locator('.metro-map')).to_contain_text('Hongqiao Railway Station');expect(page.locator('.metro-map')).to_contain_text('虹桥火车站');expect(page.locator('.metro-map')).to_contain_text('Yuyuan Garden')
  check('route diagram labels line and endpoints in both languages',page.locator('.metro-map').get_attribute('aria-label').find('Yuyuan Garden')>=0)
  page.locator('.metro-card').scroll_into_view_if_needed();page.screenshot(path=str(IMAGES/'V5_7_中英文地铁与对话.png'))
  page.locator('#output-language').select_option('en');send('Metro from Lujiazui to Yuyuan Garden');expect(page.locator('.metro-map').last).to_contain_text('Line 14')
  check('fixed English output preserved',page.evaluate('TravelApp.getState().language')=='en')
  page.locator('#new-chat-top').click();expect(page.locator('#turn-count')).to_have_text('0');check('new conversation drops old scenario',page.locator('.metro-map').count()==0)
  page.locator('#nav-library').click();expect(page.locator('#library-refresh-status')).to_contain_text('每三天');expect(page.locator('#library-submit')).to_be_visible()
  page.locator('#library-query').fill('出租车');page.locator('#library-search button').click();check('new tariff is searchable in original library UI',page.locator('#library-results').inner_text().find('Shanghai metered taxi')>=0)
  page.locator('#nav-ops').click();expect(page.locator('#ops-cloud-login')).to_be_visible()
  page.locator('#ops-cloud-login [name=username]').fill('admin');page.locator('#ops-cloud-login [name=password]').fill(accounts['admin']);page.locator('#ops-cloud-login button').click();expect(page.locator('.ops-kpis').last).to_be_visible()
  check('admin cloud login works',page.locator('.ops-top').inner_text().find('管理员')>=0)
  page.locator('#ops-dataset').select_option('demo');expect(page.locator('.ops-kpis').last.locator('strong').first).to_have_text('120');check('synthetic CTR matches known fixture','45.3%' in page.locator('.ops-kpis').last.inner_text())
  page.screenshot(path=str(IMAGES/'V5_7_Operations_Dashboard.png'))
  page.locator('[data-ops-tab="sources"]').click();check('source refresh and proposals accessible',page.locator('#ops-refresh-sources').is_enabled())
  page.locator('[data-ops-tab="reviews"]').click();expect(page.locator('#ops-content')).to_contain_text('五个不同审核账号')
  page.locator('[data-ops-tab="evaluation"]').click();page.locator('#ops-run-eval').click();expect(page.locator('#ops-content')).to_contain_text('20010 / 20010',timeout=60000)
  check('simulated scenario evaluation persisted',page.locator('#ops-content').inner_text().find('上海到杭州的高铁')>=0)
  if URL.startswith('http://127.'):
   page.locator('[data-ops-tab="sources"]').click();page.locator('#ops-source-add').click()
   fields={'title':'QA 测试资料','url':'https://english.shanghai.gov.cn/test-review-fixture','publisher':'QA fixture','city':'Shanghai','topics':'testreview','summaryZh':'仅用于本机审核测试。','summary':'Local review fixture only.'}
   for key,value in fields.items():page.locator('#ops-source-form [name='+key+']').fill(value)
   page.locator('#ops-source-form button').click();expect(page.locator('#ops-source-note')).to_contain_text('已发布');page.locator('#ops-source-close').click();page.locator('[data-ops-tab="reviews"]').click();expect(page.locator('#ops-content')).to_contain_text('QA 测试资料');check('admin source submission publishes without reviewer votes',page.locator('[data-vote]').count()==0)
   saved=page.request.get(URL+'/api/ops').json();proposal=saved['proposals'][-1];check('direct publication keeps audit and rollback',proposal['status']=='published' and proposal['verification']['mode']=='admin-direct')
   check('published source is in shared library',any(r['id']==proposal['sourceId'] for r in page.request.get(URL+'/api/ops?view=library').json()['records']))
   response=page.request.post(URL+'/api/ops',data={'action':'source-rollback','id':proposal['id']});check('admin rollback succeeds',response.ok)
  page.locator('[data-ops-tab="overview"]').click();page.locator('#ops-dataset').select_option('live');expect(page.locator('.ops-dataset-label')).to_contain_text('真实访问')
  page.locator('#ops-signout').click();expect(page.locator('#ops-cloud-login')).to_be_visible();page.locator('#ops-close').click()
  page.set_viewport_size({'width':390,'height':844});page.locator('#nav-call').click();check('mobile page has no horizontal body overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  page.locator('#nav-ops').click();expect(page.locator('#ops-cloud-login')).to_be_visible();page.screenshot(path=str(IMAGES/'V5_7_手机运营登录.png'))
  check('browser has no uncaught errors',not errors)
  browser.close()
finally:
 server.terminate();server.wait(timeout=10)
 resolved=pathlib.Path(runtime).resolve();assert resolved.parent==pathlib.Path(tempfile.gettempdir()).resolve() and resolved.name.startswith('vc57-operations-');shutil.rmtree(resolved,ignore_errors=True)
(OUT/'V5_7_浏览器验收.json').write_text(json.dumps({'url':URL,'checks':checks,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'passed':len(checks),'errors':errors}))
