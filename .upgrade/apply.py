"""One-time, branch-only source integration; never used by the application."""
import hashlib, json, pathlib
root = pathlib.Path.cwd().resolve()
manifest = root / '.upgrade/v65-changes.json'
def sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()
data = json.loads(manifest.read_text(encoding='utf-8'))
assert data['format'] == 'text-edits-v1'
expected = {
 'v5/city-scope.js':'761d7a81aff9410142bace1cc0cb8b18837a77bf9ccc38092d478778b38f8fe2',
 'v5/city-sources.js':'86dce685ced368c03dead847f0f758bc7ae20a04a242f521073b3f976875c5f1',
 'v5/kb-direct.js':'3a2f7e3684754ecdcf488b5f4c564b2fd4d42c7133ab2af3f2f761af43241a1b',
 'v5/kb-entries.json':'9bb4e7a048f018ac9739cf7cc380a10c0f4e56add8692f2b75bad747aa943f2c',
 'v5/retrieval-plan.js':'93150bcbe7cba75b1ba8468a91693c3f3a1e9beb0e378d5538610231ec84a8aa',
 'v5/answer-guard.js':'793b9e09fcd1a00f89092df41cf993d5295fafc6a2a614323d92b466fdd503e8',
 'v5/v65.test.js':'917da10702c7f10651b285bbeb4db30e64e297471542163a258808c69543b90d',
 'v5/v65_browser_test.py':'d9dc73205b724202ced04f4eb4be79d2d5c4a4d4e3be9e2ad6b5540b3146e834'
}
for name, digest in expected.items():
    actual=sha((root/name).read_text(encoding='utf-8'))
    assert actual==digest, f'{name}: expected {digest}; received {actual}'
outputs=[]
for item in data['files']:
    name=item['path']; path=root/name
    assert not path.is_symlink() and path.resolve().is_relative_to(root)
    assert name.startswith('v5/') or name in ['README.md','package.json','package-lock.json']
    text=path.read_text(encoding='utf-8')
    assert sha(text)==item['before'], f'{name}: baseline moved; do not overwrite'
    previous=len(text)+1
    for start,end,replacement in reversed(item['edits']):
        assert 0<=start<=end<previous
        text=text[:start]+replacement+text[end:]; previous=start+1
    assert sha(text)==item['after'], f'{name}: integrated checksum mismatch'
    outputs.append((path,text))
compat=(root/'v5/v64_browser_test.py').read_text(encoding='utf-8').replace('evidence/v6.4/browser','evidence/v6.5/compat-browser').replace('browser=p.chromium.launch();','browser=p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or shutil.which("chromium"));')
assert sha(compat)=='5057f86692e60116872f3d18194a2901ca0d86444f6d1eba8c324efeadf6ebf4'
outputs.append((root/'v5/v65_compat_browser_test.py',compat))
for path,text in outputs:path.write_text(text,encoding='utf-8')
for path in (root/'.upgrade').iterdir():
    if path.is_file():path.unlink()
(root/'.upgrade').rmdir()
print(f'All checksums verified; applied {len(outputs)} ordinary source files.')
