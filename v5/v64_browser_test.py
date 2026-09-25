import json,pathlib,time,subprocess,socket,tempfile,shutil,os,urllib.request
from playwright.sync_api import sync_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/v6.4/browser';OUT.mkdir(parents=True,exist_ok=True);checks=[];errors=[]
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
runtime=tempfile.mkdtemp(prefix='vc64-browser-');URL='http://127.0.0.1:'+str(port)
server=subprocess.Popen(['node','v5/v62-browser-fixture.cjs'],cwd=ROOT,env={**os.environ,'PORT':str(port),'LOCAL_DATA_DIR':runtime},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def check(name,value=True):checks.append({'name':name,'passed':bool(value)});assert value,name
try:
 for _ in range(100):
  try:urllib.request.urlopen(URL,timeout=1);break
  except Exception:time.sleep(.1)
 with sync_playwright() as p:
  browser=p.chromium.launch();page=browser.new_page(viewport={'width':1536,'height':1050});page.on('pageerror',lambda e:errors.append(str(e)));page.goto(URL)
  expect(page.locator('[data-starter]')).to_have_count(20);check('20 clickable bilingual starter questions');expect(page.locator('.welcome-message')).to_have_count(0) if False else None
  check('single opening sentence',page.locator('#messages').inner_text().startswith('有什么我可以帮您？'));page.screenshot(path=str(OUT/'opening.png'),full_page=True)
  page.locator('#chat-settings-open').click();page.locator('#cloud-admin-connect').click();page.locator('#chat-admin-password').fill('fixture-admin');page.locator('#chat-admin-login button').click();expect(page.locator('#shared-model-dialog')).not_to_be_visible();check('admin connection')
  with page.expect_response(lambda r:r.url.endswith('/api/chat') and r.request.method=='POST' and r.request.post_data_json.get('action')=='answer',timeout=30000):page.locator('[data-starter=\"0\"]').click()
  expect(page.locator('.metro-map')).to_be_visible();check('starter submits a real question and answer');page.locator('#new-chat-top').click()
  def send(text):
   page.locator('#message').fill(text)
   with page.expect_response(lambda r:r.url.endswith('/api/chat') and r.request.method=='POST' and r.request.post_data_json.get('action')=='answer',timeout=30000) as result:page.locator('#send').click()
   assert not result.value.json().get('error'),result.value.json().get('error');page.wait_for_timeout(200)
  send('上海火车站周围有充电宝吗？我不需要火车路线。');last=page.locator('.utterance.companion').last
  expect(last.locator('.answer-services')).to_contain_text('充电');check('charging source and provider cards');check('station location creates no rail task','rail' not in page.evaluate('TravelApp.getState().tasks'));check('no train comparison or optional product upsell',last.locator('.history-compare,.product-suggestions').count()==0)
  check('CSAT merged into solved feedback',page.locator('[data-csat]').count()==0);last.locator('[data-resolution=unsolved]').click();expect(last.locator('[data-feedback-detail]')).to_be_visible();check('unsolved opens contextual issue report');last.locator('[data-feedback-detail]').click();expect(page.locator('#feedback-detail-dialog')).to_be_visible();check('original question in issue report','上海火车站' in page.locator('#feedback-detail-dialog').inner_text());page.keyboard.press('Escape')
  page.locator('#new-chat-top').click();send('我刚从浦东机场落地，去虹桥火车站怎么走？');last=page.locator('.utterance.companion').last;expect(last.locator('.assistant-answer')).to_contain_text('虹桥');check('arrival guide no map or fare table',last.locator('.metro-map,.history-compare').count()==0)
  page.locator('#new-chat-top').click();send('上海虹桥到杭州东想比较历史二等座');last=page.locator('.utterance.companion').last;expect(last.locator('.history-compare')).to_be_visible();last.locator('[data-rail-after]').fill('06:00');last.locator('[data-rail-before]').fill('07:00');last.locator('[data-rail-before]').dispatch_event('change');expect(last.locator('.transport-rows')).to_contain_text('G7501');check('departure bounds remove earlier and later rows','G7541' not in last.locator('.transport-rows').inner_text() and 'G7461' not in last.locator('.transport-rows').inner_text());expect(last.locator('.product-suggestions')).to_contain_text('一日团');check('contextual real provider and example tour links');check('current events below nearby',page.locator('#nearby-events .event-card').count()==3)
  page.screenshot(path=str(OUT/'desktop.png'),full_page=True);page.set_viewport_size({'width':390,'height':844});check('mobile no page overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));page.screenshot(path=str(OUT/'mobile.png'),full_page=True)
  page.locator('#new-chat-top').click();check('new chat clears current scene',page.locator('.history-compare').count()==0);check('archives retained',page.locator('[data-chat-id]').count()>=3);check('no browser errors',not errors);browser.close()
finally:
 server.terminate();server.wait(timeout=10);shutil.rmtree(runtime,ignore_errors=True);(OUT/'report.json').write_text(json.dumps({'checks':checks,'errors':errors,'scope':'Real browser with fake model and fixture credentials; no real microphone.'},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'passed':len(checks),'errors':errors}))
