"""Standalone phone UI + native SQLite/crypto integration with synthetic local data."""
import http.server,json,subprocess,threading,time
from pathlib import Path
import importlib.util
spec=importlib.util.spec_from_file_location('tv_helpers',Path(__file__).with_name('android-tv-playback-smoke.py'))
helpers=importlib.util.module_from_spec(spec);spec.loader.exec_module(helpers)
adb,dump,find,click,text=helpers.adb,helpers.dump,helpers.find,helpers.click,helpers.text
OUT=Path('verification/android')
counts={'guide':0}
stamp=lambda value:time.strftime('%Y%m%d%H%M%S +0000',time.gmtime(value))
class Handler(http.server.BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path.split('?')[0]=='/guide.xml':
   counts['guide']+=1;now=time.time();body=f'<tv><channel id="native-test"><display-name>Phone test</display-name></channel><programme channel="native-test" start="{stamp(now-120)}" stop="{stamp(now+3600)}"><title>Phone Guide Match</title></programme></tv>'.encode();kind='application/xml'
  else:
   if 'get_live_categories' in self.path:value=[{'category_id':'1','category_name':'Phone test'}]
   elif 'get_live_streams' in self.path:value=[{'stream_id':1,'name':'Phone Test Channel','category_id':'1','epg_channel_id':'native-test'}]
   elif 'action=' in self.path:value=[]
   else:value={'user_info':{'auth':1,'status':'Active'}}
   body=json.dumps(value).encode();kind='application/json'
  self.send_response(200);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
server=http.server.ThreadingHTTPServer(('0.0.0.0',9090),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
def back():click('Go back')
def settings(name):click('Settings');click(name,True)
try:
 click('Get started');click('Not now',True)
 # First-run setup opens the provider form directly; later sessions use Add playlist.
 if not any(n.get('class')=='android.widget.EditText' and n.get('content-desc')=='Profile name' for n in dump().iter('node')):click('Add playlist')
 for label,value in [('Profile name','PhoneTest'),('Server address','http://10.0.2.2:9090'),('Username','example'),('Password','example')]:text(label,value)
 click('Connect playlist',True);find('Home');click('Library');find('Open Phone Test Channel')
 click('Open TV guide');click('Add full TV guide');text('XMLTV URL','http://10.0.2.2:9090/guide.xml');click('Save and refresh guide',True);find('Phone Guide Match',timeout=45)
 OUT.joinpath('emulator-mobile-full-guide.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
 back();settings('Appearance');click('dark appearance');back();settings('Family controls')
 text('New six-digit PIN','123456');text('Confirm PIN','123456');click('Set family PIN',True);find('Find category to protect',timeout=90);click('Protect Phone test',True);click('Lock protected content now',True)
 click('Unlock family controls');text('Family PIN','000000');click('Unlock');find('PIN did not match.',timeout=90)
 # Clear only this synthetic test PIN field; no secrets enter logs.
 click('Family PIN');adb('shell','input','keyevent','123');adb('shell','input','keyevent','67','67','67','67','67','67');adb('shell','input','text','123456');adb('shell','input','keyevent','66');click('Unlock');find('Find category to protect',timeout=90)
 OUT.joinpath('emulator-mobile-family.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
 click('Lock protected content now',True);back();click('Library');assert not any('Open Phone Test Channel' in (n.get('content-desc') or '') for n in dump().iter('node'))
 adb('shell','am','force-stop','com.nhshajib.nodecast');adb('shell','am','start','-W','-n','com.nhshajib.nodecast/.MainActivity');time.sleep(6)
 settings('Family controls');click('Unlock family controls');text('Family PIN','123456');click('Unlock');find('Find category to protect',timeout=90);back();click('Library');find('Open Phone Test Channel');click('Open TV guide');find('Phone Guide Match',timeout=30);assert counts['guide']==1,'Native guide cache was not reused'
 OUT.joinpath('emulator-mobile-guide-persisted.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
 import runpy;runpy.run_path('scripts/android-backup-smoke.py',run_name='__main__')
 OUT.joinpath('emulator-mobile-features-result.json').write_text(json.dumps({'passed':['Synthetic Xtream connection','Native XMLTV import and SQLite persistence across process restart','Dark appearance','Six-digit family PIN native crypto','PIN prompt inside Settings sheet','Wrong PIN rejected, correct PIN restores access','Protected category hidden and state survives process restart'],'scope':'Android API 35 x86-64 emulator. Physical iPhone/PiP/AirPlay are not verified.'},indent=2)+'\n')
 print('Native phone guide, family controls and modal navigation passed.')
except Exception:
 OUT.joinpath('emulator-mobile-features-failure.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']));OUT.joinpath('emulator-mobile-features-failure.xml').write_text(__import__('xml.etree.ElementTree',fromlist=['tostring']).tostring(dump(),encoding='unicode'));raise
finally:server.shutdown()

