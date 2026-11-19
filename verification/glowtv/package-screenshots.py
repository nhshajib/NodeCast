"""Package app renders, preferring verified native captures over browser candidates.

Native originals go in verification/glowtv/native/<platform>-<screen>.png.
No generated device chrome, replacement text or artwork is added to a capture.
"""
from pathlib import Path
from PIL import Image
import json, shutil
ROOT=Path(__file__).resolve().parents[2];SOURCE=ROOT/'verification/glowtv';WEB=ROOT/'website/public/screenshots'
SCREENS=['home','guide','player','movies','series','playlists','search','settings']
metadata={};provenance=[]
for platform in ['ios','ipad','android','tv']:
 metadata[platform]={}
 for screen in SCREENS:
  name=f'{platform}-{screen}';native=SOURCE/'native'/(name+'.png');capture=native if native.exists() else SOURCE/(name+'.png')
  target=ROOT/'store-assets'/('ios' if platform=='ipad' else platform);target.mkdir(parents=True,exist_ok=True)
  image=Image.open(capture).convert('RGB');original=image.size
  usable=True
  if platform=='ipad' and screen=='player':
   # A playing-state control alone is not proof of a decoded simulator frame.
   region=image.crop((0,0,image.width,image.height//2));pixels=region.get_flattened_data()
   usable=sum(r<50 and 150<g<230 and 70<b<160 for r,g,b in pixels)/(region.width*region.height)>.01
  item={'platform':platform,'screen':screen,'native':native.exists(),'usableForMarketing':usable,'source':str(capture.relative_to(ROOT)),'width':original[0],'height':original[1]}
  if not usable:item['limitation']='The iPad simulator snapshot has a black video surface. Keep this diagnostic capture out of marketing until a decoded-frame/device capture is verified.'
  if native.exists():
   audit_path=SOURCE/'native'/(platform+'-audit.json')
   if audit_path.exists():
    audit=json.loads(audit_path.read_text());item['captureEvidence']={'workflow':audit.get('workflow'),'sourceCommit':audit.get('source')}
   override_path=SOURCE/'native'/(name+'-provenance.json')
   if override_path.exists():item['captureEvidence']=json.loads(override_path.read_text())
  provenance.append(item)
  if usable:shutil.copyfile(capture,target/(name+'.png'))
  else:(target/(name+'.png')).unlink(missing_ok=True)
  if platform=='ipad':continue
  image.thumbnail((960 if platform=='tv' else 720,3000));image.save(WEB/(name+'.png'),optimize=True);image.save(WEB/(name+'.webp'),'WEBP',quality=82,method=6)
  metadata[platform][screen]={'width':image.width,'height':image.height,'native':native.exists()}
  small=image.copy();small.thumbnail((360,1000));small.save(WEB/(name+'-small.webp'),'WEBP',quality=76,method=6)
  if platform=='ios' and screen=='home':
   medium=image.copy();medium.thumbnail((480,1500));medium.save(WEB/(name+'-medium.webp'),'WEBP',quality=82,method=6)
for slug,platform in [('iphone','ios'),('android','android'),('tv','tv')]:
 image=Image.open(ROOT/'brand/web/og-image-1200x630.png').convert('RGB');capture=ROOT/'store-assets'/platform/(platform+'-home.png');shot=Image.open(capture).convert('RGB');shot.thumbnail((390,520));image.paste(shot,(800 if platform!='tv' else 780,60));image.save(ROOT/'website/public'/('og-'+slug+'.png'),optimize=True)
metadata.pop('ipad');(ROOT/'website/src/data/screenshots.json').write_text(json.dumps(metadata,indent=2)+'\n');(SOURCE/'screenshot-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
print('Packaged',len(provenance),'screens;',sum(p['native'] for p in provenance),'native captures;',sum(p['usableForMarketing'] for p in provenance),'usable for marketing')
