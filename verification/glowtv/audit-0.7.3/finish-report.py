"""Collect actual completed-run evidence; never turn a missing check into a pass."""
from pathlib import Path
import json,re,hashlib
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
checks=json.loads((HERE/'checks.json').read_text());browser=json.loads((HERE/'browser-audit.json').read_text());contrast=json.loads((HERE/'contrast.json').read_text())
assert len(browser)==14 and all(x['passed'] for x in browser), 'Incomplete screenshot matrix'
assert all(c['passed'] for c in contrast)
supplement=json.loads((HERE/'browser-audit-tv-dp1080.json').read_text());assert len(supplement)==2 and all(x['passed'] for x in supplement)
log=Path('/tmp/glowtv-073-phase4.log').read_text();tests=Path('/tmp/glowtv-073-phase4-tests.log').read_text()
assert 'Phase phase4 checks passed' in log and re.search(r'tests\s+137',tests)
checks['phases']['low']={'npmCi':True,'typecheck':True,'tests':137,'exports':['ios/shared web','android phone web','tv web'],'grid':True,'protectedScope':True,'cleanMetroCachePerVariant':True}
exports={}
for platform,directory in [('ios','/tmp/glowtv-web'),('android','/tmp/glowtv-android-web'),('tv','/tmp/glowtv-tv-web')]:
 p=Path(directory);scripts=re.findall(r'<script[^>]+src="([^"]+)',(p/'index.html').read_text());exports[platform]={s:hashlib.sha256((p/s.lstrip('/')).read_bytes()).hexdigest() for s in scripts}
assert exports['ios']!=exports['android'] and exports['tv']!=exports['ios']
checks['finalExports']=exports
checks['browser']={'passed':True,'contexts':len(browser),'screenshots':sum(len(x['screenshots']) for x in browser),'viewportOverflowFailures':sum(g['overflow'] for x in browser for g in x['geometries']),'pageErrors':[e for x in browser for e in x['pageErrors']],'details':'browser-audit.json','scope':'RN Web preview, not native device verification','textScale':'1 and 2 on iPhone/Android/iPad; 1 on TV; four RN Web Dimensions constants patched only in test responses for scale 2'}
checks['supplementaryTV']={'contexts':2,'screenshots':sum(len(x['screenshots']) for x in supplement),'logicalViewport':{'width':960,'height':540},'pixelDensity':2,'outputSize':{'width':1920,'height':1080},'passed':True,'details':'browser-audit-tv-dp1080.json','nativeDeviceTest':False}
checks['contrast']={'passed':True,'pairs':len(contrast),'minimumTextRatio':min(x['ratio'] for x in contrast if x.get('minimum')==4.5),'details':contrast}
checks['browser']['viewports']={'ios':[393,852],'android':[412,915],'ipad':[1032,1376],'tv':[1920,1080]}
checks['nativeOnly']=['Not verified: native TV ring, D-pad restoration/navigation and IME flows','Not verified: CH+/−, INFO/GUIDE and media keys on Fire TV/Android TV','Not verified: iPad multitasking and rotation','Not verified: VoiceOver/TalkBack announcements and maximum native Dynamic Type','Not verified: native cold detail-link restoration from secure vault/cache','Not verified: exact native mini-player position relative to NativeTabs']
checks['nativeBuildRequired']='Yes, for changed orientation configuration and existing TV native-controller code; no native module was added. No native builds or releases were produced.'
(HERE/'checks.json').write_text(json.dumps(checks,indent=2)+'\n')
(HERE/'verification.txt').write_text(log+re.sub(r'.*?(ℹ tests)',r'\1',tests,flags=re.S))
print(checks['browser']);print('Contrast:',len(contrast),'passed')

lines=['# Browser screenshot index','', 'These are RN Web previews using an original synthetic demo playlist. They do not verify native playback, remote keys, rotation or screen readers.','']
for result in [*browser,*supplement]:
 lines.extend(['## '+result['case'],''])
 for shot in result['screenshots']:
  filename=Path(shot).name
  title=filename.removeprefix(result['case']+'-').removesuffix('.png').replace('-',' ').capitalize()
  lines.append(f'- [{title}](after/{filename})')
 lines.append('')
(HERE/'SCREENSHOTS.md').write_text('\n'.join(lines)+'\n')
