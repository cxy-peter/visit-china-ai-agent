"""Hosted-style six-account UI, real password validation and cookies, mock model only."""
import os, pathlib, shutil, socket, subprocess, time, urllib.request, json
from playwright.sync_api import sync_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence/admin-login'; OUT.mkdir(parents=True,exist_ok=True)
checks=[]
with socket.socket() as s:
    s.bind(('127.0.0.1',0)); port=s.getsockname()[1]
proc=subprocess.Popen(['node','tools/cloud-admin-browser-fixture.cjs'],cwd=ROOT,env={**os.environ,'PORT':str(port),'TEST_DEMO_ACCOUNTS':'1'})
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
        form=page.locator('#chat-admin-login'); expect(form).to_be_visible()
        expect(form.locator('[data-demo-username]')).to_have_count(6)
        expect(form.locator('#chat-admin-password')).to_have_value('demo2026')
        form.locator('#chat-admin-password').fill('wrong-password'); form.locator('button.primary').click()
        expect(page.locator('#cloud-access-note')).to_contain_text('账号或密码不正确')
        assert not page.request.get(url+'/api/chat').json()['authorized']; checks.append('wrong password denied')
        form.locator('[data-demo-username="admin"]').click(); form.locator('button.primary').click()
        expect(page.locator('#shared-model-dialog')).not_to_be_visible()
        assert page.request.get(url+'/api/chat').json()['authorized']; checks.append('admin connects DeepSeek')
        page.locator('#message').fill('Plan a relaxed Shanghai visit with my parents'); page.locator('#message').press('Enter')
        expect(page.locator('#messages')).to_contain_text('I can help plan a relaxed visit',timeout=20000)
        checks.append('authenticated question reaches provider and renders answer')
        page.locator('#nav-ops').click(); expect(page.locator('#ops-signout')).to_be_visible()
        page.locator('#ops-signout').click(); expect(page.locator('#ops-cloud-login')).to_be_visible()
        for i in range(1,6):
            login=page.locator('#ops-cloud-login')
            login.locator(f'[data-demo-username="reviewer{i}"]').click()
            expect(login.locator('[name="password"]')).to_have_value(f'review2026-{i}')
            login.locator('button.primary').click(); expect(page.locator('#ops-signout')).to_be_visible()
            assert page.request.get(url+'/api/ops').json()['actor']=={'name':f'reviewer{i}','role':'reviewer'}
            assert page.request.post(url+'/api/chat',data={'action':'admin-connect','modelConsent':True}).ok
            denied=page.request.post(url+'/api/ops',data={'action':'skill-preset','preset':'coverage'})
            assert denied.status==403
            checks.append(f'reviewer{i} authenticates, connects chat, cannot change admin skills')
            page.locator('#ops-signout').click(); expect(login).to_be_visible()
        page.screenshot(path=str(OUT/'six-account-login.png'),full_page=True)
        browser.close()
finally:
    proc.terminate(); proc.wait(timeout=10)
    (OUT/'six-account-report.json').write_text(json.dumps({'checks':checks,'count':len(checks),'provider':'mock; real model verified separately on production'},ensure_ascii=False,indent=2),encoding='utf-8')
print('Six-account browser:',len(checks),'PASS')
