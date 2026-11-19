"""Exercise the actual native audit origin against HTTP media-serving contracts."""
import ast, http.server, threading, urllib.request, urllib.error, json, time, hashlib, subprocess
from pathlib import Path
from urllib.parse import urlparse,parse_qs
ROOT=Path(__file__).resolve().parents[2]
APP=ROOT/'apps/player'
VIDEO=(APP/'assets/demo/glow-study.mp4').read_bytes()
def load(source):
 node=next(n for n in ast.parse(source).body if isinstance(n,ast.ClassDef)and n.name=='Handler')
 scope=dict(http=http,APP=APP,urlparse=urlparse,parse_qs=parse_qs,time=time,json=json,CHANNELS=[('demo','Evening studio')],stamp=lambda v:time.strftime('%Y%m%d%H%M%S +0000',time.gmtime(v)))
 exec(compile(ast.Module(body=[node],type_ignores=[]),'<native-fixture>','exec'),scope)
 return scope['Handler']
def check(handler,baseline=False):
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler);threading.Thread(target=server.serve_forever,daemon=True).start()
 def request(range_value=None,method='GET'):
  req=urllib.request.Request(f'http://127.0.0.1:{server.server_port}/live.mp4',headers={'Range':range_value}if range_value else {},method=method)
  try:
   with urllib.request.urlopen(req,timeout=5)as response:return response.status,response.headers,response.read()
  except urllib.error.HTTPError as response:return response.code,response.headers,response.read()
 try:
  status,headers,body=request('bytes=0-127')
  if baseline:return {'rangeStatus':status,'rangeBytes':len(body)}
  assert status==206 and body==VIDEO[:128]and headers['Content-Range']==f'bytes 0-127/{len(VIDEO)}'
  assert headers['Accept-Ranges']=='bytes'and int(headers['Content-Length'])==128
  for value,start,end in [('bytes=128-999',128,1000),('bytes=-64',len(VIDEO)-64,len(VIDEO)),('bytes=128-',128,len(VIDEO))]:
   status,headers,body=request(value);assert status==206 and body==VIDEO[start:end],value
  for value in [f'bytes={len(VIDEO)}-','bytes=10-2','bytes=-0','bytes=invalid']:
   status,headers,body=request(value);assert status==416 and not body and headers['Content-Range']==f'bytes */{len(VIDEO)}',value
  status,headers,body=request(method='HEAD');assert status==200 and not body and int(headers['Content-Length'])==len(VIDEO)
  status,headers,body=request();assert status==200 and body==VIDEO
  return {'rangeStatus':206,'rangeBytes':128,'partialSuffixOpenEndedInvalidHeadFullRequests':'passed','unchangedVideoSha256':hashlib.sha256(VIDEO).hexdigest()}
 finally:server.shutdown();server.server_close()
old=subprocess.check_output(['git','show','HEAD:verification/glowtv/android-capture.py'],cwd=ROOT,text=True)
result={'before':check(load(old),baseline=True),'after':check(load((ROOT/'verification/glowtv/android-capture.py').read_text())),'scope':'Native-test transport only. Production APK, original media bytes and native pixel/process assertions remain unchanged.'}
print(json.dumps(result,indent=2))
