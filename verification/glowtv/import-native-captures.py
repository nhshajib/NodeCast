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
 image=image.convert('RGB');image.thumbnail((160,320));pixels=list(image.get_flattened_data())
 green=sum(r<50 and 150<g<230 and 70<b<160 for r,g,b in pixels)/len(pixels)
 assert green>.01,f'No original decoded green scene in {platform} player capture ({green:.4f})'
out.mkdir(parents=True,exist_ok=True)
for screen,file in files.items():shutil.copyfile(file,out/f'{platform}-{screen}.png')
result.update(workflow=workflow,source=args.source)
if args.capture_source:result['captureSource']=args.capture_source
if args.build_run:result['buildWorkflow']=f'https://github.com/nhshajib/NodeCast/actions/runs/{args.build_run}'
(out/f'{platform}-audit.json').write_text(json.dumps(result,indent=2)+'\n')
(out/f'{platform}-frame-audit.json').write_text(json.dumps({'workflow':workflow,'source':args.source,'capture':f'{platform}-player.png','sha256':hashlib.sha256(files['player'].read_bytes()).hexdigest(),'greenVideoBandFraction':green,'result':'Original decoded scene pixels are present in the native player capture','scope':'Native screenshot inspection; physical-device playback is separate.'},indent=2)+'\n')
print(f'Imported all eight {platform} native captures from successful workflow {args.run}')
