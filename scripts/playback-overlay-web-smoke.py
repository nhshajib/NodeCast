"""Shared player UI integration with local, credential-free video. Requires a web QA export with screen-reader disabled (RN Web always reports it enabled). Native binaries use the real device setting. See verification/playback-overlay/README.md."""
import http.server,json,threading,time,os,subprocess
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
ROOT=Path(os.environ.get('NODECAST_WEB_EXPORT','build/playback-web'));OUT=Path(os.environ.get('NODECAST_QA_OUTPUT','verification/playback-overlay'))
OUT.mkdir(parents=True,exist_ok=True)
if not (OUT/'fixture.mp4').exists():subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=size=320x180:rate=12','-t','180','-an','-c:v','libx264','-preset','ultrafast','-movflags','+faststart','-y',str(OUT/'fixture.mp4')],check=True)
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  parsed=urlparse(self.path)
  if parsed.path=='/player_api.php':
   action=parse_qs(parsed.query).get('action',[''])[0]
   data=([{'category_id':'1','category_name':'Test cinema'}] if action in ['get_vod_categories','get_live_categories'] else [{'stream_id':1,'name':'Overlay Fixture','category_id':'1','container_extension':'mp4'}] if action=='get_vod_streams' else [] if action else {'user_info':{'auth':1,'status':'Active'}})
   body=json.dumps(data).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
  elif parsed.path.startswith('/movie/'):
   body=(OUT/'fixture.mp4').read_bytes();self.send_response(200);self.send_header('Content-Type','video/mp4');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
  else:super().do_GET()
server=http.server.ThreadingHTTPServer(('127.0.0.1',8750),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path="/usr/bin/chromium",headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,has_touch=True,is_mobile=True)
 errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto('http://127.0.0.1:8750');page.wait_for_timeout(3500)
 page.get_by_role('button',name='Get started',exact=True).click()
 page.get_by_role('button',name='Not now',exact=True).click()
 for label,value in [('Profile name','Overlay test'),('Server address','http://127.0.0.1:8750'),('Username','fixture'),('Password','fixture')]:page.get_by_role('textbox',name=label,exact=True).fill(value)
 page.get_by_role('button',name='Connect playlist',exact=True).click()
 page.wait_for_timeout(2000)
 page.get_by_role('tab',name='Library',exact=True).click()
 page.get_by_role('tab',name='Movies',exact=True).click()
 page.get_by_role('button',name='Open Overlay Fixture',exact=True).click()
 page.get_by_role('button',name='Play movie',exact=True).click()
 page.wait_for_timeout(2000)
 def tap(name):page.get_by_role('button',name=name,exact=True).tap()
 tap('Play video');page.wait_for_function('document.querySelector("video").currentTime > 1')
 page.evaluate('window.fixtureVideo=document.querySelector("video");window.videoLoads=0;window.fixtureVideo.addEventListener("loadstart",()=>window.videoLoads++)')
 tap('Player options');page.wait_for_timeout(250);page.screenshot(path=str(OUT/'phone-menu.png'))
 before=page.locator('video').evaluate('(v)=>v.currentTime');page.wait_for_timeout(1600)
 assert page.locator('video').evaluate('(v)=>v.currentTime')>before,'Video stopped behind settings'
 tap('Display, speed & sleep timer');tap('Fill · crop the edges');tap('Fit · show the whole picture');tap('Stop after 15 minutes');tap('Turn sleep timer off')
 page.screenshot(path=str(OUT/'phone-tools.png'))
 tap('Back to video');page.wait_for_timeout(4600)
 assert page.get_by_role('button',name='Show player controls',exact=True).is_visible(),'Controls did not hide'
 page.screenshot(path=str(OUT/'phone-clean-video.png'))
 tap('Show player controls');assert page.get_by_role('button',name='Pause video',exact=True).is_visible()
 assert not page.locator('video').evaluate('(v)=>v.paused'),'Wake tap paused video'
 tap('Player options');page.wait_for_timeout(8600)
 assert page.get_by_role('button',name='Back to video',exact=True).count()==0,'Idle panel stayed open'
 tap('Show player controls');tap('Audio and subtitles');tap('Close audio and subtitles')
 page.set_viewport_size({'width':844,'height':390});tap('Player options');page.wait_for_timeout(250);page.screenshot(path=str(OUT/'phone-landscape-menu.png'))
 tap('Back to video');tap('Pause video');tap('Player options');page.wait_for_timeout(8600)
 assert page.get_by_role('button',name='Back to video',exact=True).is_visible(),'Paused settings disappeared'
 assert page.evaluate('window.fixtureVideo===document.querySelector("video") && window.videoLoads===0'),'Menu remounted/reloaded video'
 page.emulate_media(reduced_motion='reduce')
 assert not errors,errors
 (OUT/'web-result.json').write_text(json.dumps({'passed':['Native-engine web interface: portrait and landscape glass menus','Video time advances behind settings, same HTML video and no loadstart during menu interactions','Fit/Fill, sleep timer on/off, audio/subtitle close','Controls hide after four idle seconds; wake tap does not pause','Settings hide after eight idle seconds','Paused settings remain available','No browser runtime errors'],'scope':'Chromium using shared React player UI and local H.264 fixture; not a physical iPhone/Android decoder test.'},indent=2))
 print('PASS: playback overlay web interactions',flush=True)
 browser.close()
server.shutdown()
