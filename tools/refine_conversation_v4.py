from pathlib import Path
p=Path('v4/core.js');s=p.read_text()
old="cash:/cash|currency|exchange|coins?|换汇|现金|换钱|硬币/i";assert old in s;s=s.replace(old,"cash:/cash|currency|exchange|coins?|rmb|换汇|现金|换钱|硬币|人民币|零钱/i")
helper='''function locationFrom(messages){let airport='Unknown',terminal='',zone='';for(const m of messages){const s=clean(m.text||m.content||m);let a='';if(/\\bpvg\\b|浦东/i.test(s))a='PVG';else if(/\\bsha\\b|虹桥/i.test(s))a='SHA';else if(/\\bpek\\b|首都机场/i.test(s))a='PEK';else if(/\\bpkx\\b|大兴/i.test(s))a='PKX';if(a&&a!==airport){airport=a;terminal='';zone='';}if(!a&&/北京|beijing/i.test(s)&&['PVG','SHA'].includes(airport)){airport='Unknown';terminal='';zone='';}if(!a&&/上海|shanghai/i.test(s)&&['PEK','PKX'].includes(airport)){airport='Unknown';terminal='';zone='';}const t=s.match(/\\bT\\s*([123])\\b|([123])号航站楼/i);if(t)terminal='T'+(t[1]||t[2]);if(/public arrivals|public area|landside|公共到达|公共区域/i.test(s))zone='public';else if(/airside|安检内|restricted area/i.test(s))zone='restricted';else if(/baggage claim|行李提取/i.test(s))zone='baggage';}return{airport,terminal,zone};}
'''
assert 'function draft(messages,revision){' in s;s=s.replace('function draft(messages,revision){',helper+'function draft(messages,revision){')
s=s.replace("const missing=[];if(city==='Unknown')", "const location=locationFrom(messages);const missing=[];if(city==='Unknown')")
old="if(needs.some(n=>['cash','transport'].includes(n.category)))missing.push";assert old in s;s=s.replace(old,"if(needs.some(n=>['cash','transport'].includes(n.category))&&(!location.terminal||!location.zone||location.airport==='Unknown'))missing.push")
s=s.replace('return{revision,language:zh?', 'return{revision,location,language:zh?')
p.write_text(s)
p=Path('v4/app.js');s=p.read_text();old="esc(draft.city)+'</span>";assert old in s;s=s.replace(old,"esc([draft.city,draft.location?.airport==='Unknown'?'':draft.location?.airport,draft.location?.terminal,draft.location?.zone].filter(Boolean).join(' · '))+'</span>")
# Full-page screenshots should not contain a fixed input overlay covering a plan node.
p.write_text(s)
p=Path('v4/browser_test.py');s=p.read_text();s=s.replace("page.screenshot(path=str(out/'plan.png'),full_page=True)","page.locator('#compose').evaluate(\"e=>e.style.visibility='hidden'\")\n page.screenshot(path=str(out/'plan.png'),full_page=True)\n page.locator('#compose').evaluate(\"e=>e.style.visibility=''\")")
s=s.replace("check('numbered requirements created',page.locator('[data-need]').count()>=3)","check('numbered requirements created',page.locator('[data-need]').count()>=4)\n check('known airport context is shown','PVG' in page.locator('.draft').inner_text() and 'T2' in page.locator('.draft').inner_text())")
p.write_text(s)
p=Path('v4/tests.js');p.write_text(p.read_text()+'''

test('RMB exchange is recognized without the exact word cash',()=>{const d=C.draft([{text:'我刚到上海浦东机场T2公共到达厅，需要换人民币'}],1);assert.ok(d.needs.some(n=>n.category==='cash'));assert.equal(d.location.airport,'PVG');assert.equal(d.location.terminal,'T2');assert.equal(d.location.zone,'public');assert.equal(d.missing.length,0);});
test('A new city does not inherit the previous airport',()=>{const d=C.draft([{text:'Shanghai PVG T2 public arrivals'},{text:'Actually Beijing'}],2);assert.equal(d.city,'Beijing');assert.equal(d.location.airport,'Unknown');});
''')
print('Applied explicit location retention and screenshot readability improvements.')
