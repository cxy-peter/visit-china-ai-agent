"""V5.9 user journeys with a local server, authenticated sources and a controlled model.
The separate production smoke test uses real DeepSeek; this suite incurs no API cost.
"""
import json,pathlib,os,time,tempfile,subprocess,socket,hashlib,shutil,urllib.request
from playwright.sync_api import sync_playwright,expect
BASE=pathlib.Path(__file__).resolve().parents[1];OUT=BASE/'evidence/v5.9';OUT.mkdir(parents=True,exist_ok=True)
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
URL=f'http://127.0.0.1:{port}';runtime=tempfile.mkdtemp(prefix='vc59-discovery-')
names=['admin','reviewer1','reviewer2','reviewer3','reviewer4','reviewer5'];password='v59-local-test-password'
users={name:{'role':'admin' if name=='admin' else 'reviewer','salt':'fixture','hash':hashlib.scrypt(password.encode(),salt=b'fixture',n=16384,r=8,p=1,dklen=32).hex()} for name in names}
env={**os.environ,'CLOUD_OPERATIONS':'1','LOCAL_DATA_DIR':runtime,'OPS_USERS_JSON':json.dumps(users),'OPS_SESSION_SECRET':'v59-signing-secret-32-characters','PORT':str(port)}
for key in ['BLOB_STORE_ID','BLOB_READ_WRITE_TOKEN','DEEPSEEK_API_KEY']:env.pop(key,None)
server=subprocess.Popen(['node','v5/server.js'],cwd=BASE,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
checks=[];errors=[]
def check(name,value=True):
 assert value,name
 checks.append({'name':name,'passed':True})
try:
 for _ in range(60):
  try:urllib.request.urlopen(URL+'/api/ops?view=library',timeout=1);break
  except Exception:time.sleep(.2)
 with sync_playwright() as p:
  browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':1536,'height':1050});page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(URL)
  expect(page.locator('#library-refresh-status')).to_contain_text('每三天',timeout=30000)
  def send(t):page.locator('#message').fill(t);page.locator('#send').click()
  send('从浦东机场到上海站的地铁怎么做')
  last=page.locator('.utterance.companion').last;expect(last).to_contain_text('人民广场');expect(last).to_contain_text('1号线');expect(last.locator('.metro-map')).to_contain_text('Shanghai Railway Station');check('exact user query answers directly, with a bilingual map','还有哪一项' not in last.inner_text());check('no intercity ticket card on metro request',last.locator('.offer-card').count()==0)
  expect(page.locator('#discovery-title')).to_have_text('猜你想问');expect(page.locator('#nearby-places')).to_contain_text('四行仓库');check('nearby cards have real addresses and original sources',page.locator('#nearby-places .place-address').count()>0 and page.locator('#nearby-places [data-source-detail]').count()>0)
  page.screenshot(path=str(OUT/'metro-nearby-desktop.png'),full_page=True)
  page.locator('#nearby-filters [data-nearby-filter=food]').click();check('food filter narrows actual venue cards',page.locator('#nearby-places').inner_text().find('人民咖啡馆')>=0 and page.locator('#nearby-places').inner_text().find('M50')<0)
  page.locator('#nearby-places [data-place-route]').first.click();last=page.locator('.utterance.companion').last;expect(last.locator('.metro-edit [name=via]')).to_have_value('曲阜路');expect(last.locator('.metro-edit [name=destination]')).to_have_value('上海火车站');check('adding a place adds its station as via, preserving endpoints')
  send('终点改成豫园');last=page.locator('.utterance.companion').last;expect(last.locator('.metro-map')).to_contain_text('豫园');expect(last.locator('.metro-edit [name=origin]')).to_have_value('浦东1号2号航站楼');check('destination correction remains a route, not a scenic-place description')
  send('附近有什么可以吃的');last=page.locator('.utterance.companion').last;expect(last).to_contain_text('和丰楼');check('nearby follow-up keeps the latest destination and real venue')
  page.locator('#nav-library').click();page.locator('#library-kind').select_option('station');page.locator('#library-query').fill('上海火车站');page.locator('#library-search button').click();expect(page.locator('#library-results')).to_contain_text('Shanghai Railway Station');check('public stations are searchable in source library')
  page.locator('#library-kind').select_option('place');page.locator('#library-query').fill('M50');page.locator('#library-search button').click();expect(page.locator('#library-results')).to_contain_text('莫干山路50号');check('places are searchable with the actual address')
  page.locator('#library-results [data-source-detail]').first.click();expect(page.locator('#source-detail')).to_contain_text('资料证据评分');check('source detail exposes evidence score and its basis')
  page.locator('#nav-ops').click();expect(page.locator('.ops-account-help')).to_contain_text('reviewer5');check('login page shows role guide without exposing a credential',password not in page.locator('#ops-body').inner_text())
  page.locator('#ops-account-file').set_input_files({'name':'private-accounts.txt','mimeType':'text/plain','buffer':('\n'.join(name+': '+password for name in names)).encode()});expect(page.locator('#ops-account-file-note')).to_contain_text('6 个账号');page.locator('[data-account-name=admin]').click();expect(page.locator('#ops-cloud-login [name=password]')).to_have_value(password);check('private account document fills locally without password text in page',password not in page.locator('#ops-body').inner_text())
  page.locator('#ops-cloud-login button').click();expect(page.locator('.ops-top')).to_contain_text('管理员');page.locator('[data-ops-tab=sources]').click();page.locator('#ops-source-type').select_option('station');expect(page.locator('#ops-content')).to_contain_text('418 条结果');check('operations has a station inventory and confidence scores')
  page.locator('#ops-source-add').click();fields={'title':'V59 local QA source','url':'https://example.com/v59-local','publisher':'Local QA','city':'Shanghai','summaryZh':'这是本地直接发布与回滚测试资料，不表示真实旅行信息。','summary':'Local publication and rollback fixture only.'}
  for key,value in fields.items():page.locator('#ops-source-form [name='+key+']').fill(value)
  page.locator('#ops-source-form button').click();expect(page.locator('#ops-source-note')).to_contain_text('已发布');page.locator('#ops-source-close').click();page.locator('[data-ops-tab=reviews]').click();expect(page.locator('#ops-content')).to_contain_text('管理员直接发布');check('administrator submission publishes immediately and exposes review materials')
  page.locator('.ops-review .ops-materials summary').last.click();expect(page.locator('.ops-review .ops-materials').last).to_contain_text('admin-direct');check('publication proof and base-version material visible')
  page.locator('[data-ops-tab=evaluation]').click();expect(page.locator('#ops-content')).to_contain_text('1221');expect(page.locator('#ops-content')).to_contain_text('184');check('loop shows provenance, corpus version and downloadable full cases')
  page.locator('#ops-run-eval').click();expect(page.locator('#ops-content')).to_contain_text('1231 / 1231',timeout=30000);check('entire corpus and historical scenarios run from Operations')
  page.screenshot(path=str(OUT/'operations-loop-desktop.png'),full_page=True)
  page.locator('#ops-signout').click();page.locator('#ops-close').click();page.locator('#nav-call').click();page.locator('#new-chat-top').click();expect(page.locator('#turn-count')).to_have_text('0');check('new chat removes previous destination and nearby cards',page.locator('#nearby-places .nearby-place').count()==0)
  page.set_viewport_size({'width':390,'height':844});send('从浦东机场到上海站的地铁怎么做');check('mobile body does not overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));page.screenshot(path=str(OUT/'metro-nearby-mobile.png'),full_page=True)
  check('no browser JavaScript errors',not errors);browser.close()
finally:
 server.terminate();server.wait(timeout=10);shutil.rmtree(runtime,ignore_errors=True)
(OUT/'discovery-browser-results.json').write_text(json.dumps({'checks':checks,'errors':errors,'scope':'Local browser with actual server/auth/storage; no paid model call'},ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'passed':len(checks),'errors':errors}))
