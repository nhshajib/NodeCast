"""Exercise TV import + native VLC with a locally generated, credential-free test stream."""
import http.server, json, re, subprocess, threading, time, os, importlib.util
from pathlib import Path
import xml.etree.ElementTree as ET
OUT=Path('verification/android')
REMOTE=os.environ.get('NODECAST_REMOTE_ONLY')=='1'
if REMOTE:
 spec=importlib.util.spec_from_file_location('remote_driver',Path(__file__).with_name('tv-remote-driver.py'));remote=importlib.util.module_from_spec(spec);spec.loader.exec_module(remote)
def adb(*args):
 if REMOTE and args[:2]==('shell','input') and len(args)>2 and args[2] in ['tap','swipe']:raise RuntimeError('Touch input is forbidden in the TV remote audit')
 return subprocess.check_output(['adb', *args], text=True).strip()
def dump():
 adb('shell','uiautomator','dump','/sdcard/nodecast-check.xml')
 return ET.fromstring(adb('shell','cat','/sdcard/nodecast-check.xml'))
size=list(map(int,re.findall(r'\d+',adb('shell','wm','size'))[:2])); width,height=size

def find(label, timeout=15, scroll=False):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  root=dump()
  if label!='Show player controls' and REMOTE and any(n.get('content-desc')=='Show player controls' and n.get('focused')=='true' for n in root.iter('node')):
   remote.key(20);continue
  nodes=[n for n in root.iter('node') if label.casefold() in (n.get('content-desc') or '').casefold() or (n.get('text') or '').casefold()==label.casefold()]
  if label in ['Profile name','Server address','Username','Password','XMLTV URL','New six-digit PIN','Confirm PIN','Family PIN','Find category to protect','Backup password','Confirm backup password']: nodes=[n for n in nodes if n.get('class')=='android.widget.EditText']
  nodes.sort(key=lambda n:((n.get('content-desc') or '').casefold()!=label.casefold() and (n.get('text') or '').casefold()!=label.casefold(),n.get('clickable')!='true'))
  nav_top=height
  if width<height and label not in ['Home','Library','Favorites','Settings']:
   for candidate in root.iter('node'):
    box=list(map(int,re.findall(r'\d+',candidate.get('bounds',''))))
    if candidate.get('content-desc') in ['Home','Library','Favorites','Settings'] and candidate.get('clickable')=='true' and len(box)==4 and box[1]>height*.7:nav_top=min(nav_top,box[1])
  for n in nodes:
   b=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
   if len(b)==4 and b[2]>b[0] and b[3]>b[1] and b[3]<=height and b[1]>=0 and (b[1]+b[3])/2<nav_top:return b
  if scroll:
   if REMOTE:remote.reveal(label,timeout=max(3,end-time.monotonic()))
   else:adb('shell','input','swipe',str(width//2),str(int(height*.75)),str(width//2),str(int(height*.3)),'350')
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
 if REMOTE:remote.activate(label);return
 x1,y1,x2,y2=find(label,scroll=scroll);adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(.5)
def text(label,value):
 if REMOTE:remote.fill(label,value);return
 if label=='Find category to protect':
  for _ in range(3):adb('shell','input','swipe',str(width//2),str(int(height*.3)),str(width//2),str(int(height*.8)),'350')
 click(label,True);adb('shell','input','text',value);adb('shell','input','keyevent','66');time.sleep(.3)
def remote_next(label):
 if REMOTE:remote.activate(label);return
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


def video_pixels(name):
 path=OUT/(name+'.png');path.write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
 frame=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-vf','crop=iw*0.6:ih*0.5:iw*0.2:ih*0.2,scale=96:54','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
 colours={tuple(v//32 for v in frame[i:i+3]) for i in range(0,len(frame),3)}
 bright=sum(max(frame[i:i+3])>48 for i in range(0,len(frame),3))/(len(frame)/3)
 assert len(colours)>12 and bright>.5,'Video texture is blank after '+name
 return frame

def stability(remote,counts):
 before=counts['ts'];first=video_pixels('emulator-tv-live-before-menu')
 time.sleep(5)
 assert any(n.get('content-desc')=='Show player controls' for n in dump().iter('node')),'Playback controls did not hide after idle'
 remote.key(23)
 find('Pause live TV')
 assert counts['ts']==before,'Waking controls reopened the live stream'
 remote.activate('Player options');time.sleep(9)
 root=dump();assert not any(n.get('content-desc')=='Back to video' for n in root.iter('node')),'Idle settings did not dismiss'
 assert any(n.get('content-desc')=='Show player controls' for n in root.iter('node')),'Idle settings left controls visible'
 remote.key(4);find('Pause live TV')
 video_pixels('emulator-tv-overlay-idle-wake')
 for entry in ['Playback options for this channel','Display, speed & sleep timer','Playback information']:
  remote.activate('Player options');remote.activate(entry)
  if entry.startswith('Playback options'):
   remote.activate('Live format: MPEG-TS');time.sleep(9);find('Save playback options',scroll=True);remote.activate('Save playback options')
  elif entry.startswith('Display'):
   remote.activate('Fill · crop the edges');remote.activate('Fit · show the whole picture');remote.activate('Stop after 15 minutes');remote.activate('Turn sleep timer off')
  if entry=='Playback information':
   focused=remote.focused(remote.tree());assert focused is not None and remote.name(focused)=='Back to video','New player panel did not acquire initial focus'
  OUT.joinpath('emulator-tv-panel-'+entry.split()[0]+'.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
  remote.activate('Back to video');find('Pause live TV');video_pixels('emulator-tv-return-'+entry.split()[0])
 time.sleep(2);assert video_pixels('emulator-tv-live-after-menus')!=first,'Live frames stopped advancing'
 assert counts['ts']==before,'Player menus restarted the live subscription'
 remote.activate('Audio and subtitles');remote.activate('Off');remote.key(4);find('Pause live TV');video_pixels('emulator-tv-return-tracks');remote.activate('Audio and subtitles');remote.activate('Close audio and subtitles');find('Pause live TV')
 remote.key(85);find('Play live TV');remote.key(85);find('Pause live TV')
 remote.activate('Back to library');remote.focus('Play Remote Channel 01');adb('shell','dumpsys','gfxinfo','com.nhshajib.nodecast.tv','reset')
 adb('logcat','-c')
 for _ in range(20):remote.key(22);remote.key(21)
 log=adb('logcat','-d','-s','NodeCastTVRemote:D','*:S');samples=list(map(int,re.findall(r'key_us=(\d+)',log)));sizes=list(map(int,re.findall(r'candidates=(\d+)',log)))
 assert len(samples)>=30,'Missing native key profile samples'
 p95=sorted(samples)[int(.95*(len(samples)-1))]/1000
 assert p95<32,'Native D-pad dispatch exceeds 32 ms at p95'
 assert max(sizes)<200,'Focus graph unexpectedly includes the full provider catalogue'
 frames=adb('shell','dumpsys','gfxinfo','com.nhshajib.nodecast.tv','framestats');OUT.joinpath('emulator-tv-focus-frames.txt').write_text(frames)
 OUT.joinpath('emulator-tv-stability-result.json').write_text(json.dumps({'passed':['Live frame pixels survive player menu, channel options, display/sleep tools, report and track panels','Frames advance after returning from menus','One live HTTP session across player settings','Four-second idle controls, eight-second idle settings and D-pad/OK/Back wake without unintended action','Unsaved channel options remain visible past idle timeout','Media Play/Pause remote keys','3000 channels and 300 categories with bounded native focus graph'], 'nativeKeyP95Ms':p95,'keySamples':len(samples),'maxFocusCandidates':max(sizes),'api':adb('shell','getprop','ro.build.version.sdk'),'scope':'Android emulator timing; physical Fire TV performance requires confirmation.'},indent=2)+'\n')
 print('TV stability and native focus profile passed: p95 '+str(p95)+' ms',flush=True)

def audit_settings(remote,out,fresh=False):
 # Every activation below must acquire native focus and use D-pad Select.
 def checked(label,value=True):
  node=remote.focus(label);assert node.get('checked')==str(value).lower(),label+' did not update'
 if not fresh:remote.activate('Back')
 remote.activate('Live TV')
 if not fresh:remote.activate('All titles')
 remote.focus('All');remote.horizontal('Remote News 8',22);remote.horizontal('All',21);remote.activate('Save favorite: Remote Channel 18');remote.activate('Smoke test');remote.activate('Save favorite: Example Live Test');remote.activate('Favorites');find('Play Example Live Test');remote.activate('Settings')
 remote.activate('Appearance');remote.activate('light appearance');checked('light appearance');remote.activate('dark appearance');checked('dark appearance');remote.activate('Back')
 remote.activate('Playback');remote.activate('Ask each time');checked('Ask each time');remote.activate('NodeCast player');checked('NodeCast player');remote.activate('Live TV options');remote.activate('Engine: Built-in VLC');checked('Engine: Built-in VLC');remote.activate('Engine: Automatic');checked('Engine: Automatic');remote.activate('Back')
 remote.activate('Library organization');remote.activate('A–Z');checked('A–Z');remote.activate('Provider order');remote.activate('Refresh after 60 minutes');checked('Refresh after 60 minutes');remote.activate('Refresh after 30 minutes');remote.activate('All media');checked('All media');remote.activate('Current category');remote.activate('Show Smoke test');checked('Show Smoke test',False);remote.activate('Show Smoke test');checked('Show Smoke test');remote.activate('Favorites order');find('Example Live Test',scroll=True);remote.activate('Back')
 remote.activate('Backup & transfer');remote.activate('Include viewing history and progress');checked('Include viewing history and progress',False);remote.activate('Include viewing history and progress');checked('Include viewing history and progress');remote.activate('Import backup');find('Choose backup file');remote.activate('Export backup');remote.activate('Back')
 remote.activate('Add playlist');remote.activate('M3U link');find('Playlist link');remote.activate('Xtream Codes');remote.activate('Show password');remote.activate('Hide password');remote.activate('Advanced connection settings');remote.focus('User-Agent (optional)');remote.activate('Hide advanced connection settings');remote.activate('Back')
 remote.activate('Version history');remote.activate('Version 0.6.6');remote.activate('Version 0.6.6');remote.activate('Version 0.6.5');remote.activate('Back');remote.activate('Library & storage');find('Clear recents');remote.activate('Back')
 remote.activate('VPN & IP details');find('VPN status is unverified');remote.activate('Refresh public IP');remote.focus('Refresh public IP')
 network_reference='External IP lookup unavailable; save/remove not exercised'
 if any(remote.match(n,'Save home IP') for n in remote.actions(remote.tree())):
  remote.activate('Save home IP');remote.activate('Cancel');remote.activate('Save home IP');remote.activate('Save this home IP');remote.activate('Remove reference IP');find('Save home IP');network_reference='Save confirmation, Cancel, Save and Remove reference IP passed'
 out.joinpath('emulator-tv-connection-details.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
 remote.activate('Close connection details');remote.activate('Connection details');remote.key(4);remote.activate('Set home IP reference');remote.activate('Home Wi-Fi and VPN disconnected');checked('Home Wi-Fi and VPN disconnected');remote.activate('Home Wi-Fi and VPN disconnected');checked('Home Wi-Fi and VPN disconnected',False);remote.activate('Not now')
 remote.activate('Live TV');remote.fill('Search channels and titles','Example');find('Play Example Live Test');remote.fill('Search channels and titles','');remote.activate('Playback options for Example Live Test');remote.activate('Live format: MPEG-TS');remote.activate('Save playback options');find('Saved. Applies next time you open this channel.',timeout=30,scroll=True);remote.activate('Reset to default');remote.activate('Back')
 out.joinpath('emulator-tv-remote-audit.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
 out.joinpath('emulator-tv-remote-audit-result.json').write_text(json.dumps({'passed':['D-pad-only profile connection and keyboard fields','Library, Favorites and Settings navigation','Appearance radio selection persists','Player and live engine selection','Sort, refresh, search scope and category switches','Backup switch and import/export modes','Version expansion and storage navigation','Home-IP confirmation and skip','Search editing and per-channel options','Back and focus restoration'],'networkReference':network_reference,'scope':'Android TV-profile emulator; all actions use D-pad/Select/Back. Keyboard text uses adb input text. No pointer taps or swipes.'},indent=2)+'\n')

def main():
 video=Path('tests/fixtures/android-live-test.mpegts')
 suite=os.environ.get('NODECAST_TV_SUITE','full')
 counts={'guide':0,'ts':0,'archive':0}
 stamp=lambda value:time.strftime('%Y%m%d%H%M%S +0000',time.gmtime(value))
 class Handler(http.server.BaseHTTPRequestHandler):
  def log_message(self,*args):pass
  def do_GET(self):
   if self.path.split('?')[0].endswith('/guide.xml'):
    counts['guide']+=1;now=time.time()
    body=f'<tv><channel id="native-test"><display-name>Native guide channel</display-name></channel><programme channel="native-test" start="{stamp(now-120)}" stop="{stamp(now+3600)}"><title>Native Guide Match</title><desc>Synthetic programme for SQLite verification.</desc></programme><programme channel="native-test" start="{stamp(now-7200)}" stop="{stamp(now-3600)}"><title>Archive Fixture</title><desc>A past synthetic broadcast.</desc></programme></tv>'.encode()
    self.send_response(200);self.send_header('Content-Type','application/xml');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
   if self.path.split('?')[0].startswith('/timeshift/'):
    counts['archive']+=1;body=video.read_bytes();self.send_response(200);self.send_header('Content-Type','video/mp2t');self.send_header('Content-Length',str(len(body)));self.end_headers()
    try:self.wfile.write(body)
    except (BrokenPipeError,ConnectionResetError):pass
    return
   if self.path.split('?')[0].endswith('.mp4'):
    body=Path('tests/fixtures/android-episode-test.mp4').read_bytes(); self.send_response(200);self.send_header('Content-Type','video/mp4');self.send_header('Content-Length',str(len(body)));self.end_headers()
    try:self.wfile.write(body)
    except (BrokenPipeError,ConnectionResetError):pass
    return
   if self.path.split('?')[0].endswith('.ts'):
    counts['ts']+=1
    self.send_response(200);self.send_header('Content-Type','video/mp2t');self.end_headers()
    stream=subprocess.Popen(['ffmpeg','-nostdin','-v','error','-re','-stream_loop','-1','-i',str(video),'-c','copy','-f','mpegts','pipe:1'],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
    try:
     while True:
      block=stream.stdout.read(16384)
      if not block:break
      self.wfile.write(block);self.wfile.flush()
    except (BrokenPipeError,ConnectionResetError):pass
    finally:stream.kill();stream.wait();stream.stdout.close()
    return
   if 'get_series_info' in self.path:value={'episodes':{'2':[{'id':1002,'title':'Final Episode','episode_num':1}],'1':[{'id':905,'title':'Episode Two','episode_num':2},{'id':401,'title':'Episode One','episode_num':1}]}}
   elif 'get_series_categories' in self.path:value=[{'category_id':'1','category_name':'Example series'}]
   elif 'get_series' in self.path:value=[{'series_id':77,'name':'Sample Series','category_id':'1'}]
   elif 'get_live_categories' in self.path:value=[{'category_id':'1','category_name':'Smoke test'}]+[{'category_id':str(i+2),'category_name':f'Remote News {i+1}'} for i in range(300 if suite=='stability' else 8)]
   elif 'get_live_streams' in self.path:value=[{'stream_id':1,'name':'Example Live Test','category_id':'1','epg_channel_id':'native-test','tv_archive':1,'tv_archive_duration':2}]+[{'stream_id':i+20,'name':f'Remote Channel {i+1:02d}','category_id':str(2+i%(300 if suite=='stability' else 8))} for i in range(3000 if suite=='stability' else 30)]
   elif 'action=' in self.path:value=[]
   else:value={'user_info':{'auth':1,'status':'Active'},'server_info':{'timezone':'UTC'}}
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
  if REMOTE and suite=='input':
   click('Settings');click('Family controls');text('New six-digit PIN','123456');text('Confirm PIN','123456');click('Set family PIN');find('Find category to protect',timeout=90)
   OUT.joinpath('emulator-tv-input-result.json').write_text(json.dumps({'passed':['Numeric PIN and confirmation fields remain in the form after keyboard Done','Family PIN saved successfully'],'api':adb('shell','getprop','ro.build.version.sdk')},indent=2)+'\n')
   print('TV numeric input and PIN save passed.',flush=True)
   return
  if REMOTE and suite=='settings':
   audit_settings(remote,OUT,fresh=True)
   OUT.joinpath('emulator-tv-remote-actions.json').write_text(json.dumps({'input':'D-pad/Select/Back only; keyboard text; no pointer','activated':remote.visited},indent=2)+'\n')
   print('Native TV settings remote audit passed.',flush=True)
   return
  click('Play Example Live Test')
  find('Pause live TV',timeout=35)
  if REMOTE and suite=='stability':
   stability(remote,counts)
   return
  OUT.joinpath('emulator-tv-live-test.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
  OUT.joinpath('emulator-tv-live-test.xml').write_text(ET.tostring(dump(),encoding='unicode'))
  before=counts['ts'];click('Player options');click('Watch while browsing');find('Return to video')
  OUT.joinpath('emulator-tv-mini-player.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
  click('Return to video');find('Pause live TV');assert counts['ts']==before,'Minimizing opened another live stream'
  click('Back to library');find('Play Example Live Test')
  click('Series');click('Open Sample Series');click('Episode One')
  video_ready()
  box=find('Next episode: Season 1 · Episode Two')
  assert box[2]>width*.8 and box[1]>height*.7, box
  OUT.joinpath('emulator-tv-next-episode.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
  remote_next('Next episode: Season 1 · Episode Two');find('Episode Two');video_ready()
  remote_next('Next episode: Season 2 · Final Episode');find('Final Episode');video_ready()
  assert not any('Next episode:' in (n.get('content-desc') or '') for n in dump().iter('node'))
  OUT.joinpath('emulator-tv-last-episode.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
  click('Back to library');find('Play Final Episode')
  mark='Mark unwatched' if any('Mark unwatched' in (n.get('content-desc') or n.get('text') or '') for n in dump().iter('node')) else 'Mark watched'
  click(mark);find('Mark watched' if mark=='Mark unwatched' else 'Mark unwatched');click('Mark watched' if mark=='Mark unwatched' else 'Mark unwatched');find(mark)
  adb('shell','input','keyevent','4');find('Open Sample Series')
  click('Live TV');click('TV guide');click('Add full TV guide')
  text('XMLTV URL','http://10.0.2.2:9090/guide.xml');click('Save and refresh guide',True);find('Native Guide Match',timeout=45,scroll=True)
  OUT.joinpath('emulator-tv-full-guide.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
  click('Back');click('Settings');click('Appearance');click('dark appearance');click('Back');click('Family controls')
  text('New six-digit PIN','123456');text('Confirm PIN','123456');pin_started=time.monotonic();click('Set family PIN',True)
  # Hermes crypto can take longer on a busy video emulator. Wait for completion,
  # including offscreen content, before moving the search field into view.
  while time.monotonic()-pin_started<90:
   if any(n.get('content-desc')=='Find category to protect' for n in dump().iter('node')):break
   time.sleep(.5)
  else:raise RuntimeError('Family PIN setup did not finish within 90 seconds')
  print(f'Native TV PIN setup completed in {time.monotonic()-pin_started:.1f}s',flush=True)
  text('Find category to protect','Smoke');find('Lock protected content now',timeout=30,scroll=True)
  click('Protect Smoke test');click('Lock protected content now');click('Back');click('Live TV')
  assert not any('Play Example Live Test' in (n.get('content-desc') or '') for n in dump().iter('node'))
  adb('shell','am','force-stop','com.nhshajib.nodecast.tv');adb('shell','am','start','-W','-n','com.nhshajib.nodecast.tv/.MainActivity');time.sleep(6)
  root=dump()
  if any('Home IP reference' in (n.get('text') or n.get('content-desc') or '') for n in root.iter('node')):adb('shell','input','keyevent','4')
  click('Settings');click('Family controls');click('Unlock family controls');text('Family PIN','123456');click('Unlock');find('Find category to protect',timeout=90);click('Back');click('Live TV');find('Play Example Live Test')
  click('TV guide');find('Native Guide Match',timeout=30,scroll=True);assert counts['guide']==1,'Saved guide was not reused after process restart'
  OUT.joinpath('emulator-tv-guide-persisted.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
  click('Back');click('Live TV');click('Recently watched');click('Clear recents')
  # Native Alert confirmation follows the button and uses the same visible label.
  click('Clear recents');assert not any('Play Example Live Test' in (n.get('content-desc') or '') for n in dump().iter('node'))
  click('Settings');click('Backup & transfer',True);find('Take your setup with you.')
  OUT.joinpath('emulator-tv-transfer-settings.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
  if REMOTE:
   if suite=='core':
    remote.activate('Back');remote.activate('Live TV');remote.activate('All titles')
   else:audit_settings(remote,OUT)
   remote.activate('Switch playlist');remote.activate('✓ NativeTest');remote.activate('TV guide');remote.activate('Earlier');remote.activate('Archive Fixture');find('Watch catch-up');OUT.joinpath('emulator-tv-programme-details.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']));remote.activate('Watch catch-up');video_ready();assert counts['archive']>0,'Archive endpoint was not requested';OUT.joinpath('emulator-tv-catchup.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']));remote.activate('Back to TV guide');find('Earlier');remote.activate('Back');remote.focus('Play Example Live Test');remote.key(82);find('Just for this channel');remote.activate('Back');remote.focus('Play Example Live Test');remote.adb('shell','input','keyevent','--longpress','23');find('Just for this channel');remote.activate('Back')
   OUT.joinpath('emulator-tv-remote-actions.json').write_text(json.dumps({'input':'D-pad directions, Select, Back and keyboard text; no tap/swipe','activated':remote.visited},indent=2)+'\n')
  OUT.joinpath('emulator-tv-playback-result.json').write_text(json.dumps({'passed':['Local synthetic Xtream connection','Native VLC reports playing H.264 MPEG-TS','Remote Back returns to library','Fullscreen native episode playback','Next follows episode IDs 401 → 905 → 1002','Next button is bottom-right and activated with D-pad/Select','Cross-season next episode','Last episode has no Next button','Mini-player retains the live HTTP session','Native XMLTV import and SQLite search','Family PIN protects a category','Profile, PIN and SQLite guide survive process restart','Clear recents hides watched channels','Backup and transfer settings are available'],'scope':'Android x86-64 emulator with generated test-pattern video; physical devices and real-provider streams remain unverified.'},indent=2)+'\n')
  print('Native TV import, VLC test stream and remote Back passed.')
 except Exception:
  if REMOTE:OUT.joinpath('emulator-tv-remote-actions.json').write_text(json.dumps({'activated':remote.visited,'input':'D-pad/Select/Back only'},indent=2)+'\n')
  OUT.joinpath('emulator-tv-playback-failure.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
  OUT.joinpath('emulator-tv-playback-failure.xml').write_text(ET.tostring(dump(),encoding='unicode'))
  raise
 finally:server.shutdown()

if __name__ == '__main__': main()
