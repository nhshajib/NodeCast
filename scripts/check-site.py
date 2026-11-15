"""Validate the static Pages bundle without network access."""
from html.parser import HTMLParser
from pathlib import Path
import re, sys
ROOT = Path(__file__).resolve().parents[1]/'site'
class Page(HTMLParser):
    def __init__(self): super().__init__(); self.ids=set(); self.refs=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if a.get('id'): self.ids.add(a['id'])
        for key in ['href','src']:
            if a.get(key): self.refs.append(a[key])
page=Page(); page.feed((ROOT/'index.html').read_text())
errors=[]
for ref in page.refs:
    if ref in ['#','/'] or ref.startswith(('https://','http://','mailto:','data:')): continue
    if ref.startswith('#'):
        if ref[1:] not in page.ids: errors.append('Missing anchor '+ref)
    elif not (ROOT/ref).is_file(): errors.append('Missing file '+ref)
for ref in re.findall(r'url\([\'"]?([^\)\'\"]+)',(ROOT/'style.css').read_text()):
    if not (ROOT/ref).is_file(): errors.append('Missing CSS resource '+ref)
assert '[NEW LINK]' not in (ROOT/'index.html').read_text()
if errors: print('\n'.join(errors)); sys.exit(1)
print(f'Pages validation passed: {len(page.refs)} links/resources, {len(page.ids)} anchors.')
