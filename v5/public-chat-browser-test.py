"""Public UI + actual HTTP handlers; upstream is a labelled, schema-valid fixture."""
import json, os, pathlib, shutil, socket, subprocess, time, urllib.request
from playwright.sync_api import sync_playwright, expect
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'evidence/admin-login/public-chat'
OUT.mkdir(parents=True, exist_ok=True)
checks, errors, actions = [], [], []
def check(name, condition):
    checks.append({'name': name, 'passed': bool(condition)})
    assert condition, name
with socket.socket() as s:
    s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]
proc = subprocess.Popen(['node', 'tools/cloud-admin-browser-fixture.cjs'], cwd=ROOT,
                        env={**os.environ, 'PORT': str(port), 'TEST_PUBLIC': '1'})
try:
    url = f'http://127.0.0.1:{port}'
    for _ in range(60):
        try: urllib.request.urlopen(url, timeout=1); break
        except Exception: time.sleep(.1)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=shutil.which('chromium') or None, headless=True)
        page = browser.new_page(viewport={'width': 1365, 'height': 1000})
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('request', lambda r: actions.append(r.post_data_json.get('action'))
                if r.url.endswith('/api/chat') and r.method == 'POST' else None)
        calls = lambda: page.request.get(url + '/__test/status').json()['modelCalls']
        try:
            page.goto(url)
            expect(page.locator('#shared-model-status')).to_contain_text('无需登录')
            check('public chat automatically displays ready status', True)
            check('opening the page does not call the model', calls() == 0 and not actions)
            page.locator('#shared-model-open').click()
            expect(page.locator('#cloud-access')).not_to_be_visible()
            expect(page.locator('#shared-model-detail')).to_contain_text('无需密码或体验码')
            check('credential gate is absent and data-use notice remains visible', True)
            page.locator('#shared-model-close').click()
            with page.expect_response(lambda r: r.url.endswith('/api/chat') and
                                      r.request.method == 'POST' and
                                      r.request.post_data_json.get('action') == 'answer') as received:
                page.locator('#message').fill('Plan a relaxed Shanghai visit with my parents')
                page.locator('#message').press('Enter')
            response = received.value
            result = response.json()
            check('a submitted question receives a successful model-path response',
                  response.ok and result.get('answer', {}).get('mode') == 'deepseek')
            check('fixture answer satisfies existing citation validation',
                  bool(result['answer'].get('sourceIds')) and
                  result['answer']['usage']['total_tokens'] > 0)
            expect(page.locator('.assistant-answer')).to_contain_text('I can help plan a relaxed visit', timeout=20000)
            check('actual returned answer is rendered instead of a default fallback', True)
            check('model is called only after a question, with no login request',
                  calls() >= 1 and 'answer' in actions and
                  not any(a in ['login', 'admin-connect'] for a in actions))
            page.screenshot(path=str(OUT / 'public-answer.png'), full_page=True)
            page.locator('#nav-ops').click()
            expect(page.locator('#ops-cloud-login')).to_be_visible()
            check('Operations continues to require an administrator login',
                  page.request.get(url + '/api/ops').json()['actor'] is None)
            denied = page.request.post(url + '/api/ops', data={'action': 'skill-preset', 'preset': 'coverage'})
            check('anonymous skill changes remain forbidden', denied.status == 403)
            page.locator('#ops-close').click()
            page.locator('#shared-model-open').click()
            page.locator('#shared-model-consent').uncheck()
            expect(page.locator('#shared-model-status')).to_contain_text('已暂停')
            check('explicit opt-out is saved in the current browser tab',
                  page.evaluate("sessionStorage.getItem('vc-model-consent')") == 'false')
            paused_calls = calls()
            page.reload()
            expect(page.locator('#shared-model-status')).to_contain_text('已暂停')
            check('reload preserves opt-out and makes no automatic model call', calls() == paused_calls)
            page.locator('#message').fill('Please keep the pace relaxed for my family')
            page.locator('#message').press('Enter')
            page.wait_for_timeout(500)
            check('submitting while paused does not call the provider', calls() == paused_calls)
            page.screenshot(path=str(OUT / 'public-paused.png'), full_page=True)
            page.locator('#shared-model-open').click()
            with page.expect_response(lambda r: r.url.endswith('/api/chat') and
                                      r.request.method == 'POST' and
                                      r.request.post_data_json.get('action') == 'answer') as resumed:
                page.locator('#shared-model-consent').check()
            check('explicit resume processes the pending question without credentials',
                  resumed.value.ok and calls() > paused_calls)
            page.locator('#shared-model-close').click()
            expect(page.locator('.assistant-answer').last).to_contain_text('I can help plan a relaxed visit')
            check('no uncaught browser errors', not errors)
        except Exception:
            page.screenshot(path=str(OUT / 'failure.png'), full_page=True)
            raise
        finally:
            browser.close()
finally:
    proc.terminate(); proc.wait(timeout=10)
    (OUT / 'report.json').write_text(json.dumps({
        'checks': checks, 'passed': sum(c['passed'] for c in checks), 'total': len(checks),
        'errors': errors, 'chatActions': actions,
        'scope': 'Actual Chromium and local HTTP; upstream is a schema-valid provider fixture. No real DeepSeek payment, microphone, private account or production data.'
    }, ensure_ascii=False, indent=2))
print(json.dumps({'publicBrowserPassed': len(checks), 'errors': errors}))
