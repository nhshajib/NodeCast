from pathlib import Path
import json
root=Path(__file__).resolve().parents[2];source=root/'website/audit-results';out=root/'verification/glowtv'
for name,dest in [('pages.json','website-audit.json'),('schema-summary.json','schema-validation.json')]:
 if (source/name).exists():(out/dest).write_bytes((source/name).read_bytes())
rows=[]
for mode in ['mobile','desktop']:
 # Targeted reruns replace scores-<mode>.json. Read the individual reports
 # instead so a refreshed screenshot audit cannot discard other page results.
 from urllib.parse import urlsplit
 for report in sorted((source/'lighthouse').glob(f'{mode}-*.json')):
  data=json.loads(report.read_text())
  assert not data.get('runtimeError'), (report,data.get('runtimeError'))
  audit=data['audits']
  rows.append({'route':urlsplit(data['requestedUrl']).path,'mode':mode,
   'measuredAt':data['fetchTime'],
   'scores':{key:round(value['score']*100) for key,value in data['categories'].items()},
   'lcp':audit['largest-contentful-paint']['numericValue'],
   'cls':audit['cumulative-layout-shift']['numericValue'],
   'tbt':audit['total-blocking-time']['numericValue'],
   'bytes':audit['total-byte-weight']['numericValue'],
   'failedAudits':[{'id':a['id'],'title':a['title'],'score':a['score'],
    **({'displayValue':a['displayValue']} if 'displayValue' in a else {})}
    for a in audit.values() if a.get('score') is not None and a['score']<1 and a.get('details')]})
assert len(rows)==46, f'Expected all 23 pages on both profiles, found {len(rows)}'
assert len({(row['route'],row['mode']) for row in rows})==46, 'Duplicate page reports'
assert all(all(score>=95 for score in row['scores'].values()) for row in rows)
routes=['/']+['/'+page['path']+'/' for page in json.loads((root/'website/src/data/pages.json').read_text())]+['/404.html']
rows.sort(key=lambda row: (['mobile','desktop'].index(row['mode']),routes.index(row['route'])))
(out/'lighthouse-scores.json').write_text(json.dumps(rows,indent=2)+'\n')
by={}
for row in rows:by.setdefault(row['route'],{})[row['mode']]=row
lines=['# GlowTV Lighthouse results','','Local production Astro output; Lighthouse simulated mobile 4G and desktop, Chromium. These are lab results, not live-domain or field-INP measurements.','', '| Page | Mobile P / A / BP / SEO | Desktop P / A / BP / SEO | Mobile LCP | Mobile CLS |','| --- | --- | --- | --- | --- |']
for route,modes in by.items():
 mobile,desktop=modes['mobile'],modes['desktop'];score=lambda row:' / '.join(str(v) for v in row['scores'].values())
 lines.append(f"| `{route}` | {score(mobile)} | {score(desktop)} | {mobile['lcp']/1000:.2f}s | {mobile['cls']:.4f} |")
lines+=['','P = performance; A = accessibility; BP = best practices. Homepage transfer and scripts are below the requested 1 MB / 100 KB budgets. INP requires actual interactions and field traffic; TBT is a lab responsiveness signal, not a claim of measured field INP.','']
(out/'LIGHTHOUSE.md').write_text('\n'.join(lines));print('Exported all',len(rows),'Lighthouse rows')
