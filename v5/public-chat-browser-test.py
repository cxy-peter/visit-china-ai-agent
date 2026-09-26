"""Public travel chat through real HTTP handlers with a labelled provider fixture."""
import os, pathlib, shutil, socket, subprocess, time, urllib.request
from playwright.sync_api import sync_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
with socket.socket() as s:
    s.bind(('127.0.0.1',0)); port=s.getsockname()[1]
proc=subprocess.Popen(['node','tools/cloud-admin-browser-fixture.cjs'],cwd=ROOT,env={**os.environ,'PORT':str(port),'TEST_PUBLIC':'1'})
try:
    url=f'http://127.0.0.1:{port}'
    for _ in range(60):
        try: urllib.request.urlopen(url,timeout=1); break
        except Exception: time.sleep(.1)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium') or None,headless=True)
        page=browser.new_page(); requests=[]
        page.on('request',lambda r: requests.append(r.post_data_json) if r.url.endswith('/api/chat') and r.method=='POST' else None)
        page.goto(url); expect(page.locator('#shared-model-status')).to_contain_text('无需登录')
        assert not requests, 'Opening the page must not trigger a paid model request'
        page.locator('#shared-model-open').click(); expect(page.locator('#cloud-access')).not_to_be_visible()
        expect(page.locator('#shared-model-detail')).to_contain_text('无需密码或体验码')
        page.locator('#shared-model-close').click()
        page.locator('#message').fill('Plan a relaxed Shanghai visit with my parents'); page.locator('#message').press('Enter')
        expect(page.locator('#messages')).to_contain_text('I can help plan a relaxed visit',timeout=20000)
        assert any(r.get('action')=='answer' for r in requests)
        assert not any(r.get('action') in ['login','admin-connect'] for r in requests)
        page.locator('#nav-ops').click(); expect(page.locator('#ops-cloud-login')).to_be_visible()
        page.locator('#shared-model-open').click(); page.locator('#shared-model-consent').uncheck(); page.reload()
        expect(page.locator('#shared-model-status')).to_contain_text('已暂停')
        browser.close()
        print('Public chat browser: auto-ready, no credential gate, generated answer, protected Operations, opt-out persistence PASS')
finally:
    proc.terminate(); proc.wait(timeout=10)
