"""Real browser and HTTP checks; controlled provider, no live inventory or microphone."""
import json,pathlib,time,subprocess,socket,tempfile,shutil,os,urllib.request
from playwright.sync_api import sync_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/v6.6/browser';OUT.mkdir(parents=True,exist_ok=True)
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
runtime=tempfile.mkdtemp(prefix='vc66-browser-');URL=f'http://127.0.0.1:{port}';checks=[];errors=[]
server=subprocess.Popen(['node','v5/v62-browser-fixture.cjs'],cwd=ROOT,env={**os.environ,'PORT':str(port),'LOCAL_DATA_DIR':runtime},stdout=open(OUT/'server.log','w'),stderr=subprocess.STDOUT)
def check(name,condition):
 checks.append({'name':name,'passed':bool(condition)});assert condition,name
try:
 for _ in range(100):
  try:urllib.request.urlopen(URL,timeout=1);break
  except Exception:time.sleep(.1)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'));page=browser.new_page(viewport={'width':1440,'height':1040});page.on('pageerror',lambda e:errors.append(str(e)));page.goto(URL)
  expect(page.locator('[data-arrival-starter]')).to_have_count(5);check('five cities retained',True)
  def send(text):page.locator('#message').fill(text);page.locator('#send').click()
  send('上海虹桥到杭州的高铁，我还没有订酒店。')
  expect(page.locator('.history-compare')).to_have_count(1)
  expect(page.locator('.service-extension')).not_to_have_count(0);check('service cards beneath rail answer',True)
  check('one unified solved/helpful feedback',page.locator('.answer-resolution').count()==1 and page.locator('[data-csat]').count()==0)
  page.locator('[data-extension-save="tour"]').click();expect(page.locator('[data-extension-save="tour"]')).to_have_attribute('aria-pressed','true')
  page.evaluate('TravelApp.refresh()');expect(page.locator('[data-extension-save="tour"]')).to_have_attribute('aria-pressed','true');check('saved option survives rerender',True)
  check('saving is not a hotel reservation',page.evaluate('TravelApp.getState().facts.hotel')!='booked')
  with page.expect_response(lambda r:r.url.endswith('/api/products')) as got:page.locator('[data-extension-open="car"]').click()
  body=got.value.json();check('actual mock API called',body['mode']=='mock-adapter' and body['providerRequestSent']==False)
  expect(page.locator('#related-services-body')).to_contain_text('自驾租车');check('self-drive qualification visible','驾驶资格' in page.locator('#related-services-body').inner_text())
  check('no price or inventory claims',all(x['price'] is None and x['inventory'] is None for x in body['offers']))
  check('provider links are explicit and not prefilled',page.locator('#related-services-body [data-product-kind]').count()==1 and '不会自动填写' in page.locator('#related-services-body').inner_text())
  page.locator('[data-extension-close]').click()
  page.locator('[data-rail-quick="06:00|12:00"]').click();expect(page.locator('[data-rail-after]')).to_have_value('06:00');expect(page.locator('[data-rail-before]')).to_have_value('12:00');check('one click applies departure window',True)
  page.evaluate('TravelApp.refresh()');expect(page.locator('[data-rail-after]')).to_have_value('06:00');check('time window survives unrelated rerender',True)
  page.locator('[data-rail-after]').fill('20:00');page.locator('[data-rail-after]').dispatch_event('change');expect(page.locator('[data-rail-prepare]')).to_be_disabled();check('invalid time window rejected',True)
  page.locator('[data-rail-quick="06:00|12:00"]').click()
  with page.expect_response(lambda r:r.url.endswith('/api/products')) as got:page.locator('[data-rail-prepare]').click()
  b=got.value.json();check('train search carries current exact window',b['request']['after']=='06:00' and b['request']['before']=='12:00' and b['request']['date'] is None)
  page.screenshot(path=str(OUT/'rail-service-dialog.png'),full_page=True);page.locator('[data-extension-close]').click()
  page.locator('[data-extension-dismiss="all"]').click();expect(page.locator('[data-extension-restore]')).to_have_count(1);check('optional services can be hidden',page.locator('[data-extension-open]').count()==0)
  page.locator('[data-extension-restore]').click();expect(page.locator('[data-extension-open]')).not_to_have_count(0)
  page.locator('[data-resolution="unsolved"]').first.click();expect(page.locator('[data-resolution="unsolved"]').first).to_have_attribute('aria-pressed','true');check('unresolved suppresses extension sales',page.locator('[data-extension-open]').count()==0)
  page.locator('[data-resolution="solved"]').first.click();expect(page.locator('[data-resolution="solved"]').first).to_have_attribute('aria-pressed','true');expect(page.locator('[data-extension-open]')).not_to_have_count(0)
  page.screenshot(path=str(OUT/'related-services.png'),full_page=True)
  page.locator('#nav-ops').click();expect(page.locator('#ops-cloud-login')).to_be_visible();page.locator('#ops-cloud-login [name=username]').fill('admin');page.locator('#ops-cloud-login [name=password]').fill('fixture-admin');page.locator('#ops-cloud-login button').click();expect(page.locator('.ops-top')).to_contain_text('管理员')
  page.locator('[data-ops-tab="harness"]').click();expect(page.locator('#skill-objectives')).to_be_visible();check('operator objective presets visible',page.locator('[data-skill-preset]').count()==3)
  with page.expect_response(lambda r:r.url.endswith('/api/ops') and r.request.method=='POST' and r.request.post_data_json.get('action')=='skill-preset') as got:page.locator('[data-skill-preset="coverage"]').click()
  c=got.value.json()['result'];check('preset automatically validated',c['evaluation']['passed']==c['evaluation']['total'] and 'evaluatorHash' in c['evaluation'])
  expect(page.locator('[data-skill-revalidate]')).to_have_count(1);check('candidate remains unpublished',c['status'] in ['accepted','failed'] and page.locator('#skill-form [name=topK]').input_value()=='8')
  with page.expect_response(lambda r:r.url.endswith('/api/ops') and r.request.method=='POST' and r.request.post_data_json.get('action')=='skill-revalidate') as got:page.locator('[data-skill-revalidate]').click()
  c=got.value.json()['result'];check('one click reruns and preserves evaluation history',len(c['evaluationHistory'])==1 and c['status']=='accepted')
  expect(page.locator('#ops-content')).to_contain_text('表达效果待核对');check('automatic gate not presented as semantic accuracy',True)
  page.screenshot(path=str(OUT/'operator-validation.png'),full_page=True)
  page.locator('#ops-close').click();page.locator('#nav-call').click();page.set_viewport_size({'width':390,'height':844});check('mobile viewport fits',page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'));page.screenshot(path=str(OUT/'mobile-services.png'),full_page=True)
  check('no uncaught browser exceptions',not errors);browser.close()
finally:
 server.terminate();server.wait(timeout=10);shutil.rmtree(runtime,ignore_errors=True)
 (OUT/'report.json').write_text(json.dumps({'checks':checks,'errors':errors,'scope':'Chromium and actual local API using deterministic upstream fixtures; no paid model, microphone, supplier or real-order acceptance.'},ensure_ascii=False,indent=2))
print(json.dumps({'passed':sum(c['passed'] for c in checks),'total':len(checks),'errors':errors}))
