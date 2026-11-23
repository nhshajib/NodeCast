"""Derive website metadata from the exact signed APKs and their aapt output."""
import hashlib,json,os,re,sys
from pathlib import Path
root=Path(sys.argv[1]);assets={}
for name in ['GlowTV.apk','GlowTV-TV.apk','GlowTV-TV-armeabi-v7a.apk']:
    candidates=list(root.rglob(name))
    if not candidates: continue
    if len(candidates)!=1: raise SystemExit(f'Ambiguous artifact: {name}')
    apk=candidates[0];manifest=(apk.parent/'apk-manifest.txt').read_text()
    sdk=re.search(r"sdkVersion:'(\d+)'",manifest)
    if not sdk: raise SystemExit(f'Missing actual minimum SDK: {name}')
    assets[name]={'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'size':apk.stat().st_size,'minimumOS':f'Android API {sdk.group(1)} or later'}
if not assets: raise SystemExit('No verified APKs found')
(root/'release-metadata.json').write_text(json.dumps({'sourceCommit':os.environ.get('GITHUB_SHA'),'assets':assets},indent=2)+'\n')
