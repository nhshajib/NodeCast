"""Capture the actual APK with synthetic original content. TV uses only D-pad/Select."""
import os,sys,json,time,threading,http.server,subprocess,importlib.util
from pathlib import Path
from urllib.parse import urlparse,parse_qs
TARGET=sys.argv[1];TV=TARGET=='tv';ROOT=Path(__file__).resolve().parents[2];APP=ROOT/'apps/player';OUT=APP/'verification/android';OUT.mkdir(parents=True,exist_ok=True)
if TV:os.environ['NODECAST_REMOTE_ONLY']='1'
spec=importlib.util.spec_from_file_location('helpers',APP/'scripts/android-tv-playback-smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
adb,fill,find=h.adb,h.text,h.find
def click(label,scroll=False):
 if not TV and label=='Guide':
  # The legacy helper excludes bottom-bar controls it does not recognize.
  # Guide is a real tab in the new five-tab bar, so inspect its exact bounds.
  node=next(n for n in h.dump().iter('node') if n.get('content-desc')==label and n.get('clickable')=='true')
  bounds=list(map(int,__import__('re').findall(r'\d+',node.get('bounds',''))))
  adb('shell','input','tap',str((bounds[0]+bounds[2])//2),str((bounds[1]+bounds[3])//2));time.sleep(.5)
 else:h.click(label,scroll)
CHANNELS=[('demo','Evening studio'),('demo2','Wild North'),('demo3','Quiet studio')]
stamp=lambda v:time.strftime('%Y%m%d%H%M%S +0000',time.gmtime(v))
class Handler(http.server.BaseHTTPRequestHandler):
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
  self.send_response(200);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
server=http.server.ThreadingHTTPServer(('0.0.0.0',9090),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
def capture(screen):
 time.sleep(.7);(OUT/f'emulator-design-{TARGET}-{screen}.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
def home():click('Home')
def back():
 if TV:click('Back')
 else:adb('shell','input','keyevent','4');time.sleep(.6)
package='com.nhshajib.nodecast'+('.tv'if TV else '')
try:
 apk=next(Path('apk').rglob('*.apk'));adb('install',str(apk));adb('shell','am','start','-W','-n',package+'/.MainActivity');time.sleep(8)
 if TV:
  adb('shell','input','keyevent','4');time.sleep(1);click('Add your playlist')
 else:
  click('Get started');click('Not now',True)
 for label,value in [('Profile name','GlowTVDemo'),('Server address','http://10.0.2.2:9090'),('Username','example'),('Password','example')]:fill(label,value)
 capture('playlists');click('Connect playlist',True);time.sleep(4)
 if TV:
  click('Settings');click('Library organization',True);click('Channel logos in list view',True);back();home();time.sleep(3)
 capture('home')
 click('TV guide' if TV else 'Guide');click('Add full TV guide');fill('XMLTV URL','http://10.0.2.2:9090/guide.xml');click('Save and refresh guide',True);find('Evening studio,',timeout=45)
 if TV:click('Preview Evening studio');time.sleep(3)
 else:click('Evening studio,')
 capture('guide')
 if TV:click('Close mini player');back();home()
 else:click('Close');home()
 click('Watch live');time.sleep(3);adb('shell','input','keyevent','127');time.sleep(1);capture('player')
 # The actual decoded bottom band is green; a blank decoder or Home is not.
 image=OUT/f'emulator-design-{TARGET}-player.png'
 region='crop=iw*0.6:ih*0.1:iw*0.2:ih*0.75,scale=32:8'if TV else'crop=iw*0.6:ih*0.06:iw*0.2:ih*0.25,scale=32:8'
 frame=subprocess.check_output(['ffmpeg','-v','error','-i',str(image),'-vf',region,'-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
 assert sum(frame[i+1]>150 and frame[i]<50 and 70<frame[i+2]<160 for i in range(0,len(frame),3))>len(frame)/12,'Native decoder did not render the original green test band'
 click('Back to library')
 if not TV:home()
 click('Movies');find('Play Tidewater' if TV else 'Open Tidewater',timeout=30,scroll=not TV);capture('movies')
 if not TV:home()
 click('Series');click('Open Tidewater Stories',True);find('Start series',timeout=30,scroll=not TV);capture('series');back()
 if TV:click('Search');fill('Search channels and titles','Evening')
 else:home();click('Search')
 capture('search');click('Settings');capture('settings')
 checked=[]
 for label in ['Appearance','Family controls','Playback'if TV else'Default player','Library organization','Backup & transfer','Library & storage','Set home IP reference'if TV else'Home IP & connection','Version history']:
  click(label,True);back();checked.append(label)
 result={'platform':TARGET,'native':True,'input':'D-pad, Select, Back and keyboard text only'if TV else'Android touch input','screens':['home','guide','player','movies','series','playlists','search','settings'],'settingsDestinations':checked,'actualVideoPixels':bool(frame),'scope':'Android emulator; physical Fire TV and iPhone hardware are separate checks.'}
 (OUT/f'emulator-design-{TARGET}-result.json').write_text(json.dumps(result,indent=2)+'\n')
except Exception:
 (OUT/f'emulator-design-{TARGET}-traceback.txt').write_text(__import__('traceback').format_exc())
 (OUT/f'emulator-design-{TARGET}-logcat.txt').write_text(adb('logcat','-d'))
 capture('failure');(OUT/f'emulator-design-{TARGET}-failure.xml').write_text(__import__('xml.etree.ElementTree',fromlist=['tostring']).tostring(h.dump(),encoding='unicode'));raise
finally:server.shutdown()
