"""Apply reviewed UTF-8 patch; stage is removed after verified integration."""
import hashlib,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
manifest=ROOT/'.upgrade/v66-completion.json'
d=json.loads(manifest.read_text())
assert d['baseline']=='55b7267f3772300cec1a6d806d01316f5992e87d'
allowed={'v5/app.js','v5/harness.js','v5/ops-harness-ui.js','v5/product-suggestions.js','v5/related-services-ui.js','v5/transport-ui.js','v5/v66.test.js','v5/v66_browser_test.py'}
assert {r['path'] for r in d['entries']}==allowed and len(d['entries'])==len(allowed)
ready=[]
for r in d['entries']:
 p=ROOT/r['path'];text=p.read_text();assert hashlib.sha256(text.encode()).hexdigest()==r['before'],r['path']+' changed before patch'
 last=len(text)
 for change in sorted(r['changes'],key=lambda x:x['start'],reverse=True):
  a,b=change['start'],change['end'];assert 0<=a<=b<=last;last=a
  text=text[:a]+change['text']+text[b:]
 assert hashlib.sha256(text.encode()).hexdigest()==r['after'],r['path']+' result mismatch'
 ready.append((p,text))
for p,text in ready:p.write_text(text)
manifest.unlink();pathlib.Path(__file__).unlink()
print('Applied',len(ready),'reviewed completion files. Original model prompts and voice modules are untouched.')
