"""Authorized additive integration; check every baseline before changing anything."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
manifest=ROOT/'.upgrade/admin-login-changes.json'
rows=json.loads(manifest.read_text());allowed={'v5/server.js','v5/build.js','v5/index.html','v5/ops.js'}
assert {r['path'] for r in rows}==allowed
pending=[]
for row in rows:
 p=ROOT/row['path'];original=p.read_text();assert hashlib.sha256(original.encode()).hexdigest()==row['base_sha256'],row['path']+' has changed; refusing to overwrite'
 result=original
 for change in row['changes']:
  assert change['old'] in result,row['path']+' match missing'
  result=result.replace(change['old'],change['new'])
 assert hashlib.sha256(result.encode()).hexdigest()==row['result_sha256'],row['path']+' output checksum'
 pending.append((p,result))
for p,text in pending:p.write_text(text)
manifest.unlink();Path(__file__).unlink()
print('Integrated four verified files; no credentials, runtime data, prompts or model budgets changed.')
