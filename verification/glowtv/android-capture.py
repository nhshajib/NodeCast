"""Capture the actual APK with synthetic original content. TV uses only D-pad/Select."""
import os,sys,json,time,threading,http.server,subprocess,importlib.util
from pathlib import Path
from urllib.parse import urlparse,parse_qs
TARGET=sys.argv[1];TV=TARGET=='tv';ROOT=Path(__file__).resolve().parents[2];APP=ROOT/'apps/player';OUT=APP/'verification/android';OUT.mkdir(parents=True,exist_ok=True)
if TV:os.environ['NODECAST_REMOTE_ONLY']='1'
spec=importlib.util.spec_from_file_location('helpers',APP/'scripts/android-tv-playback-smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
adb,find=h.adb,h.find
if os.environ.get('GLOWTV_EMULATOR_DISABLE_CODEC2')=='true':
 # This changes only the disposable virtual device, never the installed app.
 adb('shell','setprop','debug.stagefright.ccodec','0')
 assert adb('shell','getprop','debug.stagefright.ccodec').strip()=='0'
if not TV:
 # Standard UIAutomator waits for idle longer than the auto-hide timeout.
 # Read the actual native accessibility nodes immediately; no app setting,
 # animation, accessibility mode or control timer is changed for this test.
 adb('push','/tmp/glowtv-hierarchy.jar','/data/local/tmp/glowtv-hierarchy.jar')
 import atexit,select
 hierarchy_log=open(OUT/'emulator-mobile-hierarchy-reader.log','w')
 idle_dump=h.dump
 hierarchy=None
 def start_phone_hierarchy():
  global hierarchy
  hierarchy=subprocess.Popen(['adb','shell','CLASSPATH=/data/local/tmp/glowtv-hierarchy.jar app_process /system/bin FastHierarchy --server'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=hierarchy_log,text=True,bufsize=1)
  h.dump=fast_dump
 def stop_phone_hierarchy():
  h.dump=idle_dump
  if hierarchy is not None and hierarchy.poll() is None:
   hierarchy.stdin.close()
   try:hierarchy.wait(timeout=3)
   except subprocess.TimeoutExpired:hierarchy.terminate()
 atexit.register(stop_phone_hierarchy)
 def fast_dump():
  import xml.etree.ElementTree as ET
  hierarchy.stdin.write('dump\n');hierarchy.stdin.flush()
  while True:
   if not select.select([hierarchy.stdout],[],[],15)[0]:raise RuntimeError('Native hierarchy reader did not respond')
   raw=hierarchy.stdout.readline()
   if not raw:raise RuntimeError('Native hierarchy reader exited: '+str(hierarchy.poll()))
   if raw.startswith('<?xml'):return ET.fromstring(raw)
native_tab_taps=[]
gesture_navigation=not TV and adb('shell','settings','get','secure','navigation_mode').strip()=='2'
def click(label,scroll=False):
 if not TV and label=='Connect playlist':
  # The native sheet covers the tab bar. The shared legacy helper excludes
  # that lower region and can select Home's duplicate action underneath it.
  # Target the foreground form's visible button; never tap an underlying tab
  # or retry an import to make the test pass.
  candidates=[]
  for n in h.dump().iter('node'):
   b=list(map(int,__import__('re').findall(r'\d+',n.get('bounds',''))))
   if n.get('content-desc')==label and n.get('clickable')=='true' and len(b)==4 and 0<=b[1]<b[3]<=h.height and b[2]>b[0]:candidates.append((n,b))
  assert candidates,'The presented playlist form has no visible Connect action'
  node,b=max(candidates,key=lambda item:item[1][1])
  (OUT/'emulator-mobile-submit-target.json').write_text(json.dumps(dict(node.attrib),indent=2)+'\n')
  x,y=str((b[0]+b[2])//2),str((b[1]+b[3])//2)
  adb('shell','input','swipe',x,y,x,y,'100');time.sleep(.5);return
 native_keys={'Home':'home','Live':'live','Guide':'guide','Library':'library','Settings':'settings'}
 if not TV and label in native_keys:
  # Native Material widgets use a real down/up gesture. ADB's zero-duration
  # input tap is not equivalent to a finger press through the native dispatcher.
  # A native Back animation can temporarily remove the tab bar from the
  # accessibility tree. Wait for the real visible target; do not repeat Back,
  # tap a guessed coordinate, or relax the on-screen geometry requirement.
  deadline=time.monotonic()+20
  target=None
  while time.monotonic()<deadline:
   nodes=[n for n in h.dump().iter('node')if n.get('resource-id')=='navigation-tab-'+native_keys[label]]
   candidates=[(n,list(map(int,__import__('re').findall(r'\d+',n.get('bounds','')))))for n in nodes]
   target=next(((n,b)for n,b in candidates if len(b)==4 and b[2]>b[0]and b[3]>b[1]and b[1]>h.height*.65 and b[3]<=h.height),None)
   if target is not None:break
   time.sleep(.2)
  assert target is not None,f'Native tab {label} did not become visible after navigation'
  node,bounds=target
  x,y=str((bounds[0]+bounds[2])//2),str((bounds[1]+bounds[3])//2)
  native_tab_taps.append({'label':label,'candidates':[dict(n.attrib)for n in nodes],'selected':dict(node.attrib),'tap':[int(x),int(y)],'durationMilliseconds':100})
  (OUT/'emulator-mobile-native-tab-taps.json').write_text(json.dumps(native_tab_taps,indent=2)+'\n')
  adb('shell','input','swipe',x,y,x,y,'100');time.sleep(.5)
 else:h.click(label,scroll)

def fill(label,value):
 if TV:
  if label in ['Password','XMLTV URL']:
   h.remote.activate(label);adb('shell','input','text',value);time.sleep(.3)
  else:h.text(label,value)
  return
 click(label,True)
 # Do not submit while ADB's burst keys are still queued in a controlled input.
 for character in value:
  adb('shell','input','text',character);time.sleep(.08)
 nodes=[n for n in h.dump().iter('node')if n.get('class')=='android.widget.EditText'and n.get('content-desc')==label]
 assert nodes,f'Missing entered field: {label}'
 entered=nodes[-1].get('text','')
 if nodes[-1].get('password')!='true':assert entered==value,f'Native field {label} did not retain the full synthetic value'
 elif entered:assert len(entered)==len(value),f'Native secure field {label} did not retain every character'
 if label not in ['Password','XMLTV URL']:adb('shell','input','keyevent','66');time.sleep(.3)

CHANNELS=[('demo','Evening studio'),('demo2','Wild North'),('demo3','Quiet studio')]
stamp=lambda v:time.strftime('%Y%m%d%H%M%S +0000',time.gmtime(v))
class Handler(http.server.BaseHTTPRequestHandler):
 protocol_version='HTTP/1.1'
 def do_HEAD(self):self.do_GET()
 def log_message(self,*_):pass
 def do_GET(self):
  path=urlparse(self.path).path;action=parse_qs(urlparse(self.path).query).get('action',[''])[0];base='http://'+self.headers.get('Host','10.0.2.2:9090')
  if path.endswith(('.mp4','.m3u8','.ts')):body=(APP/'assets/demo/glow-study.mp4').read_bytes();kind='video/mp4'
  elif path.endswith('.png'):body=(APP/'assets/demo/Evening.png').read_bytes();kind='image/png'
  elif path.endswith('guide.xml'):
   now=time.time();body=('<tv>'+''.join(f'<channel id="{channel}"><display-name>{name}</display-name></channel>'+''.join(f'<programme channel="{channel}" start="{stamp(now-1800+i*3600)}" stop="{stamp(now+1800+i*3600)}"><title>{title}</title><desc>An original GlowTV demonstration schedule.</desc></programme>'for i,title in enumerate(['Evening studio','A quiet morning','Tidewater']))for channel,name in CHANNELS)+'</tv>').encode();kind='application/xml'
  else:
   data={'user_info':{'auth':1,'status':'Active'},'server_info':{'timezone':'UTC'}}
   if action=='get_live_categories':data=[{'category_id':'1','category_name':'Original demos'}]
   elif action=='get_live_streams':data=[{'stream_id':i,'name':name,'category_id':'1','epg_channel_id':channel,'stream_icon':base+'/art.png','direct_source':base+'/live.mp4','tv_archive':1,'tv_archive_duration':7}for i,(channel,name) in enumerate(CHANNELS,1)]
   elif action=='get_vod_categories':data=[{'category_id':'2','category_name':'Original demos'}]
   elif action=='get_vod_streams':data=[{'stream_id':11,'name':'Tidewater','category_id':'2','stream_icon':base+'/art.png','container_extension':'mp4'}]
   elif action=='get_series_categories':data=[{'category_id':'3','category_name':'Original demos'}]
   elif action=='get_series':data=[{'series_id':77,'name':'Tidewater Stories','category_id':'3','cover':base+'/art.png','plot':'An original GlowTV demo scene.'}]
   elif action=='get_series_info':data={'episodes':{'1':[{'id':101,'title':'Evening light','episode_num':1,'container_extension':'mp4','info':{'movie_image':base+'/art.png'}},{'id':102,'title':'A quiet morning','episode_num':2,'container_extension':'mp4'}]}}
   elif action:data=[]
   body=json.dumps(data).encode();kind='application/json'
  status=200;content_range=None
  if kind=='video/mp4' and self.headers.get('Range'):
   # A real MP4 origin must report byte-range capability accurately. VLC uses
   # it to select seekable demux behavior; the fixture previously ignored it.
   import re
   total=len(body);match=re.fullmatch(r'bytes=(\d*)-(\d*)',self.headers['Range'])
   valid=bool(match and (match[1]or match[2]))
   start=int(match[1])if valid and match[1]else max(0,total-int(match[2]))if valid else total
   end=min(total-1,int(match[2]))if valid and match[1]and match[2]else total-1
   if not valid or start>=total or start>end or (not match[1]and int(match[2])==0):
    self.send_response(416);self.send_header('Content-Range',f'bytes */{total}');self.send_header('Content-Length','0');self.end_headers();return
   status=206;content_range=f'bytes {start}-{end}/{total}';body=body[start:end+1]
  self.send_response(status);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(body)))
  if kind=='video/mp4':self.send_header('Accept-Ranges','bytes')
  if content_range:self.send_header('Content-Range',content_range)
  self.end_headers()
  if self.command!='HEAD':self.wfile.write(body)
server=http.server.ThreadingHTTPServer(('0.0.0.0',9090),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
def capture(screen):
 time.sleep(.7);(OUT/f'emulator-design-{TARGET}-{screen}.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']));(OUT/f'emulator-design-{TARGET}-{screen}.xml').write_text(__import__('xml.etree.ElementTree',fromlist=['tostring']).tostring(h.dump(),encoding='unicode'));print(f'Native {TARGET}: captured {screen}',flush=True)
def home():click('Home')
def back():
 if TV:click('Back')
 elif gesture_navigation:
  # Exercise the system's actual predictive-back gesture on gesture-nav AVDs.
  # Legacy KEYCODE_BACK bypasses that native gesture dispatch on newer images.
  adb('shell','input','swipe','1',str(h.height//2),str(h.width*2//3),str(h.height//2),'350');time.sleep(.6)
 else:adb('shell','input','keyevent','4');time.sleep(.6)
def touch_player(label,timeout=20):
 # Phone playback uses its touch controls. Raw Android media keys are routed
 # through the dedicated TV controller only, so they do not prove a phone pause.
 assert not TV
 deadline=time.monotonic()+timeout
 while time.monotonic()<deadline:
  nodes=list(h.dump().iter('node'))
  # Android accessibility can retain Pause/Play nodes inside a pointer-disabled
  # hidden chrome layer. Wake the overlay first, then fetch a fresh target.
  target=next((n for n in nodes if n.get('content-desc')=='Show player controls' and n.get('clickable')=='true'),None)
  if target is None:target=next((n for n in nodes if n.get('content-desc')==label and n.get('clickable')=='true'),None)
  if target is not None:
   b=list(map(int,__import__('re').findall(r'\d+',target.get('bounds',''))))
   if len(b)==4 and b[2]>b[0] and b[3]>b[1]:
    x,y=str((b[0]+b[2])//2),str((b[1]+b[3])//2)
    adb('shell','input','swipe',x,y,x,y,'100');time.sleep(.4)
    if target.get('content-desc')==label:return
  time.sleep(.2)
 raise AssertionError('Phone player control is not reachable: '+label)
def expect_phone_control(label,timeout=20):
 # Auto-hiding controls are valid app behavior. Wake them without toggling
 # playback before checking the expected state. Never repeat Play/Pause to
 # turn a missed assertion into a pass.
 assert not TV
 deadline=time.monotonic()+timeout
 while time.monotonic()<deadline:
  nodes=list(h.dump().iter('node'))
  if any(n.get('content-desc')==label and n.get('clickable')=='true' for n in nodes):return
  wake=next((n for n in nodes if n.get('content-desc')=='Show player controls' and n.get('clickable')=='true'),None)
  if wake is not None:
   bounds=list(map(int,__import__('re').findall(r'\d+',wake.get('bounds',''))))
   assert len(bounds)==4 and bounds[2]>bounds[0] and bounds[3]>bounds[1]
   x,y=str((bounds[0]+bounds[2])//2),str((bounds[1]+bounds[3])//2)
   adb('shell','input','swipe',x,y,x,y,'100')
  time.sleep(.2)
 raise AssertionError('Phone playback state did not expose control: '+label)
def wait_for_native_video(timeout=45):
 # A native playing event can precede the first texture frame. Require actual
 # scene pixels before pausing; a fixed delay can freeze a still-black surface.
 deadline=time.monotonic()+timeout
 player_pid=adb('shell','pidof',package)
 assert player_pid,'Native player process is not running'
 region='crop=iw*0.6:ih*0.1:iw*0.2:ih*0.75,scale=32:8'if TV else'crop=iw*0.6:ih*0.06:iw*0.2:ih*0.25,scale=32:8'
 while time.monotonic()<deadline:
  assert adb('shell','pidof',package)==player_pid,'Player process changed before a decoded frame appeared'
  probe=OUT/f'emulator-design-{TARGET}-video-probe.png';probe.write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
  pixels=subprocess.check_output(['ffmpeg','-v','error','-i',str(probe),'-vf',region,'-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
  if sum(pixels[i+1]>150 and pixels[i]<50 and 70<pixels[i+2]<160 for i in range(0,len(pixels),3))>len(pixels)/12:return
  time.sleep(1)
 raise AssertionError('Native decoder did not expose the original green scene within 45 seconds')
package='com.nhshajib.nodecast'+('.tv'if TV else '')
try:
 apk=next(Path('apk').rglob('*.apk'));adb('install',str(apk))
 # A fresh API 35 AVD can leave its Pixel Launcher ANR over another app.
 # Clear only that known system-launcher failure before starting GlowTV.
 # Never dismiss an ANR belonging to the app under test.
 startup=h.dump()
 if any(n.get('package')=='android' and n.get('text')=="Pixel Launcher isn't responding" for n in startup.iter('node')):
  (OUT/f'emulator-design-{TARGET}-launcher-anr.xml').write_text(__import__('xml.etree.ElementTree',fromlist=['tostring']).tostring(startup,encoding='unicode'))
  adb('shell','am','force-stop','com.google.android.apps.nexuslauncher')
  time.sleep(1)
  print('Cleared the AVD Pixel Launcher ANR before app launch',flush=True)
 adb('shell','am','start','-W','-n',package+'/.MainActivity');time.sleep(8)
 if TV:
  # Wait for the first-run task itself. A blind Back during a slower cold
  # launch can close the Activity before the IP-reference sheet is presented.
  find('Home IP reference',timeout=45);click('Back');click('Add your playlist')
 else:
  click('Get started');click('Not now',True)
 for label,value in [('Profile name','GlowTVDemo'),('Server address','http://10.0.2.2:9090'),('Username','example'),('Password','example')]:fill(label,value)
 capture('playlists')
 # The final Go key submits on TV; phone verifies the explicit Connect action.
 if TV:adb('shell','input','keyevent','66')
 else:click('Connect playlist',True)
 time.sleep(4)
 if not TV:
  find('Evening studio',timeout=45)
  assert not any(n.get('content-desc')=='Connect playlist' for n in h.dump().iter('node')),'Playlist form must close before checking the first native tab selection'
 if TV:
  click('Settings');click('Library organization',True);click('Channel logos in list view',True);back();home();time.sleep(3)
 capture('home')
 if TV:
  # Isolate direct playback from guide-preview teardown. Both remote Select
  # and dedicated media keys must preserve the same decoded player process.
  click('Watch live');wait_for_native_video();find('Pause live TV',timeout=20)
  initial_pid=adb('shell','pidof',package)
  click('Pause live TV')
  assert adb('shell','pidof',package)==initial_pid,'Remote Select pause changed the initial player process'
  find('Play live TV',timeout=20);capture('player-initial-select')
  adb('shell','input','keyevent','126');wait_for_native_video();find('Pause live TV',timeout=20)
  adb('shell','input','keyevent','127');time.sleep(1)
  assert adb('shell','pidof',package)==initial_pid,'Dedicated Pause changed the initial player process'
  capture('player-initial-media-key')
  # Exercise the actual native INFO and channel keys, including Back on the
  # focused overlay. All channels use an original local video fixture.
  adb('shell','input','keyevent','165');find('On now · No programme information available');capture('player-info');adb('shell','input','keyevent','4')
  adb('shell','input','keyevent','166');wait_for_native_video();adb('shell','input','keyevent','165')
  root=h.dump();assert any(('Wild North · LIVE' in (n.get('text')or'')or'Quiet studio · LIVE' in (n.get('text')or''))for n in root.iter('node')),'Channel Up did not change the live channel'
  adb('shell','input','keyevent','4');adb('shell','input','keyevent','167');wait_for_native_video();adb('shell','input','keyevent','165');find('Evening studio · LIVE');adb('shell','input','keyevent','4')
  assert adb('shell','pidof',package)==initial_pid,'Remote INFO/channel keys changed the app process'
  (OUT/'emulator-tv-live-keys.json').write_text(json.dumps({'info':True,'channelUpDown':True,'sameProcess':True,'physicalFireTV':False})+'\n')
  (OUT/'emulator-tv-initial-pause.json').write_text(json.dumps({'sameProcess':True,'remoteSelect':True,'dedicatedMediaKeys':True})+'\n')
  click('Back to library');home()
 click('TV guide' if TV else 'Guide');click('Add full TV guide');fill('XMLTV URL','http://10.0.2.2:9090/guide.xml')
 if TV:adb('shell','input','keyevent','66')
 else:click('Save and refresh guide',True)
 find('Evening studio,',timeout=45)
 if TV:click('Preview Evening studio');time.sleep(3)
 else:click('Evening studio,')
 capture('guide')
 if TV:click('Close mini player');back();home()
 else:click('Done');home()
 click('Watch live')
 wait_for_native_video()
 if TV:find('Pause live TV',timeout=20)
 player_pid=adb('shell','pidof',package)
 if not TV:
  # Repeated real touch pauses exercise the native prop-update lifecycle.
  # A matching source/options update must not recreate or crash the decoder.
  start_phone_hierarchy()
  player_pid=adb('shell','pidof',package)
  for cycle in range(6):
   touch_player('Pause live TV');expect_phone_control('Play live TV')
   assert adb('shell','pidof',package)==player_pid,'Player process changed while pausing'
   wait_for_native_video(timeout=10)
   touch_player('Play live TV');expect_phone_control('Pause live TV')
   assert adb('shell','pidof',package)==player_pid,'Player process changed while resuming'
   print(f'Native phone: touch pause/resume cycle {cycle+1} passed in the same process',flush=True)
  (OUT/'emulator-mobile-pause-resume.json').write_text(json.dumps({'cycles':6,'sameProcess':True,'originalVideoPixels':True})+'\n')
 if TV:adb('shell','input','keyevent','127')
 else:touch_player('Pause live TV');expect_phone_control('Play live TV')
 time.sleep(1);capture('player')
 assert adb('shell','pidof',package)==player_pid,'Player process changed while pausing the decoded video'
 # The actual decoded bottom band is green; a blank decoder or Home is not.
 image=OUT/f'emulator-design-{TARGET}-player.png'
 region='crop=iw*0.6:ih*0.1:iw*0.2:ih*0.75,scale=32:8'if TV else'crop=iw*0.6:ih*0.06:iw*0.2:ih*0.25,scale=32:8'
 frame=subprocess.check_output(['ffmpeg','-v','error','-i',str(image),'-vf',region,'-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
 assert sum(frame[i+1]>150 and frame[i]<50 and 70<frame[i+2]<160 for i in range(0,len(frame),3))>len(frame)/12,'Native decoder did not render the original green test band'
 if not TV:stop_phone_hierarchy()
 click('Back to library')
 if not TV:home()
 (click('Movies') if TV else (click('Library'),click('Movies')));find('Play Tidewater' if TV else 'Open Tidewater',timeout=30,scroll=not TV);capture('movies')
 if not TV:click('Library')
 click('Series');click('Open Tidewater Stories',True);find('Start series',timeout=30,scroll=not TV);capture('series');back()
 if TV:click('Search');fill('Search channels and titles','Evening')
 else:click('Live');fill('Search library','Evening');find('Evening studio',timeout=30)
 capture('search')
 # Android library search stays in the Live tab; native Settings remains available.
 click('Settings');capture('settings')
 checked=[]
 for label in ['Appearance','Family controls','Playback'if TV else'Default player','Library organization','Backup & transfer','Library & storage','Home IP reference'if TV else'Home IP & connection','Version history']:
  click(label,True);back();checked.append(label)
 if gesture_navigation:
  click('Live');find('Search library');click('Settings');click('Appearance',True)
  adb('shell','input','keyevent','4');time.sleep(.8);find('Appearance');home();find('GlowTV home')
  # Root Back must still leave the app normally, then navigation must work
  # after resume. This catches an accidentally recursive dispatcher bridge.
  adb('shell','input','keyevent','4');time.sleep(1)
  assert not any(n.get('package')==package for n in h.dump().iter('node')),'Root Back did not leave the app'
  adb('shell','am','start','-W','-n',package+'/.MainActivity');find('GlowTV home',timeout=30)
  click('Live');click('Search library')
  # Dismiss the real library search IME before returning to Home. The native
  # Settings stack must still push and pop normally after process resume.
  adb('shell','input','keyevent','66');time.sleep(.5)
  home();click('Settings');click('Appearance',True);back();find('Appearance');home();find('GlowTV home')
 result={'platform':TARGET,'native':True,'input':'D-pad, Select, Back and keyboard text only'if TV else'Android touch input','screens':['home','guide','player','movies','series','playlists','search','settings'],'settingsDestinations':checked,'actualVideoPixels':bool(frame),'androidApi':adb('shell','getprop','ro.build.version.sdk').strip(),'emulatorGpu':os.environ.get('GLOWTV_EMULATOR_GPU','unspecified'),'scope':'Android emulator; physical Fire TV and iPhone hardware are separate checks.'}
 (OUT/f'emulator-design-{TARGET}-result.json').write_text(json.dumps(result,indent=2)+'\n')
except Exception:
 original_failure=__import__('traceback').format_exc()
 # Preserve the original failure, then isolate native tab input on this exact APK.
 if not TV and 'UI not found: Add full TV guide' in original_failure:
  try:
   (OUT/'emulator-mobile-window-state.txt').write_text(adb('shell','dumpsys','window','windows'))
   diagnostics=[]
   def tab_state(action):
    time.sleep(1);root=h.dump();nodes=[dict(n.attrib)for n in root.iter('node')if(n.get('resource-id')or'').startswith('navigation-tab-')]
    diagnostics.append({'action':action,'tabs':nodes});capture('diagnostic-'+action)
    return root
   def tap_guide(bottom=False):
    node=next(n for n in h.dump().iter('node')if n.get('resource-id')=='navigation-tab-guide')
    box=list(map(int,__import__('re').findall(r'\d+',node.get('bounds',''))))
    adb('shell','input','tap',str((box[0]+box[2])//2),str(box[3]-25 if bottom else(box[1]+box[3])//2))
   tab_state('original-failure');tap_guide();tab_state('guide-second-center-tap')
   def tap_tab(name,bottom=False):
    node=next(n for n in h.dump().iter('node')if n.get('resource-id')=='navigation-tab-'+name)
    box=list(map(int,__import__('re').findall(r'\d+',node.get('bounds',''))))
    adb('shell','input','tap',str((box[0]+box[2])//2),str(box[3]-25 if bottom else(box[1]+box[3])//2))
   for name in ['home','guide','home','guide']:
    tap_tab(name);tab_state(name+'-center-cycle-'+str(len(diagnostics)))
   for name in ['home','guide']:
    tap_tab(name,True);tab_state(name+'-bottom-cycle')
   for key in ['window_animation_scale','transition_animation_scale','animator_duration_scale']:adb('shell','settings','put','global',key,'1')
   tap_guide();tab_state('guide-animations-enabled')
   # Restart retains the synthetic saved profile and isolates a stale sheet/window.
   adb('shell','am','force-stop',package);adb('shell','am','start','-W','-n',package+'/.MainActivity');time.sleep(8)
   tap_guide();root=tab_state('guide-after-relaunch')
   for _ in range(24):
    target=next((n for n in root.iter('node')if n.get('resource-id')=='navigation-tab-guide'and n.get('focused')=='true'),None)
    if target is not None:
     adb('shell','input','keyevent','23');break
    adb('shell','input','keyevent','61');root=h.dump()
   tab_state('guide-keyboard-select')
   (OUT/'emulator-mobile-tab-diagnostic.json').write_text(json.dumps(diagnostics,indent=2)+'\n')
  except Exception as diagnostic_error:
   (OUT/'emulator-mobile-tab-diagnostic-error.txt').write_text(str(diagnostic_error))
 (OUT/f'emulator-design-{TARGET}-traceback.txt').write_text(original_failure)
 (OUT/f'emulator-design-{TARGET}-logcat.txt').write_text(adb('logcat','-d'))
 try:
  (OUT/f'emulator-design-{TARGET}-native-layout.txt').write_text(adb('shell','dumpsys','activity','top'))
  (OUT/f'emulator-design-{TARGET}-native-codecs.txt').write_text(adb('shell','dumpsys','media.codec'))
 except Exception as layout_error:
  (OUT/f'emulator-design-{TARGET}-native-layout-error.txt').write_text(str(layout_error))
 capture('failure');(OUT/f'emulator-design-{TARGET}-failure.xml').write_text(__import__('xml.etree.ElementTree',fromlist=['tostring']).tostring(h.dump(),encoding='unicode'));raise
finally:server.shutdown()
