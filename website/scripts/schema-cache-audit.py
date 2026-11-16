"""Compare current JSON-LD with saved official results when the validator is unavailable.

Changed payloads are never labelled officially validated. Retry schema-audit.py
when the service's rate limit is lifted for a fresh response.
"""
from pathlib import Path
import json,re,hashlib
root=Path(__file__).resolve().parents[1];rows=[]
def schemas(html):return [json.loads(value) for value in re.findall(r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>',html,re.S)]
for file in (root/'dist').rglob('*.html'):
 route='/'+str(file.relative_to(root/'dist')).replace('index.html','');saved=root/'audit-results/schema'/(route.replace('/','-')+'.json');saved=saved if saved.exists() else root.parent/'verification/glowtv/schema'/saved.name;old=json.loads(saved.read_text());current=schemas(file.read_text());previous=schemas(old['html']);assert current
 identical=current==previous
 assert all(item.get('@context')=='https://schema.org' and item.get('@type') for item in current)
 errors=sum(group.get('numErrors',0) for group in old['tripleGroups']);warnings=sum(group.get('numWarnings',0) for group in old['tripleGroups']);assert not errors and not warnings
 rows.append({'route':route,'errors':0,'warnings':0,'types':[item['@type'] for item in current],'officialPayloadUnchanged':identical,'verification':'Identical JSON-LD to saved official Schema.org validation'if identical else'Local structure checked; fresh official check pending (service returned HTTP 405/rate-limit challenge)','sha256':hashlib.sha256(json.dumps(current,sort_keys=True).encode()).hexdigest()})
(root/'audit-results/schema-summary.json').write_text(json.dumps(rows,indent=2)+'\n');print(sum(row['officialPayloadUnchanged'] for row in rows),'unchanged official payloads;',len(rows),'current pages')
