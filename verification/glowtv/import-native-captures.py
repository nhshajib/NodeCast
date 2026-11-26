"""Import successful native audit artifacts, requiring real results and all eight captures.

Usage: python import-native-captures.py ios /tmp/unzipped --run 123 --source SHA
Android inputs are the extracted emulator audit artifact; Apple inputs contain
resume[-ipad]-captures/manifest.json and resume[-ipad]-summary.json.
"""
import argparse, hashlib, json, re, shutil
from pathlib import Path
from PIL import Image

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('platform',choices=['ios','ipad','android','tv'])
parser.add_argument('directory',type=Path)
parser.add_argument('--run',required=True)
parser.add_argument('--source',required=True)
parser.add_argument('--capture-source',help='Capture harness commit, if different from the native app source')
parser.add_argument('--build-run',help='APK source build, when different from the capture workflow')
parser.add_argument('--app-version',help='Version verified from the compiled package; selects the matching player geometry')
parser.add_argument('--evidence-only',action='store_true',help='Validate an additional Android API without replacing the selected gallery captures')
args=parser.parse_args();platform=args.platform
out=Path(__file__).resolve().parent/'native'
screens=['home','guide','player','movies','series','playlists','search','settings']
files={};workflow=f'https://github.com/nhshajib/NodeCast/actions/runs/{args.run}'
if platform in ('ios','ipad'):
 prefix='resume-ipad'if platform=='ipad'else'resume'
 summary=json.loads((args.directory/(prefix+'-summary.json')).read_text())
 assert summary.get('passedTests',0)>0 and summary.get('failedTests')==0 and summary.get('result')=='Passed',summary
 capture=args.directory/(prefix+'-captures')
 for test in json.loads((capture/'manifest.json').read_text()):
  for item in test.get('attachments',[]):
   match=re.match(platform+r'-(home|guide|player|movies|series|playlists|search|settings)_',item.get('suggestedHumanReadableName',''))
   if match and not item.get('isAssociatedWithFailure'):files[match[1]]=capture/item['exportedFileName']
 result={key:summary[key]for key in ['result','passedTests','failedTests']}
 result['device']=summary['devicesAndConfigurations'][0]['device']
 result['scope']='Native simulator UI tests and captures; physical-device testing is separate.'
else:
 target='mobile'if platform=='android'else'tv'
 result_path=next(args.directory.rglob(f'emulator-design-{target}-result.json'))
 result=json.loads(result_path.read_text())
 assert result['native']and set(result['screens'])==set(screens),result
 for screen in screens:files[screen]=result_path.parent/f'emulator-design-{target}-{screen}.png'
assert set(files)==set(screens),f'Missing native captures: {set(screens)-set(files)}'
expected={'ios':(1320,2868),'ipad':(2064,2752),'android':(1080,1920),'tv':(1920,1080)}[platform]
for screen,file in files.items():
 assert file.is_file(),file
 with Image.open(file)as image:assert image.size==expected,(file,image.size,expected)
# The original video has a large green band; player chrome
# alone must never qualify a black native video surface for the website.
with Image.open(files['player'])as image:
 image=image.convert('RGB');width,height=image.size
 # Phone top scrims darken the upper scene and the native header
 # overlaps .14-.16. Inspect the original dark scene immediately above the
 # green video band, beneath the scrim/header. Keep both strict color
 # assertions: a black surface or green-only UI must still fail.
 # 1.0.4 adds opaque transport buttons across the older Android probe. Probe
 # below them, above the original green scene band. Keep both color ranges
 # and thresholds unchanged: black video or green UI alone still cannot pass.
 version=tuple(map(int,args.app_version.split('.')))if args.app_version else (0,)
 top,bottom=(.4,.44)if platform=='tv'else(.22,.23)if platform=='ios'else((.245,.255)if version>=(1,0,4)else(.23,.24))if platform=='android'else(.14,.16)
 scene=list(image.crop((int(width*.2),int(height*top),int(width*.8),int(height*bottom))).get_flattened_data())
 dark=sum(14<r<24 and 48<g<59 and 37<b<47 for r,g,b in scene)/len(scene)
 assert dark>.5,f'No original dark scene background in {platform} player capture ({dark:.4f})'
 image.thumbnail((160,320));pixels=list(image.get_flattened_data())
 green=sum(r<50 and 150<g<230 and 70<b<160 for r,g,b in pixels)/len(pixels)
 assert green>.01,f'No original decoded green scene in {platform} player capture ({green:.4f})'
out.mkdir(parents=True,exist_ok=True)
if args.evidence_only:
 assert platform in ('android','tv') and result.get('androidApi'), 'Additional API evidence requires Android results'
label=f'{platform}-api{result["androidApi"]}'if args.evidence_only else platform
for screen,file in files.items():
 if not args.evidence_only or screen=='player':
  shutil.copyfile(file,out/f'{label}-{screen}.png')
  # A complete new run supersedes any one-off provenance override for the old image.
  (out/f'{label}-{screen}-provenance.json').unlink(missing_ok=True)
result.update(workflow=workflow,source=args.source)
if args.app_version:result['appVersion']=args.app_version
if args.capture_source:result['captureSource']=args.capture_source
if args.build_run:result['buildWorkflow']=f'https://github.com/nhshajib/NodeCast/actions/runs/{args.build_run}'
(out/f'{label}-audit.json').write_text(json.dumps(result,indent=2)+'\n')
(out/f'{label}-frame-audit.json').write_text(json.dumps({'workflow':workflow,'source':args.source,'capture':f'{label}-player.png','sha256':hashlib.sha256(files['player'].read_bytes()).hexdigest(),'greenVideoBandFraction':green,'darkSceneRegionFraction':dark,'darkSceneNormalizedBounds':[.2,top,.8,bottom],'result':'Both original scene colors are present in the native player capture','scope':'Native screenshot inspection; physical-device playback is separate.'},indent=2)+'\n')
print(f'Imported all eight {platform} native captures from passing {platform} UI results in workflow {args.run}')
