"""Real HTTP on CI; --static renders built HTML when local browser navigation is unavailable.
Speech recognition/synthesis are controlled test doubles in BOTH modes. No real microphone.
"""
import os, sys, json, time, pathlib, tempfile, subprocess, hashlib, urllib.request, shutil, socket
from playwright.sync_api import sync_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence/v5.4';OUT.mkdir(parents=True,exist_ok=True)
static='--static' in sys.argv
checks=[]
def check(name,value):
    assert value, name
    checks.append({'name':name,'passed':True})
MOCK="""
window.__spoken=[];window.__recognizers=[];window.__cancelCount=0;
class U {constructor(text){this.text=text;}}
class R {constructor(){window.__recognizers.push(this);}start(){this.onstart?.();}abort(){this.onend?.();}}
Object.defineProperty(window,'SpeechSynthesisUtterance',{value:U,configurable:true});
Object.defineProperty(window,'SpeechRecognition',{value:R,configurable:true});
Object.defineProperty(window,'speechSynthesis',{value:{speak(u){window.__spoken.push(u);},cancel(){window.__cancelCount++;}},configurable:true});
window.__finish=()=>window.__spoken.at(-1)?.onend?.();
window.__say=(text,final=true)=>{const r=window.__recognizers.at(-1);const result=Object.assign([{transcript:text}],{isFinal:final});r?.onresult?.({resultIndex:0,results:[result]});};
"""
server=None;runtime=None
with socket.socket() as sock:
    sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
