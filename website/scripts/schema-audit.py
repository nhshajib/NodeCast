"""Validate generated public HTML with the official Schema.org service."""
from pathlib import Path
import json,subprocess,concurrent.futures
root=Path(__file__).resolve().parents[1];out=root/'audit-results/schema';out.mkdir(parents=True,exist_ok=True)
files=list((root/'dist').rglob('*.html'))
def validate(file):
 raw=subprocess.check_output(['curl','-fsS','--max-time','30','https://validator.schema.org/validate','--data-urlencode',f'html@{file}'],text=True)
 data=json.loads(raw[raw.index('{'):]);assert data.get('tripleGroups'),f'No structured data in {file}';route='/'+str(file.relative_to(root/'dist')).replace('index.html','')
 (out/(route.replace('/','-')+'.json')).write_text(json.dumps(data,indent=2)+'\n')
 errors=sum(group.get('numErrors',0) for group in data.get('tripleGroups',[]));warnings=sum(group.get('numWarnings',0) for group in data.get('tripleGroups',[]))
 return {'route':route,'errors':errors,'warnings':warnings,'types':[group['type'] for group in data.get('tripleGroups',[])]}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(validate,files))
(root/'audit-results/schema-summary.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2));assert all(r['errors']==0 for r in results)
