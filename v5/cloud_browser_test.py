"""Cloud UI contract with a controlled HTTP fixture. No paid provider requests."""
import json, os, pathlib, shutil, socket, subprocess, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence/v5.7';OUT.mkdir(parents=True,exist_ok=True)
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
runtime=tempfile.mkdtemp(prefix='vc56-cloud-');checks=[];pending=[];requests=[];authorized=False
def check(name,value):
    assert value,name
    checks.append({'name':name,'passed':True})
server=subprocess.Popen(['node','v5/server.js'],cwd=ROOT,env={**os.environ,'PORT':str(port),'LOCAL_DATA_DIR':runtime},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
    url=f'http://127.0.0.1:{port}'
    for _ in range(60):
        try:urllib.request.urlopen(url+'/api/v5/status',timeout=1);break
        except Exception:time.sleep(.2)
    with sync_playwright() as p:
        browser=p.chromium.launch();page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.route('**/api/v5/**',lambda r:r.fulfill(status=404,json={'error':'NOT_FOUND'}))
        def cloud(r):
            global authorized
            if r.request.method=='GET':r.fulfill(json={'backend':'vercel-chat','configured':True,'accessReady':True,'authorized':authorized});return
            b=r.request.post_data_json;requests.append(b)
            if b['action']=='login':authorized=True;r.fulfill(json={'authorized':True});return
            if b['action']=='logout':authorized=False;r.fulfill(json={'authorized':False});return
            pending.append(r)
        page.route('**/api/chat',cloud);page.goto(url);expect(page.locator('#mode')).to_contain_text('云端聊天后端')
        page.locator('#message').fill('我想带父母慢慢游览上海');page.locator('#send').click()
        check('private model waits for connection and consent',not pending and not requests)
        page.locator('#chat-settings-open').click();page.locator('#cloud-access-code').fill('fixture-private-code');page.locator('#cloud-login button').click()
        expect(page.locator('#model-progress')).to_contain_text('DeepSeek 正在')
        check('login explicitly enables one shared model consent',page.locator('#model-consent').is_checked() and page.locator('#shared-model-consent').is_checked())
        check('pending answer receives current context',len(pending)==1 and requests[-1]['memory']['facts']['city']=='Shanghai' and requests[-1]['modelConsent'])
        check('private code is cleared from form',page.locator('#cloud-access-code').input_value()=='')
        request=pending.pop();rev=request.request.post_data_json['revision'];request.fulfill(json={'revision':rev,'answer':{'mode':'deepseek','text':'这是服务端测试回答，可以安排轻松的行程。','sourceIds':[]}})
        expect(page.locator('.assistant-answer')).to_contain_text('服务端测试回答')
        check('model answer appears inside its conversation turn',page.locator('#messages .companion .assistant-answer').count()==1 and not page.locator('#model-progress').is_visible())
        page.reload();expect(page.locator('#mode')).to_contain_text('云端聊天后端')
        check('private consent survives same-tab refresh',page.locator('#model-consent').is_checked() and page.evaluate('TravelApp.getBackend().authorized'))
        page.locator('#message').fill('我需要上海地铁建议');page.locator('#send').click();expect(page.locator('#model-progress')).to_be_visible()
        # New chat aborts the pending generation and must not restore an old destination.
        stale=pending.pop();page.locator('#new-chat-top').click();expect(page.locator('#messages .user')).to_have_count(0)
        stale.fulfill(json={'answer':{'text':'stale answer','mode':'deepseek','sourceIds':[]}})
        check('reset discards in-flight model context',not page.evaluate('TravelApp.getState().facts.city') and page.locator('.assistant-answer').count()==0)
        page.locator('#message').fill('我想轻松慢游');page.locator('#send').click();expect(page.locator('#model-progress')).to_be_visible()
        failed=pending.pop();failed.fulfill(status=502,json={'error':'DEEPSEEK_HTTP_402'})
        expect(page.locator('#model-progress')).to_contain_text('余额不足')
        check('provider failure stays visible in conversation',page.locator('#model-progress').is_visible())
        page.locator('#chat-settings-open').click();page.locator('#cloud-logout').click();expect(page.locator('#cloud-login')).to_be_visible()
        check('logout disables cloud authorization',not page.evaluate('TravelApp.getBackend().authorized'))
        page.locator('#shared-model-close').click();page.reload();expect(page.locator('#mode')).to_contain_text('云端聊天后端')
        check('logout revokes model consent across reload',not page.locator('#model-consent').is_checked())
        check('no uncaught cloud UI errors',not errors)
        browser.close()
finally:
    server.terminate();server.wait(timeout=10)
    resolved=pathlib.Path(runtime).resolve();assert resolved.parent==pathlib.Path(tempfile.gettempdir()).resolve() and resolved.name.startswith('vc56-cloud-');shutil.rmtree(resolved,ignore_errors=True)
(OUT/'cloud-browser-report.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'scope':'Mock cloud HTTP contract. Actual production provider verification is reported separately.'},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'cloudChecksPassed':len(checks)}))
