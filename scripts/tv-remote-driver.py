"""Navigate actual Android focus using D-pad/Select only. Text uses keyboard input, never touch."""
import collections,re,subprocess,time,xml.etree.ElementTree as ET
visited=[]
def adb(*args):
 if args[:2]==('shell','input') and len(args)>2 and args[2] in ['tap','swipe']:raise RuntimeError('Touch input is forbidden in the TV remote audit')
 return subprocess.check_output(['adb',*map(str,args)],text=True).strip()
def tree():
 adb('shell','uiautomator','dump','/sdcard/tv-remote.xml');return ET.fromstring(adb('shell','cat','/sdcard/tv-remote.xml'))
def bounds(n):
 a=list(map(int,re.findall(r'\d+',n.get('bounds',''))));return a if len(a)==4 else [0,0,0,0]
def name(n):return (n.get('content-desc') or n.get('text') or '').strip()
def match(n,label):
 return name(n).casefold()==label.casefold() or re.search(r'(?<!\w)'+re.escape(label.casefold())+r'(?!\w)',(n.get('content-desc') or '').casefold()) is not None
def actions(root):return [n for n in root.iter('node') if n.get('enabled')!='false' and n.get('focusable')=='true' and (n.get('clickable')=='true' or n.get('class')=='android.widget.EditText') and bounds(n)[2]>bounds(n)[0] and bounds(n)[3]>bounds(n)[1]]
def score(a,b,key):
 a,b=bounds(a),bounds(b);ax,ay=(a[0]+a[2])/2,(a[1]+a[3])/2;bx,by=(b[0]+b[2])/2,(b[1]+b[3])/2
 horizontal=key in [21,22];primary=(bx-ax) if horizontal else (by-ay);positive=key in [20,22]
 if (primary<=2 if positive else primary>=-2):return None
 cross=(by-ay) if horizontal else (bx-ax);beam=(b[3]>a[1] and b[1]<a[3]) if horizontal else (b[2]>a[0] and b[0]<a[2]);return primary*primary+4*cross*cross+(0 if beam else 100000)
def route(nodes,start,goal):
 queue=collections.deque([(start,[])]);seen={start}
 while queue:
  i,path=queue.popleft()
  if i==goal:return path
  for key in [19,20,21,22]:
   targets=[(score(nodes[i],n,key),j) for j,n in enumerate(nodes) if j!=i];targets=[(s,j) for s,j in targets if s is not None]
   if targets:
    j=min(targets)[1]
    if j not in seen:seen.add(j);queue.append((j,path+[key]))
 return []
def focused(root):return next((n for n in root.iter('node') if n.get('focused')=='true'),None)
def key(code):adb('shell','input','keyevent',code);time.sleep(.15)
def focus(label,timeout=100):
 end=time.monotonic()+timeout;seen=collections.Counter();scan=20
 while time.monotonic()<end:
  root=tree();nodes=actions(root);current=focused(root)
  goals=[i for i,n in enumerate(nodes) if match(n,label)];goals.sort(key=lambda i:name(nodes[i]).casefold()!=label.casefold())
  if current is not None and goals:
   goal=nodes[goals[0]]
   if name(current)==name(goal) and bounds(current)==bounds(goal):return current
  if not nodes:key(20);continue
  i=next((i for i,n in enumerate(nodes) if n.get('focused')=='true'),None)
  if i is None:key(20);continue
  path=route(nodes,i,goals[0]) if goals else []
  signature=(name(nodes[i]),tuple(bounds(nodes[i])),tuple(name(n) for n in nodes));seen[signature]+=1
  if path and seen[signature]<3:
   for direction in path[:3]:key(direction)
   continue
  elif goals:
   a,b=bounds(nodes[i]),bounds(nodes[goals[0]]);dx=b[0]+b[2]-a[0]-a[2];dy=b[1]+b[3]-a[1]-a[3];direction=(22 if dx>0 else 21) if abs(dx)>abs(dy) else (20 if dy>0 else 19)
   if seen[signature]>2:direction=[19,22,20,21][seen[signature]%4]
  else:
   # Enter content from the persistent sidebar before scrolling the main pane.
   a=bounds(nodes[i]);direction=22 if a[2]<480 and name(nodes[i]) in ['Live TV','Movies','Series','Favorites','Settings','Connection details in Settings'] else scan
   if seen[signature]>2:scan=19 if scan==20 else 20;direction=scan
  key(direction)
 raise RuntimeError('Remote cannot reach: '+label+'; focused='+str(name(current) if current is not None else None))
def activate(label,timeout=100):
 n=focus(label,timeout);assert match(n,label);key(23);visited.append(label);print('Remote Select: '+label,flush=True)
def fill(label,value):
 activate(label);time.sleep(.5);adb('shell','input','keyevent','123',*(['67']*100));adb('shell','input','text',value);key(66);time.sleep(.4)
 # IME-specific Back is allowed, but never dismiss the screen itself.
 state=adb('shell','dumpsys','input_method')
 if 'mInputShown=true' in state or 'isInputViewShown=true' in state:key(4)
def reveal(label,timeout=30):
 end=time.monotonic()+timeout;last=None;direction=20
 while time.monotonic()<end:
  r=tree()
  if any(match(n,label) for n in r.iter('node')):return
  current=focused(r);state=(name(current) if current is not None else '',tuple(name(n) for n in actions(r)))
  if state==last:direction=19 if direction==20 else 20
  last=state;key(direction)
 raise RuntimeError('Remote cannot reveal: '+label)
def horizontal(label,direction,max_steps=30):
 for _ in range(max_steps):
  r=tree();n=focused(r)
  if n is not None and match(n,label):key(23);visited.append(label);return
  key(direction)
 raise RuntimeError('Remote horizontal row cannot reach: '+label)