base_url=f'http://127.0.0.1:{port}'
if not static:
    runtime=tempfile.mkdtemp(prefix='vc5-browser-')
    users={}
    for i in range(1,6):
        salt=os.urandom(16).hex()
        users[f'reviewer{i}']={'salt':salt,'hash':hashlib.scrypt(f'test-review-{i}'.encode(),salt=salt.encode(),n=16384,r=8,p=1,dklen=32).hex()}
    env={**os.environ,'PORT':str(port),'ADMIN_PASSWORD':'test-admin','LOCAL_DATA_DIR':runtime,'REVIEWERS_JSON':json.dumps(users)}
    server=subprocess.Popen(['node','v5/server.js'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    for _ in range(60):
        try:
            urllib.request.urlopen(base_url+'/api/v5/status',timeout=1);break
        except Exception:time.sleep(.2)
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,**({'executable_path':os.environ.get('CHROMIUM_PATH','/usr/bin/chromium')} if static or os.environ.get('CHROMIUM_PATH') else {}))
        page=browser.new_page(viewport={'width':1440,'height':1050})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        if static:
            page.evaluate(MOCK)
            page.set_content((ROOT/'dist/Visit_China_AI_V5_Demo.html').read_text(),wait_until='domcontentloaded')
        else:
            page.add_init_script(MOCK)
            page.goto(base_url,wait_until='networkidle')
            expect(page.locator('#mode')).to_contain_text('本机')
            check('browser connects to real Node backend','本机' in page.locator('#mode').inner_text())
        check('LiveKit is honestly unavailable without configuration', page.locator('#voice-provider option[value=livekit]').evaluate('(el)=>el.disabled'))
        check('LiveKit connection code is loaded', page.evaluate("typeof TravelRealtime.Call==='function'"))
        page.locator('#voice-provider').select_option('browser')
        page.locator('#voice-language').select_option('en-US')
        check('call entry visible',page.locator('#start-call').is_visible())
        page.screenshot(path=str(OUT/('static-desktop.png' if static else 'desktop.png')),full_page=True)
        page.locator('#start-call').click();page.locator('#consent-start').click()
        check('mic consent gate enforced',bool(page.locator('#consent-error').inner_text()))
        page.locator('#mic-consent').check();page.locator('#consent-start').click()
        page.wait_for_function("() => TravelApp.getCall().active")
        check('assistant initiates spoken question',page.evaluate("__spoken.length>0 && __spoken[0].text.includes('Where')"))
        check('call is speaking',page.evaluate("TravelApp.getCall().phase==='speaking'"))
        before=page.evaluate('__cancelCount')
        page.locator('[data-choice="city-sh"]').click()
        check('choice while TTS speaks changes city',page.evaluate("TravelApp.getState().facts.city==='Shanghai'"))
        check('choice cancels prior playback without hangup',page.evaluate(f'__cancelCount>{before} && TravelApp.getCall().active'))
        page.locator('[data-choice="planning"]').click()
        page.evaluate('__finish()')
        check('automatically listens after playback',page.evaluate("TravelApp.getCall().phase==='listening'"))
        page.evaluate("__say('My flight is',false)")
        check('interim transcript is displayed','My flight is' in page.locator('#interim').inner_text())
        page.evaluate("__say('My flight is booked, but I have not booked my hotel.',true)")
        page.wait_for_function("() => TravelApp.getState().facts.hotel==='not_booked'")
        check('final speech commits without Send',page.evaluate("TravelApp.getState().facts.flight==='booked'"))
        page.evaluate('__finish()');page.evaluate("__say('I also need to',false)")
        page.locator('[data-choice="taxi"]').click()
        check('choice during partial speech keeps an unsent draft',page.locator('#speech-draft').is_visible() and 'I also need to' in page.locator('#speech-draft-text').inner_text())
        check('partial speech does not create an invented fact',not page.evaluate("TravelApp.getState().history.some(h=>h.text==='I also need to')"))
        page.locator('#speech-draft-discard').click();page.locator('[data-choice="museums"]').click()
        check('understood needs stay visible','Flight:' in page.locator('#summary').inner_text())
        page.locator('#confirm').click()
        check('one-click confirmation updates task list','已确认' in page.locator('#confirmation').inner_text())
        check('call survives confirmation',page.evaluate('TravelApp.getCall().active'))
        page.screenshot(path=str(OUT/('static-call.png' if static else 'call.png')),full_page=True)
        page.locator('#message').fill('My hotel is booked. I am with my parents.');page.locator('#send').click()
        page.wait_for_function("() => TravelApp.getState().facts.hotel==='booked'")
        check('text during call preserves chosen transfer',page.evaluate("TravelApp.getState().facts.transfer==='taxi'"))
        check('relevant extension appears','luggage' in page.locator('#extensions').inner_text().lower())
        page.locator('#message').fill('Battery 3%, no internet');page.locator('#send').click()
        check('low power switches to readable help card',page.locator('#urgent').is_visible())
        check('low power pauses microphone',page.evaluate('TravelApp.getCall().muted'))
        check('low power suppresses upsells',page.locator('.extension').count()==0)
        page.locator('#hangup').click();check('hangup stops call',not page.evaluate('TravelApp.getCall().active'))
        page.locator('#message').fill('Battery 80%, online now');page.locator('#send').click()
        page.locator('#nav-guides').click()
        check('publisher guide and original link are shown',page.locator('#guides-list .guide').count()>=5)
        check('official photo is opt-in',page.locator('[data-photo]').count()>=1)
        page.locator('#guides-close').click()
        page.locator('#nav-ops').click()
        if static:
            check('static page does not impersonate authentic reviewers','不能冒充' in page.locator('#ops-body').inner_text())
        else:
            page.locator('#ops-password').fill('test-admin');page.locator('#ops-login').click();page.wait_for_selector('#ops-propose')
            check('real admin login loads operations',page.locator('#ops-propose').is_enabled())
            page.locator('#ops-propose').click();page.wait_for_selector('.candidate')
            check('candidate is explicitly template without model key','template' in page.locator('.candidate').inner_text())
            page.locator('[data-action="evaluate"]').click();expect(page.locator('.candidate')).to_contain_text('通过')
            check('author cannot approve',page.locator('[data-action="approve"]').is_disabled())
            for i in range(1,6):
                page.locator('#ops-logout').click();page.wait_for_selector('#ops-login')
                page.locator('#ops-user').fill(f'reviewer{i}');page.locator('#ops-password').fill(f'test-review-{i}');page.locator('#ops-login').click()
                page.wait_for_selector('[data-action="approve"]');page.locator('[data-action="approve"]').click()
                expect(page.locator('.candidate')).to_contain_text(f'{i}/5')
                if i<5:check(f'{i} approval(s) cannot publish','published' not in page.locator('.candidate .status').inner_text())
            check('fifth distinct login publishes exact candidate',page.locator('.candidate .status').inner_text()=='published')
            check('active policy version is updated','wf-2' in page.locator('#ops-body').inner_text())
            page.screenshot(path=str(OUT/'operations.png'),full_page=True)
            page.locator('#ops-logout').click();page.locator('#ops-user').fill('admin');page.locator('#ops-password').fill('test-admin');page.locator('#ops-login').click()
            page.wait_for_selector('[data-action="rollback"]');page.once('dialog',lambda d:d.accept());page.locator('[data-action="rollback"]').click()
            expect(page.locator('.candidate .status')).to_have_text('rolled_back')
            check('admin rollback works','wf-3' in page.locator('#ops-body').inner_text())
        page.locator('#ops-close').click()
        check('conversation is expanded by default',page.locator('#transcript').is_visible())
        check('voice transcript and assistant replies are visible',page.locator('#transcript .user').count()>0 and page.locator('#transcript .companion').count()>0)
        opening=page.locator('#initial-request').inner_text()
        check('opening need survives unrelated later turns','flight' in opening.lower())
        if not static:
            expected=page.locator('#transcript').inner_text()
            page.reload();expect(page.locator('#mode')).to_contain_text('本机')
            check('server rehydration restores both sides of conversation',page.locator('#transcript').inner_text()==expected)
            check('server rehydration restores opening need',page.locator('#initial-request').inner_text()==opening)
        page.set_viewport_size({'width':390,'height':844})
        check('mobile has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'))
        page.screenshot(path=str(OUT/('static-mobile.png' if static else 'mobile.png')),full_page=True)
        check('no uncaught browser exceptions',not errors)
        if not static:
            offline=browser.new_page(viewport={'width':1000,'height':900})
            offline.route('**/api/v5/**',lambda route:route.fulfill(status=503,content_type='application/json',body='{"error":"NO_BACKEND"}'))
            offline.goto(base_url);expect(offline.locator('#mode')).to_contain_text('浏览器体验')
            offline.locator('#message').fill('I want a trip to Shanghai with my parents. I need a hotel.');offline.locator('#send').click()
            offline.locator('#remember').check()
            saved=offline.locator('#transcript').inner_text();brief=offline.locator('#initial-request').inner_text()
            offline.reload();expect(offline.locator('#mode')).to_contain_text('浏览器体验')
            check('static browser memory restores both sides',offline.locator('#transcript').inner_text()==saved)
            check('static browser memory restores opening need',offline.locator('#initial-request').inner_text()==brief)
            offline.locator('#message').fill('Actually Beijing');offline.locator('#send').click()
            check('correction updates current city but preserves opening request','Beijing' in offline.locator('#summary').inner_text() and offline.locator('#initial-request').inner_text()==brief)
            offline.locator('#remember').uncheck();offline.reload()
            check('forgetting browser memory removes saved conversation',offline.locator('#transcript .user').count()==0)
            offline.close()
        browser.close()
finally:
    if server:server.terminate();server.wait(timeout=10)
    if runtime:
        resolved=pathlib.Path(runtime).resolve()
        assert resolved.parent==pathlib.Path(tempfile.gettempdir()).resolve() and resolved.name.startswith('vc5-browser-')
        shutil.rmtree(resolved,ignore_errors=True)
report={'passed':len(checks),'checks':checks,'scope':('Built standalone HTML rendered via set_content; no HTTP integration.' if static else 'Real Chromium -> Node HTTP. Five separate authenticated test accounts; NOT five real reviewers.')+' Speech APIs are synthetic test doubles, not microphone or spoken-audio validation. No paid model, booking, or provider inventory calls.'}
(OUT/('static-browser-report.json' if static else 'browser-report.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'browserChecksPassed':len(checks),'static':static}))
