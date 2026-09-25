import json,pathlib,time,subprocess,socket,tempfile,shutil,os,urllib.request,atexit
from playwright.sync_api import sync_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE=ROOT.parent;OUT=ROOT/'evidence/v6.2/browser';OUT.mkdir(parents=True,exist_ok=True);checks=[];errors=[];requests=[]
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
runtime=tempfile.mkdtemp(prefix='vc62-browser-');URL='http://127.0.0.1:'+str(port)
server=subprocess.Popen(['node','v5/v62-browser-fixture.cjs'],cwd=ROOT,env={**os.environ,'PORT':str(port),'LOCAL_DATA_DIR':runtime},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def cleanup():
 server.terminate();server.wait(timeout=10)
 resolved=pathlib.Path(runtime).resolve();assert resolved.parent==pathlib.Path(tempfile.gettempdir()).resolve() and resolved.name.startswith('vc62-browser-');shutil.rmtree(resolved,ignore_errors=True)
atexit.register(cleanup)
for _ in range(80):
 try:urllib.request.urlopen(URL+'/api/chat',timeout=1);break
 except Exception:time.sleep(.2)

def check(name,value=True):
 checks.append({'name':name,'passed':bool(value)});assert value,name
with sync_playwright() as p:
 browser=p.chromium.launch();page=browser.new_page(viewport={'width':1536,'height':1050});page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:requests.append(r.post_data_json) if r.method=='POST' and r.url.endswith('/api/chat') else None)
 try:
  page.goto(URL);expect(page.locator('#shared-model-status')).to_contain_text('DeepSeek')
  page.locator('#chat-settings-open').click();check('model mode defaults Auto',page.locator('#model-mode').input_value()=='auto');page.locator('#model-mode').select_option('pro');page.locator('#shared-model-close').click();page.reload();page.locator('#chat-settings-open').click();check('manual mode persists',page.locator('#model-mode').input_value()=='pro');page.locator('#model-mode').select_option('auto');page.locator('#shared-model-close').click()
  page.locator('#nav-ops').click();password='fixture-admin';page.locator('#ops-cloud-login [name=username]').fill('admin');page.locator('#ops-cloud-login [name=password]').fill(password);page.locator('#ops-cloud-login button').click();expect(page.locator('.ops-top')).to_contain_text('管理员');check('admin login')
  page.locator('[data-ops-tab=harness]').click();expect(page.locator('#ops-content')).to_contain_text('12,000');check('Loop full sample controls visible');page.screenshot(path=str(OUT/'V6_2_Loop全样本.png'),full_page=True)
  page.locator('#ops-close').click();page.locator('#chat-settings-open').click();page.locator('#cloud-admin-connect').click();expect(page.locator('#shared-model-dialog')).not_to_be_visible();check('admin private DeepSeek connection')
  page.locator('#message').fill('我想去长宁区旅游，吃饭和住宿也加进路线');page.locator('#send').click();expect(page.locator('.theme-itinerary')).to_be_visible(timeout=15000);plan=page.locator('.theme-itinerary').last;expect(plan).to_contain_text('愚园路');expect(plan).to_contain_text('中山公园');check('sourced district route visible');check('itinerary hotel phone',plan.locator('a[href^="tel:"]').count()>0);check('timestamps and real map links',plan.locator('time').count()>=3 and plan.locator('a[href*="amap"]').count()>0)
  with page.expect_download() as dl:plan.locator('[data-format=markdown]').click()
  dl.value.save_as(OUT/'V6_2_长宁行程示例.md');check('itinerary export includes sources','https://' in (OUT/'V6_2_长宁行程示例.md').read_text(encoding='utf-8'))
  page.set_viewport_size({'width':390,'height':844});check('mobile itinerary has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));page.screenshot(path=str(OUT/'V6_2_手机路线.png'),full_page=True);page.set_viewport_size({'width':1536,'height':1050})
  plan.locator('[data-route-start]').fill('11:30');page.wait_for_function("()=>TravelApp.getState().history.at(-1).assistance?.intent?.startTime==='11:30'");check('time adjustment sends contextual request');check('Auto chooses Pro',requests[-1]['modelMode']=='auto' and page.evaluate("TravelApp.getState().history.at(-1).assistance.modelRouting.selected")== 'pro')
  page.locator('#message').fill('慢速测试：从浦东机场到上海站坐地铁');page.locator('#send').click();page.wait_for_function('()=>TravelApp.getState().history.at(-1).aiPending===true');old=page.evaluate('TravelApp.getState().revision');page.locator('#message').fill('补充一下，我还想去长宁区逛逛');expect(page.locator('#model-progress')).to_contain_text('暂停旧回答');check('typing pauses old generation',not page.locator('#message').is_disabled());page.locator('#send').click();page.wait_for_function('()=>!!TravelApp.getState().history.at(-1).assistance');time.sleep(6.5);check('late output cannot replace new context',page.evaluate('(old)=>!TravelApp.getState().history.find(h=>h.revision===old).assistance',old));check('followup request retains both turns',len(requests[-1]['memory']['history'])>=2)
  # Synthetic browser recognition events exercise actual app controller callbacks.
  page.evaluate('''()=>{window.__recs=[];class Rec{constructor(){__recs.push(this)}start(){this.onstart?.()}abort(){}stop(){this.onend?.()}};window.SpeechRecognition=Rec;window.SpeechSynthesisUtterance=class{constructor(t){this.text=t}};Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},speak(u){window.__utterance=u},getVoices(){return[]}}});}''')
  page.locator('#voice-provider').select_option('browser');page.locator('#start-call').click();page.locator('#mic-consent').check();page.locator('#consent-start').click();page.wait_for_function('()=>TravelApp.getCall().active');page.locator('#interrupt').click();before=page.evaluate('TravelApp.getState().history.length')
  for idx,text in enumerate(['我想从浦东机场出发','然后去上海火车站','帮我看看地铁怎么换乘']):
   page.evaluate('''({idx,text})=>{window.__parts=window.__parts||[];__parts[idx]=Object.assign([{transcript:text}],{isFinal:true});__recs.at(-1).onresult({resultIndex:idx,results:__parts});}''',{'idx':idx,'text':text});time.sleep(1.5);check('natural pause does not send phrase '+str(idx),page.evaluate('TravelApp.getState().history.length')==before)
  page.wait_for_function('(n)=>TravelApp.getState().history.length===n+1',arg=before,timeout=8000);check('three phrases saved in a single turn','换乘' in page.evaluate('TravelApp.getState().history.at(-1).text'))
  page.wait_for_function('()=>TravelApp.getCall().phase==="speaking"',timeout=15000);page.evaluate('''()=>{const c=__recs.at(-1);c.onresult({resultIndex:0,results:[Object.assign([{transcript:'不是，我其实想去长宁区旅游'}],{isFinal:true})]});}''');check('automatic barge-in stops playback',page.evaluate('TravelApp.getCall().phase')!='speaking');page.wait_for_function('()=>TravelApp.getState().history.at(-1).text.includes("其实想去长宁")',timeout=8000);check('barge-in saved without Interrupt button');page.locator('#hangup').click();check('hangup stops recorder',page.evaluate('!TravelApp.getCall().active'))
  page.locator('#nav-library').click();page.locator('#library-query').fill('JCB');page.locator('#library-search').evaluate('(f)=>f.requestSubmit()');expect(page.locator('#library-results')).to_contain_text('JCB');page.locator('#library-results [data-source-detail]').first.click();expect(page.locator('#source-detail')).to_contain_text('获取正文');check('source self-assessment entry available')
  check('no uncaught browser errors',not errors)
 finally:
  (OUT/'V6_2_界面验收.json').write_text(json.dumps({'checks':checks,'errors':errors,'scope':'Local browser with fixture model and synthetic recognition events, not human microphone quality.'},ensure_ascii=False,indent=2),encoding='utf-8');browser.close()
print(json.dumps({'passed':len(checks),'errors':errors}))
