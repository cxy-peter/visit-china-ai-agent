"""Unified source/chat UX on real Chromium + HTTP. Model response is an explicit test double."""
import json,os,pathlib,shutil,socket,subprocess,tempfile,time,urllib.request
from playwright.sync_api import sync_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
HOSTED=os.environ.get('LIBRARY_TEST_URL')
OUT=ROOT/('evidence/v6/hosted-library' if HOSTED else 'evidence/v6');OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def check(name,value):
    assert value,name
    checks.append({'name':name,'passed':True})
runtime=tempfile.mkdtemp(prefix='vc55-library-');server=None
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
try:
    if not HOSTED:
        fixture="""const {createApp}=require('./v5/server');const app=createApp({env:{ADMIN_PASSWORD:'test-admin',DEEPSEEK_API_KEY:'test-key-not-real'},runtimeDir:process.env.LOCAL_DATA_DIR,fetch:async(url,opts)=>{if(url!=='https://api.deepseek.com/chat/completions')throw Error('Unexpected provider');return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({intent:{kind:'other'},text:'可以按你的出行偏好，先核对地铁站点和出口。This is a test response.',source_ids:['sh-metro']})}}],usage:{prompt_tokens:50,completion_tokens:20,total_tokens:70}}));}});app.server.listen(Number(process.env.PORT),'127.0.0.1');"""
        server=subprocess.Popen(['node','-e',fixture],cwd=ROOT,env={**os.environ,'PORT':str(port),'LOCAL_DATA_DIR':runtime},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    url=HOSTED or f'http://127.0.0.1:{port}'
    if server:
        for _ in range(60):
            try:urllib.request.urlopen(url+'/api/v5/status',timeout=1);break
            except Exception:time.sleep(.2)
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True);page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url)
        expect(page.locator('#mode')).to_contain_text('云端聊天后端' if HOSTED else '本机')
        def send(text):page.locator('#message').fill(text);page.locator('#send').click()
        send('我计划和父母去上海，机票已经订好，想看看地铁怎么坐。')
        expect(page.locator('#transcript .user')).to_have_count(1)
        before=page.evaluate('TravelApp.getState()')
        page.locator('#nav-library').click();expect(page.locator('#library-workspace')).to_be_visible()
        check('library stays in same tab and shows current request',len(page.context.pages)==1 and '父母' in page.locator('#library-context').inner_text())
        check('full catalog preserves honest index and summary counts','1,114' in page.locator('#library-count').inner_text() and '索引不等于已核验' in page.locator('.library-metrics').inner_text())
        page.locator('#library-query').fill('地铁');page.locator('#library-city').select_option('Shanghai');page.locator('#library-kind').select_option('summary');page.locator('#library-search button').click()
        check('Chinese search retrieves curated metro source',page.locator('#library-results [data-source-detail="sh-metro"]').count()==1)
        page.locator('#library-results [data-source-detail="sh-metro"]').click();expect(page.locator('#source-detail')).to_contain_text('发布方')
        check('source drawer keeps original URL and review status','english.shanghai.gov.cn' in page.locator('#source-detail a').get_attribute('href') and '复核' in page.locator('#source-detail').inner_text())
        page.screenshot(path=str(OUT/'unified-library-desktop.png'),full_page=True)
        page.locator('[data-source-ask="sh-metro"]').click();expect(page.locator('#travel-workspace')).to_be_visible()
        check('browsing and attaching a source does not mutate traveler facts',page.evaluate('TravelApp.getState().facts')==before['facts'])
        page.locator('#send').click();expect(page.locator('#transcript .user')).to_have_count(2)
        check('source references belong to each turn',page.evaluate("TravelApp.getState().history.at(-1).sourceIds[0]==='sh-metro'") and page.locator('.turn-sources').last.is_visible())
        check('opening request is preserved after source question','父母' in page.locator('#initial-request').text_content())
        page.locator('#shared-model-open').click();expect(page.locator('#shared-model-dialog')).to_be_visible()
        if HOSTED:
            check('hosted model status identifies deployed cloud backend','云端接口' in page.locator('#shared-model-detail').inner_text());page.locator('#shared-model-close').click()
        else:
            page.locator('#model-settings-open').click();page.locator('#ops-password').fill('test-admin');page.locator('#ops-login').click();expect(page.locator('#ops-body')).to_contain_text('当前工作流');page.locator('#ops-close').click()
            page.locator('#shared-model-open').click();page.locator('#shared-model-consent').check();page.locator('#shared-model-close').click()
            expect(page.locator('.assistant-answer')).to_have_count(1)
            check('one shared consent enables model response inside existing conversation','This is a test response.' in page.locator('.assistant-answer').inner_text() and page.locator('#model-consent').is_checked())
            check('model citations link back to the same source drawer','AI 引用' in page.locator('.turn-sources').last.inner_text())
            page.evaluate("TravelApp.commit({type:'text',text:'我在上海，继续看看地铁',channel:'text'})")
            expect(page.locator('.assistant-answer')).to_have_count(2)
            check('later turns preserve earlier model answer',page.locator('.assistant-answer').count()==2)
            page.evaluate('''() => {
              window.__said=[];
              class U {constructor(text){this.text=text;}}
              class R {constructor(){window.__recognizer=this;}start(){}abort(){}}
              Object.defineProperty(window,'SpeechSynthesisUtterance',{value:U,configurable:true});
              Object.defineProperty(window,'SpeechRecognition',{value:R,configurable:true});
              Object.defineProperty(window,'speechSynthesis',{value:{speak(u){__said.push(u.text);setTimeout(()=>u.onend?.(),20);},cancel(){}},configurable:true});
            }''')
            page.locator('#voice-provider').select_option('browser');page.locator('#start-call').click();page.locator('#mic-consent').check();page.locator('#consent-start').click()
            expect(page.locator("#orb")).to_have_attribute("data-phase","listening")
            page.evaluate("__recognizer.onresult({resultIndex:0,results:[Object.assign([{transcript:'我在上海，想继续了解地铁'}],{isFinal:true})]})")
            expect(page.locator('.assistant-answer')).to_have_count(3)
            for _ in range(100):
                if page.evaluate("__said.some(t=>t.includes('This is a test response.'))"):break
                page.wait_for_timeout(50)
            assert page.evaluate("__said.some(t=>t.includes('This is a test response.'))")
            check('voice uses same source context and speaks shared model answer',page.evaluate("TravelApp.getState().history.at(-1).channel==='voice' && TravelApp.getState().history.at(-1).sourceIds[0]==='sh-metro'"))
            page.locator('#nav-library').click();check('active call remains controllable in source library',page.locator('#library-hangup').is_visible() and page.evaluate('TravelApp.getCall().active'))
            page.locator('#library-hangup').click();check('library hangup stops the same call',not page.evaluate('TravelApp.getCall().active'));page.locator('#library-back').click()
        page.screenshot(path=str(OUT/'unified-chat-desktop.png'),full_page=True)
        page.locator('#chat-settings-open').click();page.locator('#remember').check();page.reload();expect(page.locator('#transcript .user')).not_to_have_count(0)
        check('stored chat keeps per-turn source references',page.locator('.turn-sources').count()>=2)
        page.locator('#new-chat-top').click();expect(page.locator('#transcript .user')).to_have_count(0)
        check('new chat removes old references and answers',page.evaluate('TravelApp.getSourceIds().length===0') and page.locator('.turn-sources,.assistant-answer').count()==0)
        page.set_viewport_size({'width':390,'height':844});page.locator('#nav-library').click();page.locator('#library-kind').select_option('index');page.locator('#library-query').fill('');page.locator('#library-search button').click()
        check('index-only entries are visibly labeled','仅索引' in page.locator('#library-results').inner_text())
        page.locator('#library-results [data-source-detail]').first.click()
        check('source library fits mobile width',page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'))
        page.screenshot(path=str(OUT/'unified-library-mobile.png'),full_page=True)
        check('no uncaught browser errors',not errors)
        browser.close()
finally:
    if server:server.terminate();server.wait(timeout=10)
    resolved=pathlib.Path(runtime).resolve();assert resolved.parent==pathlib.Path(tempfile.gettempdir()).resolve() and resolved.name.startswith('vc55-library-');shutil.rmtree(resolved,ignore_errors=True)
(OUT/'library-browser-report.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'scope':'Real Chromium and local HTTP or public static site. DeepSeek provider is a test double; no paid API request and no human microphone test.'},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'libraryChecksPassed':len(checks)}))
