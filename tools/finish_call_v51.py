"""Reviewed additive V5.1 edits. Preserve strict CSP; do not weaken test assertions."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
def edit(name, old, new):
    p=ROOT/name; text=p.read_text()
    if new in text:return
    if text.count(old)!=1:raise RuntimeError(f'{name}: conflicting source for {old[:55]}')
    p.write_text(text.replace(old,new))
edit('v5/voice.js','this.onCaption=o.onCaption||(()=>{});','this.onCaption=o.onCaption||(()=>{});this.onDraft=o.onDraft||(()=>{});this.pendingInterim="";')
edit('v5/voice.js','cancel(){this.epoch++;','cancel({preserveInterim=false}={}){if(preserveInterim&&this.pendingInterim.trim())this.onDraft(this.pendingInterim.trim());this.pendingInterim="";this.epoch++;')
edit('v5/voice.js',"this.onCaption(final||interim);if(final.trim()){sent=true;", "this.pendingInterim=final.trim()?'':interim;this.onCaption(final||interim);if(final.trim()){sent=true;")
edit('v5/app.js',"onCaption:text=>{$('interim').textContent=text;},onState:","onCaption:text=>{$('interim').textContent=text;},onDraft:text=>{const b=$('speech-draft');b.dataset.text=E.clean(text,1500);$('speech-draft-text').textContent=b.dataset.text;b.classList.remove('hidden');},onState:")
edit('v5/app.js','function commit(event){try{call.cancel();','function commit(event){try{call.cancel({preserveInterim:true});')
edit('v5/index.html','<div class="call-controls">','<div id="speech-draft" class="proposal hidden"><small>未发送的语音片段 · Unfinished speech, not saved as a fact</small><p id="speech-draft-text"></p><button id="speech-draft-use" class="light">编辑后继续</button><button id="speech-draft-discard" class="light">放弃片段</button></div><div class="call-controls">')
edit('v5/app.js',"$('remember').onchange=remember;", "$('speech-draft-use').onclick=()=>{const b=$('speech-draft');$('message').value=[$('message').value,b.dataset.text].filter(Boolean).join(' ');b.dataset.text='';b.classList.add('hidden');$('message').focus();};$('speech-draft-discard').onclick=()=>{$('speech-draft').dataset.text='';$('speech-draft').classList.add('hidden');};$('remember').onchange=remember;")
edit('v5/app.js',"queue=[];history.length=0;state=E.state();", "queue=[];history.length=0;$('speech-draft').dataset.text='';$('speech-draft').classList.add('hidden');state=E.state();")
p=ROOT/'v5/browser_test.py';t=p.read_text()
t=t.replace('from playwright.sync_api import sync_playwright\n','from playwright.sync_api import sync_playwright, expect\n')
t=t.replace('page.wait_for_function("document.querySelector(\'#mode\').textContent.includes(\'本机\')")', "expect(page.locator('#mode')).to_contain_text('本机')")
t=t.replace('page.wait_for_function("document.querySelector(\'.candidate\').innerText.includes(\'通过\')")', "expect(page.locator('.candidate')).to_contain_text('通过')")
t=t.replace('page.wait_for_function(f"document.querySelector(\'.candidate\').innerText.includes(\'{i}/5\')")', "expect(page.locator('.candidate')).to_contain_text(f'{i}/5')")
t=t.replace('page.wait_for_function("document.querySelector(\'.candidate .status\').textContent===\'rolled_back\'")', "expect(page.locator('.candidate .status')).to_have_text('rolled_back')")
t=t.replace('page.wait_for_function("TravelApp.', 'page.wait_for_function("() => TravelApp.')
t=t.replace('if static else {}))', "if static or os.environ.get('CHROMIUM_PATH') else {}))")
p.write_text(t)
edit('v5/browser_test.py',"page.locator('[data-choice=\"taxi\"]').click();page.locator('[data-choice=\"museums\"]').click()", "page.evaluate('__finish()');page.evaluate(\"__say('I also need to',false)\")\n        page.locator('[data-choice=\"taxi\"]').click()\n        check('choice during partial speech keeps an unsent draft',page.locator('#speech-draft').is_visible() and 'I also need to' in page.locator('#speech-draft-text').inner_text())\n        check('partial speech does not create an invented fact',not page.evaluate(\"TravelApp.getState().history.some(h=>h.text==='I also need to')\"))\n        page.locator('#speech-draft-discard').click();page.locator('[data-choice=\"museums\"]').click()")
for name in ('package.json','package-lock.json'):
    p=ROOT/name;v=json.loads(p.read_text());v['version']='5.1.0'
    if name=='package-lock.json' and '' in v.get('packages',{}):v['packages']['']['version']='5.1.0'
    if name=='package.json':v['scripts']['test']='node --test v4/tests.js v5/tests.js v5/concurrency.test.js'
    p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
edit('v5/build.js',"version:'5.0.0'", "version:'5.1.0'")
print('V5.1: strict-CSP browser checks and concurrent speech-draft preservation applied.')
