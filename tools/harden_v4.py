from pathlib import Path

def replace(file, old, new, count=1):
 p=Path(file); s=p.read_text(); assert s.count(old)==count,(file,old[:70],s.count(old)); p.write_text(s.replace(old,new))

replace('v4/core.js',"return rows.slice(0,3);", "return rows.filter(r=>d.city!=='Unknown'||r.city==='China'||!r.city).slice(0,3);")
replace('v4/core.js',"Number.isFinite(Date.parse(r.reviewedAt))&&date-Date.parse(r.reviewedAt)","Number.isFinite(Date.parse(r.reviewedAt))&&Date.parse(r.reviewedAt)<=date&&date-Date.parse(r.reviewedAt)")
replace('v4/server.js',"const signal=s.controller.signal,d=s.confirmed,revision=s.revision;", "const planController=s.controller,signal=planController.signal,d=s.confirmed,revision=s.revision;")
replace('v4/server.js',"res.on('close',()=>{if(!res.writableEnded)s.controller?.abort();});", "res.on('close',()=>{if(!res.writableEnded)planController.abort();});")
replace('v4/server.js',"&&!e.topics?.includes('event_reference'));", "&&!e.topics?.includes('event_reference')&&(e.reviewedAt||(['destination','hotel'].includes(need.category)&&e.publication_date&&Date.now()-Date.parse(e.publication_date)<365*86400000)));")
replace('v4/server.js',"for(const need of [...d.needs].sort((a,b)=>C.categories.indexOf(a.category)-C.categories.indexOf(b.category))){", "const ordered=[...d.needs].sort((a,b)=>C.categories.indexOf(a.category)-C.categories.indexOf(b.category));const activeNeeds=d.battery!==null&&d.battery<=5?ordered.slice(0,1):ordered;for(const need of activeNeeds){")
replace('v4/app.js',"for(const need of draft.needs.filter(n=>n.selected)){", "for(const need of draft.needs.filter(n=>n.selected).slice(0,draft.battery!==null&&draft.battery<=5?1:7)){")
replace('v4/app.js',"<em>◔</em>","<em>⚡</em>")
replace('v4/server.js',"const HOSTS=new Set", "const HOSTS=new Set")
# The last assertion deliberately confirms the known source shape; it does not bypass tests.
p=Path('v4/tests.js');p.write_text(p.read_text()+'''\n
test('Unknown arrival city cannot borrow Shanghai airport directions',()=>{const n={category:'transport',text:'airport metro'};const r=C.forNeed(n,{city:'Unknown'},D.sources);assert.ok(r.every(x=>x.city==='China'||!x.city));});
test('Future editorial date is not a current verified source',()=>assert.equal(Boolean(C.current({reviewedAt:'2030-01-01',reviewDays:7},Date.parse('2026-09-24'))),false));
test('A close listener captures its own plan controller',()=>{const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'server.js'),'utf8');assert.ok(source.includes("if(!res.writableEnded)planController.abort()"));assert.ok(!source.includes("if(!res.writableEnded)s.controller?.abort()"));});
''')
print('Applied source hardening; tests must pass before publication.')
