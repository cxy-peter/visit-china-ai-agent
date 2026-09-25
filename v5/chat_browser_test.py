"""Chat-first, preference isolation, bilingual offers and fare UX. Mock media only."""
import json, os, pathlib, shutil, socket, subprocess, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/('evidence/v5.8/hosted' if os.environ.get('CHAT_TEST_URL') else 'evidence/v5.8');OUT.mkdir(parents=True,exist_ok=True)
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
runtime=tempfile.mkdtemp(prefix='vc54-chat-');server=None;checks=[]
def check(name,result):
    assert result,name
    checks.append({'name':name,'passed':True})
try:
    server=subprocess.Popen(['node','v5/server.js'],cwd=ROOT,env={**os.environ,'PORT':str(port),'LOCAL_DATA_DIR':runtime},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL) if not os.environ.get('CHAT_TEST_URL') else None
    url=f'http://127.0.0.1:{port}'
    if os.environ.get('CHAT_TEST_URL'):url=os.environ['CHAT_TEST_URL'].rstrip('/')
    for _ in range(60) if server else []:
        try:urllib.request.urlopen(url+'/api/v5/status',timeout=1);break
        except Exception:time.sleep(.2)
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True);page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url);expect(page.locator('#mode')).to_contain_text('云端聊天后端' if os.environ.get('CHAT_TEST_URL') else '本机')
        def send(text):page.locator('#message').fill(text);page.locator('#send').click()
        check('chat greets without microphone consent',page.locator('#transcript .companion').count()==1 and not page.evaluate('TravelApp.getCall().active'))
        check('entry does not scroll the top controls off screen',page.evaluate('scrollY<2'))
        check('composer visible on desktop',page.locator('#message').bounding_box()['y']<950)
        page.locator('#output-language').select_option('zh')
        page.locator('#preference-options [data-pref-value=economy]').click();page.locator('#keep-preferences').check()
        send('我计划和父母去上海，需要酒店、机票、高铁票，还要推荐饭店。')
        expect(page.locator('.offer-group')).to_have_count(4)
        check('four offer types follow the relevant assistant bubble',page.locator('#transcript .companion .offer-group').count()==4)
        check('each offer group is explicitly simulated',page.locator('.offer-warning').count()==4 and '非实时' in page.locator('.offer-warning').first.inner_text())
        check('current needs and opening request are visible','上海' in page.locator('#initial-request').inner_text() and page.locator('.need-badge').count()>=4)
        check('preference changes sample hotel budget','320' in page.locator('.offer-group').filter(has_text='住宿待安排').inner_text())
        page.screenshot(path=str(OUT/'chat-cards-desktop.png'),full_page=True)
        opening=page.locator('#initial-request').inner_text()
        page.locator('#output-language').select_option('en');send('我还想去博物馆。')
        check('Chinese input can produce English replies',page.evaluate('TravelApp.getState().language')=='en' and not any('\u4e00'<=c<='\u9fff' for c in page.locator('#transcript .companion').last.locator('p').first.inner_text()))
        check('first large need remains after later requests',page.locator('#initial-request').inner_text()==opening)
        page.locator('#output-language').select_option('zh');send('在上海打车20公里大概多少钱？')
        page.locator('[data-taxi-km="20"]').click();expect(page.locator('#taxi-result')).to_contain_text('66.65')
        check('spoken-distance pattern pre-fills fare form',page.locator('#taxi-km').input_value()=='20' and page.locator('#taxi-city').input_value()=='Shanghai')
        check('fare estimate exposes official source and scope','jtw.sh.gov.cn' in page.locator('#taxi-result a[href*="jtw.sh.gov.cn"]').get_attribute('href') and '日间' in page.locator('#taxi-scope').inner_text())
        page.screenshot(path=str(OUT/'taxi-estimate.png'))
        page.locator('#taxi-close').click()
        page.locator('#new-chat-top').click();expect(page.locator('#transcript .user')).to_have_count(0)
        check('new chat removes old destination, tasks, opening request and all cards',page.evaluate('!TravelApp.getState().facts.city && !TravelApp.getState().tasks.length && !TravelApp.getState().initialRequest') and page.locator('.offer-group').count()==0)
        check('new chat retains only opted-in preferences',page.evaluate("TravelApp.getState().preferences.budget==='economy'"))
        send('从纽约到波士顿，想看火车票和饭店。');expect(page.locator('.offer-group')).to_have_count(2)
        check('Boston rail uses correct provider',page.locator('.offer-link[href*="amtrak.com"]').count()==1)
        page.locator('#keep-preferences').uncheck();page.locator('#new-chat-top').click();expect(page.locator('#transcript .user')).to_have_count(0)
        check('new chat clears preferences when carry-over is off',page.evaluate('Object.keys(TravelApp.getState().preferences).length===0'))
        send('Shanghai hotel please');page.on('dialog',lambda d:d.accept());page.locator('#reset-chat-top').click();expect(page.locator('#transcript .user')).to_have_count(0)
        check('reset leaves a fresh open chat',page.locator('#transcript .companion').count()==1 and not page.evaluate('TravelApp.getCall().active'))
        page.set_viewport_size({'width':390,'height':844});page.locator('#preferences-open').click();page.locator('#preferences-mobile [data-pref-value=relaxed]').click();page.locator('#preferences-close').click()
        check('mobile preference controls update the same shared state',page.evaluate("TravelApp.getState().preferences.pace==='relaxed'"))
        send('我需要酒店');check('mobile has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'))
        page.screenshot(path=str(OUT/'chat-mobile.png'),full_page=True)
        page.set_viewport_size({'width':1440,'height':1000});page.locator('#new-chat-top').click()
        send('从虹桥火车站坐地铁去豫园怎么走？')
        expect(page.locator('.metro-card')).to_have_count(1)
        check('metro guide separates rail station from airport',page.evaluate("!TravelApp.getState().facts.airport") and page.locator('.offer-group').count()==0)
        check('Yuyuan metro diagram is visible',page.locator('.metro-map').is_visible() and '10' in page.locator('.metro-map').text_content())
        page.locator('[data-metro-origin=lujiazui]').click()
        check('origin selection creates a traceable new route turn',page.locator('.metro-card').count()==2 and '14' in page.locator('.metro-map').last.text_content())
        check('dated official network map and reusable skill are linked',page.locator('.metro-network').count()==2 and page.locator('a[href="skills/shanghai-metro-guide/SKILL.md"]').count()==2)
        check('composer does not repeat speech or settings',page.locator('.compose #interim').count()==0 and page.locator('.compose #remember').count()==0 and page.locator('.compose').bounding_box()['height']<100)
        check('desktop transcript is expanded',page.locator('#transcript').bounding_box()['height']>430)
        check('jump to latest is an overlay',page.locator('#jump-latest').evaluate("el=>getComputedStyle(el).position==='absolute'"))
        page.screenshot(path=str(OUT/'metro-conversation-desktop.png'),full_page=True)
        page.locator('#new-chat-top').click();page.locator('[data-demo=railout]').click()
        check('outbound Shanghai rail example follows conversation','上海虹桥 → 杭州东' in page.locator('.offer-group').inner_text())
        page.locator('#new-chat-top').click();page.locator('[data-demo=flight]').click()
        check('inbound flight example follows conversation','北京 → 上海' in page.locator('.offer-group').filter(has_text='模拟航班').inner_text())
        page.set_viewport_size({'width':390,'height':844});page.locator('#new-chat-top').click();send('从陆家嘴到豫园的地铁怎么走')
        check('mobile metro fits without horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'))
        page.screenshot(path=str(OUT/'metro-conversation-mobile.png'),full_page=True)
        check('no uncaught errors in chat workflow',not errors)
        browser.close()
finally:
    if server:server.terminate();server.wait(timeout=10)
    resolved=pathlib.Path(runtime).resolve();assert resolved.parent==pathlib.Path(tempfile.gettempdir()).resolve() and resolved.name.startswith('vc54-chat-');shutil.rmtree(resolved,ignore_errors=True)
(OUT/'chat-browser-report.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'scope':'Real Node HTTP and Chromium UI; no booking, microphone or paid model requests.'},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'chatChecksPassed':len(checks)}))
