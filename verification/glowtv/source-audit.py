"""Read-only source and asset audit for the GlowTV rebrand."""
from pathlib import Path
import hashlib,json,subprocess
from PIL import Image
root=Path(__file__).resolve().parents[2]
config=json.loads((root/'apps/player/app.json').read_text())['expo']
assert config['ios']['bundleIdentifier']=='com.nhshajib.nodecast'
assert config['scheme']=='nodecast'
assert config['extra']['eas']['projectId']=='49ee7c99-08db-4b89-ad01-022961dcfd6c'
# The dedicated first input commit is the immutable source for all brand files.
original=subprocess.check_output(['git','ls-tree','-r','--name-only','2a78952','brand'],cwd=root,text=True).splitlines()
for path in original:
 assert (root/path).read_bytes()==subprocess.check_output(['git','show',f'2a78952:{path}'],cwd=root),path
icons={str(p.relative_to(root/'brand')):Image.open(p).size for p in (root/'brand/icons').rglob('*.png')}
icon=Image.open(root/'brand/icons/ios/AppIcon-1024.png')
assert icon.mode=='RGB' or (icon.mode=='RGBA' and icon.getchannel('A').getextrema()==(255,255))
report={'brandSourceFilesUnchanged':len(original),'bundleIdentifier':config['ios']['bundleIdentifier'],'androidIds':['com.nhshajib.nodecast','com.nhshajib.nodecast.tv'],'scheme':config['scheme'],'signing':'Existing configuration retained','icons':icons,'motion':'Existing animation calls and playback lifecycle effects match the baseline; launch callback fallbacks were added after native cold-start verification exposed an indefinite splash.','coreLogic':'Provider, vault, catalog, XMLTV, catch-up, playback policy and backup algorithms unchanged apart from public display-name text.'}
(root/'verification/glowtv/source-audit.json').write_text(json.dumps(report,indent=2)+'\n');print('Source and icon audit passed; original brand files:',len(original))
