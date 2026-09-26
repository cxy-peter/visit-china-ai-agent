"""Explicit release check: fixed public site, one synthetic model question, no credentials.
No automatic retries of the paid question. Read-only readiness polling precedes it.
"""
import datetime, hashlib, json, os, pathlib, time, urllib.request
from playwright.sync_api import sync_playwright, expect
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'evidence/public-chat-production'
OUT.mkdir(parents=True, exist_ok=True)
URL = 'https://visit-china-ai-agent.vercel.app'
QUESTION = ('I am planning a visit to Shanghai with my parents. Before making an itinerary, '
            'tell me which travel needs you would clarify first. Do not invent bookings, '
            'prices or opening hours.')
report = {'site': URL, 'expectedCommit': os.environ.get('GITHUB_SHA'),
          'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'checks': [], 'paidQuestionAttempts': 0, 'scope':
          'One explicitly authorized synthetic production question. No administrator login, '
          'private credentials, writes or microphone. A single question can use multiple internal model calls.'}
def check(name, value):
    report['checks'].append({'name': name, 'passed': bool(value)})
    if not value:
        raise AssertionError(name)
def get_json(path):
    request = urllib.request.Request(URL + path, headers={'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)
try:
    expected_hash = hashlib.sha256((ROOT / 'v5/app.js').read_bytes()).hexdigest()
    ready = None
    # Allow GitHub->Vercel deployment to finish; these GET requests do not invoke the model.
    for attempt in range(30):
        try:
            build = get_json('/build-info.json?release=' + str(int(time.time())))
            report['lastBuild'] = {k: build.get(k) for k in ['version', 'sourceCommit', 'builtAt']}
            matches_code = build.get('files', {}).get('app.js') == expected_hash
            matches_commit = not report['expectedCommit'] or build.get('sourceCommit') == report['expectedCommit']
            if matches_code and matches_commit:
                ready = build
                break
        except Exception as error:
            report['lastReadinessError'] = str(error)[:300]
        time.sleep(10)
    check('production alias serves this release commit and expected client code', ready is not None)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1365, 'height': 1000})
        page = context.new_page()
        actions, errors = [], []
        page.on('request', lambda r: actions.append(r.post_data_json.get('action'))
                if r.url.startswith(URL + '/api/chat') and r.method == 'POST' else None)
        page.on('pageerror', lambda e: errors.append(str(e)))
        try:
            page.goto(URL, wait_until='domcontentloaded', timeout=60000)
            status = page.request.get(URL + '/api/chat').json()
            report['publicStatus'] = {k: status.get(k) for k in ['publicAccess', 'authorized', 'configured', 'accessReady', 'adminConnectReady', 'model', 'version']}
            check('production chat is publicly authorized and has a configured model',
                  status.get('publicAccess') is True and status.get('authorized') is True and status.get('configured') is True)
            expect(page.locator('#shared-model-status')).to_contain_text('无需登录', timeout=20000)
            check('opening the production page sends no model or login request', not actions)
            page.locator('#shared-model-open').click()
            expect(page.locator('#cloud-access')).not_to_be_visible()
            expect(page.locator('#shared-model-detail')).to_contain_text('无需密码或体验码')
            page.locator('#shared-model-close').click()
            page.screenshot(path=str(OUT / 'production-ready.png'), full_page=True)
            report['paidQuestionAttempts'] = 1
            began = time.monotonic()
            with page.expect_response(lambda r: r.url.startswith(URL + '/api/chat') and
                                      r.request.method == 'POST' and
                                      r.request.post_data_json.get('action') == 'answer', timeout=145000) as received:
                page.locator('#message').fill(QUESTION)
                page.locator('#message').press('Enter')
            response = received.value
            value = response.json()
            answer = value.get('answer', {})
            report['answerCheck'] = {'httpStatus': response.status,
                                     'seconds': round(time.monotonic() - began, 2),
                                     'question': QUESTION, 'error': value.get('error'),
                                     'mode': answer.get('mode'), 'text': answer.get('text'),
                                     'usage': answer.get('usage'), 'sourceIds': answer.get('sourceIds'),
                                     'intentKind': answer.get('intent', {}).get('kind')}
            check('one unauthenticated question receives a real successful model-path answer',
                  response.ok and str(answer.get('mode', '')).startswith('deepseek') and
                  len(answer.get('text', '').strip()) > 20 and
                  (answer.get('usage') or {}).get('total_tokens', 0) > 0)
            expect(page.locator('.assistant-answer').last).to_contain_text(answer['text'][:50], timeout=15000)
            check('real model response is rendered in the conversation', True)
            page.screenshot(path=str(OUT / 'production-answer.png'), full_page=True)
            page.locator('#nav-ops').click()
            expect(page.locator('#ops-cloud-login')).to_be_visible(timeout=15000)
            check('Operations still requires admin login',
                  page.request.get(URL + '/api/ops').json().get('actor') is None)
            page.locator('#ops-close').click()
            page.locator('#shared-model-open').click()
            page.locator('#shared-model-consent').uncheck()
            page.reload(wait_until='domcontentloaded')
            expect(page.locator('#shared-model-status')).to_contain_text('已暂停', timeout=20000)
            check('production reload keeps explicit model opt-out',
                  page.evaluate("sessionStorage.getItem('vc-model-consent')") == 'false')
            check('no password exchange and no extra model retry took place',
                  actions.count('answer') == 1 and
                  not any(a in ['login', 'admin-connect'] for a in actions))
            report['pageErrors'] = errors
            check('no uncaught production page error', not errors)
            page.screenshot(path=str(OUT / 'production-paused.png'), full_page=True)
        except Exception:
            page.screenshot(path=str(OUT / 'production-failure.png'), full_page=True)
            raise
        finally:
            report['chatActions'] = actions
            browser.close()
except Exception as error:
    report['failure'] = str(error)[:1000]
    raise
finally:
    report['finishedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    report['passed'] = sum(c['passed'] for c in report['checks'])
    report['total'] = len(report['checks'])
    (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps({'passed': report['passed'], 'total': report['total'],
                      'paidQuestionAttempts': report['paidQuestionAttempts'],
                      'failure': report.get('failure')}, ensure_ascii=False))
