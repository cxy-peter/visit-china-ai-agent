"""V6 browser acceptance: real auth/store/RAG, fully controlled upstream HTTP."""
import os,json,pathlib,socket,tempfile,subprocess,time,urllib.request,shutil,hashlib
from playwright.sync_api import sync_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/v6.1/legacy-browser';OUT.mkdir(parents=True,exist_ok=True)
IMAGES=ROOT.parent/'v6.1-legacy-browser';IMAGES.mkdir(parents=True,exist_ok=True)
runtime=pathlib.Path(tempfile.mkdtemp(prefix='vc6-browser-'));checks=[];errors=[];failure=None
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
URL=f'http://127.0.0.1:{port}';password='fixture-operations-password';code='fixture-private-access-code-long-enough'
users={n:{'role':'admin' if n=='admin' else 'reviewer','salt':'fixture','hash':hashlib.scrypt(password.encode(),salt=b'fixture',n=16384,r=8,p=1,dklen=32).hex()} for n in ['admin','reviewer1']}
env={**os.environ,'CLOUD_OPERATIONS':'1','LOCAL_DATA_DIR':str(runtime),'PORT':str(port),'OPS_USERS_JSON':json.dumps(users),'OPS_SESSION_SECRET':'fixture-session-secret-long-enough','TRAVEL_CHAT_ACCESS_CODE':code,'DEEPSEEK_API_KEY':'fixture-model-key'}
for key in ['BLOB_STORE_ID','BLOB_READ_WRITE_TOKEN','VERCEL']:env.pop(key,None)
fixture="""
const fs=require('node:fs'),path=require('node:path');
const sourceUrl=require('./v5/library').get('off-c2e38d96499bada3').url;
const robotsUrl=new URL('/robots.txt',sourceUrl).href,requests=[];
global.fetch=async(url,opts)=>{
 const href=String(url),model=new URL(href).hostname==='api.deepseek.com';
 const kind=model?'model':href===robotsUrl?'robots':href===sourceUrl?'source-unavailable':'unexpected';
 requests.push({kind,url:href});
 fs.writeFileSync(path.join(process.env.LOCAL_DATA_DIR,'fixture-fetches.json'),JSON.stringify(requests));
 if(kind==='robots')return new Response('',{status:404});
 // Exercise optional-body lookup failure while the reviewed library still answers.
 if(kind==='source-unavailable')return new Response('Fixture source temporarily unavailable',{status:503});
 if(!model)throw Error('UNEXPECTED_FIXTURE_FETCH');
 return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({intent:{kind:'charging',destination:'人民广场',city:'Shanghai'},confidence:.9,text:'商场、餐厅和地铁站可寻找共享充电宝租借柜。先核对费用及归还规则；可用余量请在服务商页面查询。',source_ids:['sh-power-bank']})}}],usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150}}));
};
const app=require('./v5/server').createApp();app.server.listen(Number(process.env.PORT),'127.0.0.1');
"""
server=subprocess.Popen(['node','-e',fixture],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def check(name,value=True):
 assert value,name
 checks.append({'name':name,'passed':True})
try:
 for _ in range(60):
  try:urllib.request.urlopen(URL+'/api/chat',timeout=1);break
  except Exception:time.sleep(.2)
 with sync_playwright() as p:
  browser=p.chromium.launch();page=browser.new_page(viewport={'width':1536,'height':1050});page.on('pageerror',lambda e:errors.append(str(e)));page.goto(URL)
  expect(page.locator('#mode')).to_contain_text('云端');expect(page.locator('#service-explorer')).to_contain_text('找附近服务')
  page.locator('#service-location').fill('人民广场');page.locator('[data-service-kind=charging]').click();expect(page.locator('#service-cards')).to_contain_text('人民广场');check('service explorer changes location and category without inserting conversation',page.locator('#turn-count').inner_text()=='0')
  check('power-bank map search honestly labels inventory missing','查询入口' in page.locator('#service-cards').inner_text() and '不证明' in page.locator('#service-cards').inner_text())
  page.locator('[data-demo=hotel]').click();assert '酒店' in page.locator('#message').input_value();check('demo only fills editable composer, never sends a fake traveler message',page.locator('#turn-count').inner_text()=='0');page.locator('#message').fill('')
  page.locator('#chat-settings-open').click();page.locator('#cloud-access-code').fill('incorrect-code');page.locator('#cloud-login button').click();expect(page.locator('#cloud-access-note')).to_contain_text('体验码不正确');check('bad access code receives a recovery instruction')
  page.locator('#cloud-access-file').set_input_files({'name':'private-code.txt','mimeType':'text/plain','buffer':('私人体验码\n\n'+code+'\n\n请在页面连接').encode()});expect(page.locator('#cloud-access-note')).to_contain_text('本机读取');check('document import fills only password input',page.locator('#cloud-access-code').input_value()==code and code not in page.locator('#shared-model-dialog').inner_text())
  page.locator('#cloud-login button').click();expect(page.locator('#shared-model-dialog')).not_to_be_visible();expect(page.locator('#shared-model-status')).to_contain_text('云端对话中')
  page.locator('#message').fill('上海共享充电宝怎么租')
  with page.expect_response(lambda r:r.url==URL+'/api/chat' and r.request.method=='POST' and r.request.post_data_json.get('action')=='answer',timeout=15000) as result:page.locator('#send').click()
  response=result.value;answer=response.json();assert response.ok and not answer.get('error'),{'status':response.status,'error':answer.get('error')}
  assert answer['answer']['sourceAcquisition']['status']=='review-required','Unavailable optional source must remain held'
  expect(page.locator('.assistant-answer')).to_contain_text('租借柜');expect(page.locator('.answer-services')).to_contain_text('官方指引');check('automatic RAG answers without selected source',page.evaluate('TravelApp.getSourceIds().length')==0)
  page.locator('.answer-evidence summary').click();expect(page.locator('.answer-evidence')).to_contain_text('共享充电宝');check('answer expands source evidence inline')
  check('one merged feedback control',page.locator('[data-csat]').count()==0);page.locator('[data-resolution=solved]').click();expect(page.locator('[data-resolution=solved]')).to_have_attribute('aria-pressed','true');check('single helpful-and-solved feedback is saved')
  page.locator('#nav-ops').click();page.locator('#ops-cloud-login [name=username]').fill('admin');page.locator('#ops-cloud-login [name=password]').fill(password);page.locator('#ops-cloud-login button').click();expect(page.locator('.ops-top')).to_contain_text('管理员');expect(page.locator('.ops-health')).to_contain_text('用户确认解决');expect(page.locator('#ops-content')).to_contain_text('样本不足');check('quality overview shows real denominators and insufficient-sample status')
  page.screenshot(path=str(IMAGES/'operations-quality-desktop.png'),full_page=True)
  page.locator('[data-ops-tab=harness]').click();page.locator('#skill-form [name=topK]').fill('10');page.locator('#skill-form button').click();expect(page.locator('.skill-release')).to_contain_text('21 / 21');check('saving a skill automatically runs acceptance')
  # V6.6 opens the latest pending review automatically. Never toggle it closed.
  expect(page.locator('[data-skill-publish]')).to_be_visible()
  check('pending review publication is visible without forced clicks')
  page.once('dialog',lambda dialog:dialog.dismiss());page.locator('[data-skill-publish]').click()
  check('dismissing human confirmation does not publish',page.locator('[data-skill-rollback]').count()==0 and page.locator('#skill-form [name=topK]').input_value()=='8')
  page.once('dialog',lambda dialog:dialog.accept());page.locator('[data-skill-publish]').click();expect(page.locator('#ops-status')).to_contain_text('已发布');check('admin publishes accepted exact skill version')
  if not page.locator('[data-skill-rollback]').is_visible():page.locator('.skill-release summary').click()
  expect(page.locator('[data-skill-rollback]')).to_be_visible();page.locator('[data-skill-rollback]').click();expect(page.locator('#ops-status')).to_contain_text('恢复上一版');check('published skill has working rollback')
  page.screenshot(path=str(IMAGES/'operations-harness-desktop.png'),full_page=True)
  page.locator('[data-ops-tab=retrieval]').click();page.locator('#rag-preview-form [name=query]').fill('上海共享充电宝');page.locator('#rag-preview-form button').click();expect(page.locator('#rag-preview-result')).to_contain_text('sh-power-bank');expect(page.locator('#rag-preview-result')).to_contain_text('RRF');check('retrieval lab returns actual scored chunks and source versions')
  expect(page.locator('.execution-row')).to_have_count(1);page.locator('.execution-row > summary').click();expect(page.locator('.execution-row')).to_contain_text('skill-1');expect(page.locator('.execution-row')).to_contain_text('persisted');check('chat execution is visible after separate persistent operations read')
  page.screenshot(path=str(IMAGES/'operations-retrieval-desktop.png'),full_page=True)
  page.locator('#ops-close').click();page.locator('#chat-settings-open').click();page.locator('#cloud-logout').click();page.locator('#cloud-admin-connect').click();expect(page.locator('#shared-model-dialog')).not_to_be_visible();check('same authenticated admin can reconnect model without retyping access code',page.evaluate('TravelApp.getBackend().authorized'))
  page.locator('#new-chat-top').click();page.locator('#output-language').select_option('en');expect(page.locator('#service-explorer')).to_contain_text('Find nearby services');check('services switch English output labels')
  page.set_viewport_size({'width':390,'height':844});page.locator('[data-service-kind=hotel]').click();check('mobile layout has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));page.screenshot(path=str(IMAGES/'services-mobile.png'),full_page=True)
  requests=json.loads((runtime/'fixture-fetches.json').read_text(encoding='utf-8'));assert not any(r['kind']=='unexpected' for r in requests),'Unmocked upstream request'
  assert any(r['kind']=='source-unavailable' for r in requests),'Optional source failure fixture was not exercised'
  check('browser has no uncaught JavaScript errors',not errors);browser.close()
except Exception as exc:
 failure=str(exc)
 raise
finally:
 server.terminate();server.wait(timeout=10)
 requests=json.loads((runtime/'fixture-fetches.json').read_text(encoding='utf-8')) if (runtime/'fixture-fetches.json').exists() else []
 (OUT/'harness-browser-report.json').write_text(json.dumps({'checks':checks,'errors':errors,'failure':failure,'upstreamRequests':requests,'scope':'Local server/auth/persistent store with fixture model and source HTTP; no paid or external network call'},ensure_ascii=False,indent=2),encoding='utf-8')
 assert runtime.resolve().parent==pathlib.Path(tempfile.gettempdir()).resolve() and runtime.name.startswith('vc6-browser-');shutil.rmtree(runtime)
print(json.dumps({'passed':len(checks),'errors':errors}))
