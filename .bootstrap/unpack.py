"""Verify a bounded source transfer before writing ordinary repository files.
No external downloads, shell execution, paths outside the repo, or hidden secrets.
The separate GitHub workflow runs tests/build after this checksum verification.
"""
import base64, hashlib, json, lzma
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / '.bootstrap/manifest.json').read_text())
assert manifest['format'] == 'visit-china-v2-lzma-json', 'unsupported format'
parts = manifest['parts']
assert 1 <= len(parts) <= 20, 'invalid part count'
encoded = ''
for part in parts:
    name = part['path']
    assert name.startswith('.bootstrap/source-') and name.endswith('.txt')
    assert '..' not in PurePosixPath(name).parts
    raw = (ROOT / name).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == part['sha256'], 'part checksum mismatch: ' + name
    encoded += raw.decode('ascii').strip()
compressed = base64.b64decode(encoded, validate=True)
assert len(compressed) <= 500000
assert hashlib.sha256(compressed).hexdigest() == manifest['bundle_sha256']
decoder = lzma.LZMADecompressor(memlimit=100 * 1024 * 1024)
raw = decoder.decompress(compressed, max_length=3 * 1024 * 1024)
assert decoder.eof and not decoder.unused_data, 'oversized or incomplete payload'
bundle = json.loads(raw)
assert bundle['schema'] == 1 and len(bundle['files']) == manifest['file_count'] <= 150
allowed_roots = {'public', 'src', 'api', 'scripts', 'tests', 'docs', 'assets', 'skills', 'evidence'}
allowed_top = {'README.md', 'AGENTS.md', 'LICENSE', '.gitignore', '.env.example', 'package.json', 'package-lock.json', 'server.js', 'start.bat', 'start.sh', 'vercel.json'}
seen, prepared = set(), []
for entry in bundle['files']:
    name = entry['path']
    path = PurePosixPath(name)
    assert not path.is_absolute() and '..' not in path.parts and '\\' not in name
    assert name not in seen, 'duplicate path'; seen.add(name)
    assert name in allowed_top or path.parts[0] in allowed_roots, 'unapproved path: ' + name
    assert not any(part in {'.git', 'node_modules', 'data', '__pycache__'} for part in path.parts)
    assert not any(part.startswith('.env') and part != '.env.example' for part in path.parts)
    data = entry['content'].encode('utf-8') if entry['encoding'] == 'utf-8' else base64.b64decode(entry['content'], validate=True)
    if entry['encoding'] != 'utf-8':
        assert name in {'assets/overview.webp', 'assets/operations.webp'}, 'unapproved binary'
    assert hashlib.sha256(data).hexdigest() == entry['sha256'], 'file checksum mismatch'
    dest = ROOT / name
    assert ROOT in dest.resolve().parents, 'path escape'
    if dest.exists() and dest.read_bytes() != data:
        current = dest.read_bytes()
        git_blob = hashlib.sha1(b'blob ' + str(len(current)).encode() + b'\0' + current).hexdigest()
        assert manifest.get('approved_replacements', {}).get(name) == git_blob, 'unapproved overwrite: ' + name
    prepared.append((dest, data))
# Validate all entries before any write.
for dest, data in prepared:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
print('Verified and installed', len(prepared), 'source files; no external files fetched.')
