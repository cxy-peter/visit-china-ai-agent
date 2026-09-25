"""Real browser + real Operations login. No model, voice or production test."""
import json, pathlib, subprocess, tempfile, socket, os, time, urllib.request, shutil
from playwright.sync_api import sync_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1]; OUT=ROOT/'evidence/admin-login'; OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def check(name,value=True):
 checks.append({'name':name,'passed':bool(value)});assert value,name
for mode in ['default','custom']:
 runtime=tempfile.mkdtemp(prefix='vc-login-ui-')
 with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
 log=open(OUT/(mode+'.log'),'w');proc=subprocess.Popen(['node','tools/admin-login-browser-fixture.cjs'],cwd=ROOT,env={**os.environ,'TEST_MODE':mode,'TEST_RUNTIME':runtime,'PORT':str(port)},stdout=log,stderr=log)
 try:
  url=f'http://127.0.0.1:{port}'
  for _ in range(60):
   try:urllib.request.urlopen(url,timeout=1);break
   except Exception:time.sleep(.1)
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path=shutil.which('chromium') or None,headless=True);page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url)
   page.locator('#nav-ops').click();form=page.locator('#ops-cloud-login');expect(form).to_be_visible();expect(form.locator('[name=username]')).to_have_value('admin')
   if mode=='default':
    expect(form.locator('[name=password]')).to_have_value('demo2026');check('default password is actual field value, not placeholder')
    expect(form.locator('[data-login-hint]')).to_contain_text('已实际填入');form.locator('[data-show-login-password]').check();expect(form.locator('[name=password]')).to_have_attribute('type','text');check('reveal control works without submitting');page.screenshot(path=str(OUT/'login-prefilled.png'),full_page=True)
   else:
    expect(form.locator('[data-login-hint]')).to_contain_text('自定义账号');expect(form.locator('[name=password]')).to_have_value('');check('custom password not returned or prefilled')
    form.locator('[name=password]').fill('wrong');form.locator('button.primary').click();expect(page.locator('#ops-status')).to_contain_text('不正确');check('wrong password does not bypass authentication');form.locator('[name=password]').fill('private-browser-fixture')
   form.locator('button.primary').click();expect(page.locator('.ops-top')).to_contain_text('管理员');check(mode+' real Operations login succeeds')
   page.locator('[data-ops-tab=harness]').click();expect(page.locator('#skill-objectives')).to_be_visible();expect(page.locator('[data-skill-preset]')).to_have_count(3);check(mode+' skill workbench reachable after login')
   page.locator('[data-ops-tab=evaluation]').click();expect(page.locator('#ops-workflow-form')).to_be_visible();check(mode+' workflow configuration reachable')
   check(mode+' no uncaught browser errors',not errors);browser.close()
 finally:
  proc.terminate();proc.wait(timeout=10);log.close();shutil.rmtree(runtime,ignore_errors=True)
(OUT/'browser-report.json').write_text(json.dumps({'checks':checks,'scope':'Chromium with actual Operations auth and local SQLite. Model/status fixture explicitly disables model calls; not a production, legacy-server or microphone test.'},ensure_ascii=False,indent=2))
print(json.dumps({'passed':len(checks),'checks':checks}))
