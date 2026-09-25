"""One-time visible release-label correction; not a prompt or runtime change."""
from pathlib import Path
import hashlib
root=Path(__file__).resolve().parents[1]
p=root/'v5/index.html';text=p.read_text()
assert hashlib.sha256(text.encode()).hexdigest()=='3aec4f290294520f17bba47159d9e70178f133f7065a335794fb12f7a4366c0b'
a='V6.4 · PERSONAL PROTOTYPE';assert text.count(a)==1
p.write_text(text.replace(a,'V6.6 · PERSONAL PROTOTYPE'))
Path(__file__).unlink()
print('Visible sidebar version now matches 6.6; model prompts and logic unchanged.')
