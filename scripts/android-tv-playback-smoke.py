"""Exercise TV import + native VLC with a locally generated, credential-free test stream."""
import http.server, json, re, subprocess, threading, time, tempfile
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
  nodes=[n for n in root.iter('node') if n.get('content-desc')==label or n.get('text')==label]
  nodes.sort(key=lambda n:n.get('clickable')!='true')
  for n in nodes:
   b=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
   if len(b)==4 and b[2]>b[0] and b[3]>b[1] and b[3]<=height and b[1]>=0:return b
  if scroll: adb('shell','input','swipe',str(width//2),str(int(height*.75)),str(width//2),str(int(height*.3)),'350')
  time.sleep(.5)
 raise RuntimeError(f'UI not found: {label}')
def click(label,scroll=False):
 x1,y1,x2,y2=find(label,scroll=scroll);adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(.5)
def text(label,value):
 click(label,True);adb('shell','input','text',value);time.sleep(.3)

with tempfile.TemporaryDirectory(prefix='nodecast-test-video-') as folder:
 video=Path(folder)/'test.ts'
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc=size=640x360:rate=24','-t','25','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-f','mpegts',str(video)],check=True)
 class Handler(http.server.BaseHTTPRequestHandler):
  def log_message(self,*args):pass
  def do_GET(self):
   if self.path.split('?')[0].endswith('.ts'):
    body=video.read_bytes(); self.send_response(200);self.send_header('Content-Type','video/mp2t');self.send_header('Content-Length',str(len(body)));self.end_headers()
    try:self.wfile.write(body)
    except (BrokenPipeError,ConnectionResetError):pass
    return
   if 'get_live_categories' in self.path:value=[{'category_id':'1','category_name':'Smoke test'}]
   elif 'get_live_streams' in self.path:value=[{'stream_id':1,'name':'Example Live Test','category_id':'1'}]
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
  adb('shell','input','keyevent','4');find('Play Example Live Test')
  OUT.joinpath('emulator-tv-playback-result.json').write_text(json.dumps({'passed':['Local synthetic Xtream connection','Native VLC reports playing H.264 MPEG-TS','Remote Back returns to library'],'scope':'Android x86-64 emulator with generated test-pattern video; physical devices and real-provider streams remain unverified.'},indent=2)+'\n')
  print('Native TV import, VLC test stream and remote Back passed.')
 finally:server.shutdown()
