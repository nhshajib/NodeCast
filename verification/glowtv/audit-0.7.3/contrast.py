"""WCAG 2 relative luminance; exact palette literals read from production tokens."""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[3]
s=(ROOT/'apps/player/src/designTokens.ts').read_text()
def token(family,name):
 body=re.search(r'\b'+family+r': \{([^}]+)',s)[1]
 return re.search(r'\b'+name+r": '(#[0-9A-Fa-f]{6})'",body)[1]
def lum(c):
 vals=[int(c[i:i+2],16)/255 for i in (1,3,5)]
 vals=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in vals]
 return sum(a*b for a,b in zip(vals,[.2126,.7152,.0722]))
def ratio(a,b):
 x,y=sorted([lum(a),lum(b)]);return (y+.05)/(x+.05)
N=lambda n:token('neutral',n)
P=lambda n:token('primary',n)
S=lambda n:token('semantic',n)
checks=[]
def check(label,fg,bg,minimum=4.5):
 r=ratio(fg,bg);checks.append({'pair':label,'foreground':fg,'background':bg,'ratio':round(r,3),'minimum':minimum,'passed':r>=minimum})
check('primary action, both themes',P('ink'),P('action'))
for theme in ['light','dark']:
 backgrounds=[N('light'),N('white'),N('lightSurface')] if theme=='light' else [N('dark'),N('night'),N('darkPanel'),N('darkSurface')]
 for bg in backgrounds:
  check(theme+' primary text',N('ink') if theme=='light' else N('onDark'),bg)
  check(theme+' secondary text',N('muted') if theme=='light' else N('darkMuted'),bg)
  check(theme+' links / selected state icons',P('link') if theme=='light' else P('onDark'),bg)
 check(theme+' selected programme title',N('ink') if theme=='light' else N('onDark'),P('subtle') if theme=='light' else P('darkSubtle'))
 check(theme+' selected chips',P('ink') if theme=='light' else P('onDark'),P('subtle') if theme=='light' else P('darkSubtle'))
 check(theme+' destructive actions',S('red') if theme=='light' else S('onDark'),S('lightSurface') if theme=='light' else S('darkSurface'))
 check(theme+' progress fill against track',P('link') if theme=='light' else P('onDark'),N('lightBorder') if theme=='light' else N('darkBorder'),3)
check('TV progress fill against video track',P('action'),N('darkBorder'),3)
check('LIVE badge',N('white'),S('red'))
check('video text at darkest scrim edge over white video',N('white'),'#4C4C4C')
for bg in [P('action'),N('night'),N('white')]:
 white=ratio(N('white'),bg);night=ratio(N('night'),bg)
 checks.append({'pair':'two-tone TV focus ring on '+bg,'outerRatio':round(white,3),'innerRatio':round(night,3),'effectiveRatio':round(max(white,night),3),'minimum':3,'passed':max(white,night)>=3})
path=Path(__file__).parent/'contrast.json';path.write_text(json.dumps(checks,indent=2)+'\n')
for item in checks:
 if not item['passed']:print('FAIL',item)
print(f'{sum(c["passed"] for c in checks)}/{len(checks)} contrast checks pass')
raise SystemExit(0 if all(c['passed'] for c in checks) else 1)
