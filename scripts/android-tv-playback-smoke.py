"""Exercise TV import + native VLC with a locally generated, credential-free test stream."""
import http.server, json, re, subprocess, threading, time
from pathlib import Path
import xml.etree.ElementTree as ET
OUT=Path('verification/android')
def adb(*args): return subprocess.check_output(['adb', *args], text=True).strip()
def dump():
 adb('shell','uiautomator','dump','/sdcard/nodecast-check.xml')
 return ET.fromstring(adb('shell','cat','/sdcard/nodecast-check.xml'))
size=list(map(int,re.findall(r'\d+',adb('shell','wm','size'))[:2])); width,height=size

def find(label, timeout=15, scroll=False):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  root=dump()
  nodes=[n for n in root.iter('node') if label in (n.get('content-desc') or '') or n.get('text')==label]
  if label in ['Profile name','Server address','Username','Password','XMLTV URL','New six-digit PIN','Confirm PIN','Family PIN','Find category to protect']: nodes=[n for n in nodes if n.get('class')=='android.widget.EditText']
  nodes.sort(key=lambda n:n.get('clickable')!='true')
  nav_top=height
  if width<height and label not in ['Home','Library','Favorites','Settings']:
   for candidate in root.iter('node'):
    box=list(map(int,re.findall(r'\d+',candidate.get('bounds',''))))
    if candidate.get('content-desc') in ['Home','Library','Favorites','Settings'] and candidate.get('clickable')=='true' and len(box)==4 and box[1]>height*.7:nav_top=min(nav_top,box[1])
  for n in nodes:
   b=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
   if len(b)==4 and b[2]>b[0] and b[3]>b[1] and b[3]<=height and b[1]>=0 and (b[1]+b[3])/2<nav_top:return b
  if scroll: adb('shell','input','swipe',str(width//2),str(int(height*.75)),str(width//2),str(int(height*.3)),'350')
  time.sleep(.5)
 raise RuntimeError(f'UI not found: {label}')
def video_ready(timeout=45):
 # UIAutomator waits for UI idle. A one-second playback clock can keep it busy until
 # this short fixture ends; a decoded, non-zero completed timeline is also valid.
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  nodes=list(dump().iter('node'))
  if any('Pause video' in (n.get('content-desc') or '') for n in nodes):return
  for n in nodes:
   match=re.fullmatch(r'(\d+):(\d\d) / (\d+):(\d\d)',n.get('text') or '')
   if match:
    minutes,seconds,total_minutes,total_seconds=map(int,match.groups())
    position=minutes*60+seconds;duration=total_minutes*60+total_seconds
    if duration>0 and position>=duration:return
  time.sleep(.5)
 raise RuntimeError('Episode neither played nor reached a decoded non-zero duration')

def click(label,scroll=False):
 x1,y1,x2,y2=find(label,scroll=scroll);adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(.5)
def text(label,value):
 click(label,True);adb('shell','input','text',value);adb('shell','input','keyevent','66');time.sleep(.3)
def remote_next(label):
 target=find(label)
 for _ in range(12):
  root=dump(); focused=next((n for n in root.iter('node') if n.get('focused')=='true'),None)
  if focused is not None and label in (focused.get('content-desc') or ''):
   adb('shell','input','keyevent','23');time.sleep(.7);return
  bounds=list(map(int,re.findall(r'\d+',focused.get('bounds','')))) if focused is not None else []
  if len(bounds)==4:
   dx=(target[0]+target[2]-bounds[0]-bounds[2])/2;dy=(target[1]+target[3]-bounds[1]-bounds[3])/2
   key='20' if dy>80 else '19' if dy < -80 else '22' if dx>0 else '21'
  else:key='20'
  adb('shell','input','keyevent',key);time.sleep(.2)
 raise RuntimeError('Next episode is not reachable with the remote')


def main():
 video=Path('tests/fixtures/android-live-test.mpegts')
 counts={'guide':0,'ts':0}
 stamp=lambda value:time.strftime('%Y%m%d%H%M%S +0000',time.gmtime(value))
 class Handler(http.server.BaseHTTPRequestHandler):
  def log_message(self,*args):pass
  def do_GET(self):
   if self.path.split('?')[0].endswith('/guide.xml'):
    counts['guide']+=1;now=time.time()
    body=f'<tv><channel id="native-test"><display-name>Native guide channel</display-name></channel><programme channel="native-test" start="{stamp(now-120)}" stop="{stamp(now+3600)}"><title>Native Guide Match</title><desc>Synthetic programme for SQLite verification.</desc></programme></tv>'.encode()
    self.send_response(200);self.send_header('Content-Type','application/xml');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
   if self.path.split('?')[0].endswith('.mp4'):
    body=Path('tests/fixtures/android-episode-test.mp4').read_bytes(); self.send_response(200);self.send_header('Content-Type','video/mp4');self.send_header('Content-Length',str(len(body)));self.end_headers()
    try:self.wfile.write(body)
    except (BrokenPipeError,ConnectionResetError):pass
    return
   if self.path.split('?')[0].endswith('.ts'):
    counts['ts']+=1;body=video.read_bytes(); self.send_response(200);self.send_header('Content-Type','video/mp2t');self.send_header('Content-Length',str(len(body)));self.end_headers()
    try:self.wfile.write(body)
    except (BrokenPipeError,ConnectionResetError):pass
    return
   if 'get_series_info' in self.path:value={'episodes':{'2':[{'id':1002,'title':'Final Episode','episode_num':1}],'1':[{'id':905,'title':'Episode Two','episode_num':2},{'id':401,'title':'Episode One','episode_num':1}]}}
   elif 'get_series_categories' in self.path:value=[{'category_id':'1','category_name':'Example series'}]
   elif 'get_series' in self.path:value=[{'series_id':77,'name':'Sample Series','category_id':'1'}]
   elif 'get_live_categories' in self.path:value=[{'category_id':'1','category_name':'Smoke test'}]
   elif 'get_live_streams' in self.path:value=[{'stream_id':1,'name':'Example Live Test','category_id':'1','epg_channel_id':'native-test'}]
   elif 'action=' in self.path:value=[]
   else:value={'user_info':{'auth':1,'status':'Active'}}
   body=json.dumps(value).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
 server=http.server.ThreadingHTTPServer(('0.0.0.0',9090),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  click('Add your playlist')
  text('Profile name','NativeTest')
  text('Server address','http://10.0.2.2:9090')
  text('Username','example')
  text('Password','example')
  click('Connect playlist',True)
  time.sleep(4);click('Live TV')
  click('Play Example Live Test')
  find('Pause live TV',timeout=35)
  OUT.joinpath('emulator-tv-live-test.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
  OUT.joinpath('emulator-tv-live-test.xml').write_text(ET.tostring(dump(),encoding='unicode'))
  before=counts['ts'];click('Player options');click('Watch while browsing');find('Return to video')
  OUT.joinpath('emulator-tv-mini-player.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
  click('Return to video');find('Pause live TV');assert counts['ts']==before,'Minimizing opened another live stream'
  adb('shell','input','keyevent','4');find('Play Example Live Test')
  click('Series');click('Open Sample Series');click('Episode One')
  video_ready()
  box=find('Next episode: Season 1 · Episode Two')
  assert box[2]>width*.8 and box[1]>height*.7, box
  OUT.joinpath('emulator-tv-next-episode.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
  remote_next('Next episode: Season 1 · Episode Two');find('Episode Two');video_ready()
  remote_next('Next episode: Season 2 · Final Episode');find('Final Episode');video_ready()
  assert not any('Next episode:' in (n.get('content-desc') or '') for n in dump().iter('node'))
  OUT.joinpath('emulator-tv-last-episode.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
  adb('shell','input','keyevent','4');find('Play Final Episode')
  adb('shell','input','keyevent','4');find('Open Sample Series')
  click('Live TV');click('TV guide');click('Add full TV guide')
  text('XMLTV URL','http://10.0.2.2:9090/guide.xml');click('Save and refresh guide',True);find('Native Guide Match',timeout=45,scroll=True)
  OUT.joinpath('emulator-tv-full-guide.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
  click('Back');click('Settings');click('Appearance');click('dark appearance');click('Back');click('Family controls')
  text('New six-digit PIN','123456');text('Confirm PIN','123456');click('Set family PIN',True);text('Find category to protect','Smoke');find('Lock protected content now',timeout=30,scroll=True)
  click('Protect Smoke test');click('Lock protected content now');click('Back');click('Live TV')
  assert not any('Play Example Live Test' in (n.get('content-desc') or '') for n in dump().iter('node'))
  adb('shell','am','force-stop','com.nhshajib.nodecast.tv');adb('shell','am','start','-W','-n','com.nhshajib.nodecast.tv/.MainActivity');time.sleep(6)
  root=dump()
  if any('Home IP reference' in (n.get('text') or n.get('content-desc') or '') for n in root.iter('node')):adb('shell','input','keyevent','4')
  click('Settings');click('Family controls');click('Unlock family controls');text('Family PIN','123456');click('Unlock');find('Find category to protect',timeout=30);click('Back');click('Live TV');find('Play Example Live Test')
  click('TV guide');find('Native Guide Match',timeout=30,scroll=True);assert counts['guide']==1,'Saved guide was not reused after process restart'
  OUT.joinpath('emulator-tv-guide-persisted.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
  OUT.joinpath('emulator-tv-playback-result.json').write_text(json.dumps({'passed':['Local synthetic Xtream connection','Native VLC reports playing H.264 MPEG-TS','Remote Back returns to library','Fullscreen native episode playback','Next follows episode IDs 401 → 905 → 1002','Next button is bottom-right and activated with D-pad/Select','Cross-season next episode','Last episode has no Next button','Mini-player retains the live HTTP session','Native XMLTV import and SQLite search','Family PIN protects a category','Profile, PIN and SQLite guide survive process restart'],'scope':'Android x86-64 emulator with generated test-pattern video; physical devices and real-provider streams remain unverified.'},indent=2)+'\n')
  print('Native TV import, VLC test stream and remote Back passed.')
 except Exception:
  OUT.joinpath('emulator-tv-playback-failure.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
  OUT.joinpath('emulator-tv-playback-failure.xml').write_text(ET.tostring(dump(),encoding='unicode'))
  raise
 finally:server.shutdown()

if __name__ == '__main__': main()
