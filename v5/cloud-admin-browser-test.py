"""Real browser, HTTP login and signed cookies; explicit fixture password, no paid API calls."""
import os, pathlib, shutil, socket, subprocess, time, urllib.request
from playwright.sync_api import sync_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
with socket.socket() as s:
    s.bind(('127.0.0.1',0)); port=s.getsockname()[1]
proc=subprocess.Popen(['node','tools/cloud-admin-browser-fixture.cjs'],cwd=ROOT,env={**os.environ,'PORT':str(port)})
try:
    url=f'http://127.0.0.1:{port}'
    for _ in range(60):
        try: urllib.request.urlopen(url,timeout=1); break
        except Exception: time.sleep(.1)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium') or None,headless=True)
        page=browser.new_page(); page.goto(url)
        expect(page.locator('#mode')).to_contain_text('云端聊天后端')
        page.locator('#shared-model-open').click()
        page.locator('#cloud-admin-connect').click()
        form=page.locator('#chat-admin-login'); expect(form).to_be_visible()
        form.locator('#chat-admin-password').fill('wrong-password'); form.locator('button').click()
        expect(page.locator('#cloud-access-note')).to_contain_text('账号或密码不正确')
        form.locator('#chat-admin-password').fill('demo2026'); form.locator('button').click()
        expect(page.locator('#shared-model-dialog')).not_to_be_visible()
        status=page.request.get(url+'/api/chat').json()
        assert status['authorized'] and status['adminConnectReady'] and not status['legacyAccessReady']
        page.reload(); expect(page.locator('#shared-model-open')).to_contain_text('DeepSeek')
        assert page.request.get(url+'/api/chat').json()['authorized']
        page.locator('#shared-model-open').click(); page.locator('#cloud-logout').click()
        assert not page.request.get(url+'/api/chat').json()['authorized']
        # Cookie rejection must never be presented as a successful connection.
        def lose_cookie(route):
            response=route.fetch(); headers=dict(response.headers); headers.pop('set-cookie',None)
            route.fulfill(response=response,headers=headers)
        page.route('**/api/chat',lose_cookie)
        page.locator('#shared-model-consent').check()
        page.locator('#cloud-admin-connect').click()
        expect(page.locator('#cloud-access-note')).to_contain_text('登录凭据未保存')
        expect(page.locator('#shared-model-dialog')).to_be_visible()
        browser.close()
        print('Cloud admin browser: wrong password, configured demo2026, independent signing, reload, logout, rejected cookie PASS')
finally:
    proc.terminate(); proc.wait(timeout=10)
