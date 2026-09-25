"""Apply authorized, bounded UTF-8 changes against exact baseline file hashes."""
import base64,gzip,hashlib,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
m=json.loads((ROOT/'.upgrade/v66-manifest.json').read_text())
encoded=''.join((ROOT/p).read_text().strip() for p in m['parts'])
raw=gzip.decompress(base64.b64decode(encoded,validate=True))
assert len(raw)<500000 and hashlib.sha256(raw).hexdigest()==m['sha256'],'Bundle checksum'
bundle=json.loads(raw);assert bundle['baseline']=='a883f7c9b9157548b7fdaca3cd3c47dc77c45a25'
allowed={'README.md','package.json','package-lock.json','api/products.js','v5/app.js','v5/build.js','v5/harness.js','v5/index.html','v5/ops-api.js','v5/ops-harness-ui.js','v5/product-suggestions.js','v5/recommendation-ui.js','v5/server.js','v5/style.css','v5/transport-ui.js','v5/v62-browser-fixture.cjs','v5/choice-memory.js','v5/product-api.js','v5/skill-presets.js','v5/v66.test.js','v5/v66_browser_test.py','docs/V6_6_IMPLEMENTATION_AND_PRODUCT.md','docs/V6_6_DESIGN_RESEARCH.md','docs/V6_6_RESUME_PUBLIC.md'}
pending=[]
for e in bundle['entries']:
 assert e['path'] in allowed and e['offsets']=='characters'
 p=ROOT/e['path'];before=p.read_text() if p.exists() else ''
 if e['base_sha256'] is None:assert not p.exists(),e['path']+' already exists'
 else:assert hashlib.sha256(before.encode()).hexdigest()==e['base_sha256'],e['path']+' baseline changed'
 after=before
 for c in sorted(e['changes'],key=lambda c:c['start'],reverse=True):
  assert 0<=c['start']<=c['end']<=len(before)
  after=after[:c['start']]+c['text']+after[c['end']:]
 assert hashlib.sha256(after.encode()).hexdigest()==e['result_sha256'],e['path']+' result mismatch'
 pending.append((p,after))
assert len(pending)==len(allowed)
for p,text in pending:p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
for p in m['parts']: (ROOT/p).unlink()
(ROOT/'.upgrade/v66-manifest.json').unlink()
pathlib.Path(__file__).unlink()
print('Verified and applied',len(pending),'files; no credentials or runtime state touched.')
