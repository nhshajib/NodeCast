"""Bounded, independent browser workers. Run after verify-phase.sh completes."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import os,subprocess,json,sys
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
groups=['ios-','android-','ipad-','tv-','tv-dp']
def worker(group):
 env=dict(os.environ)
 if group=='tv-dp':env['AUDIT_TV_DP']='1';env.pop('AUDIT_CASE',None)
 else:env['AUDIT_CASE']=group;env.pop('AUDIT_TV_DP',None)
 with open('/tmp/glowtv-073-matrix-'+group+'.log','w') as output:
  result=subprocess.run([sys.executable,str(HERE/'capture.py')],cwd=ROOT,env=env,stdout=output,stderr=subprocess.STDOUT)
 return group,result.returncode
failed=[]
with ThreadPoolExecutor(max_workers=3) as pool:
 for future in as_completed([pool.submit(worker,group) for group in groups]):
  group,code=future.result();print(group,'PASS' if code==0 else 'FAIL',flush=True)
  if code:failed.append(group)
if failed:raise SystemExit('Failed groups: '+', '.join(failed))
results=[]
for group in groups[:-1]:
 data=json.loads((HERE/f'browser-audit-{group}.json').read_text());assert all(x['passed'] for x in data);results.extend(data)
assert len(results)==14
(HERE/'browser-audit.json').write_text(json.dumps(results,indent=2)+'\n')
print('Required matrix: 14/14; supplemental TV density: 2/2',flush=True)
