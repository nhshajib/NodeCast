from pathlib import Path
from playwright.sync_api import sync_playwright
import http.server,functools,threading,time,json
root=Path(__file__).resolve().parents[2];out=root/'verification/glowtv/refinement-2026-11-25'
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 for edition,width,height,reduced,fail in [('ios',393,852,False,False),('android',412,915,False,False),('tv',960,540,False,False),('ios',393,852,True,False),('ios',393,852,False,True)]:
  server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory='/tmp/glowtv-refine-'+edition));threading.Thread(target=server.serve_forever,daemon=True).start()
  context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2,reduced_motion='reduce'if reduced else'no-preference')
  context.add_init_script("localStorage.setItem('nodecast.preferences.v2',JSON.stringify({onboarded:true,player:'internal',theme:'dark',baseline:null}))")
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  if fail:page.route('**/*.mp4',lambda r:r.abort())
  started=time.monotonic();page.goto('http://127.0.0.1:'+str(server.server_address[1]));splash=page.get_by_test_id('startup-splash');splash.wait_for(state='visible',timeout=15000)
  dimensions=None
  if not reduced and not fail:
   page.wait_for_function('document.querySelector("video")?.readyState>=2',timeout=10000)
   dimensions=page.locator('video').first.evaluate('(v)=>({width:v.videoWidth,height:v.videoHeight,muted:v.muted})')
   assert dimensions=={'width':1920 if edition=='tv'else 1080,'height':1080 if edition=='tv'else 1920,'muted':True},dimensions
   page.wait_for_timeout(1700);page.screenshot(path=str(out/('launch-'+edition+'.png')))
  splash.wait_for(state='detached',timeout=15000);elapsed=time.monotonic()-started
  assert (elapsed<4 if reduced else elapsed>=3.8),(edition,reduced,fail,elapsed)
  assert elapsed<12,(edition,reduced,fail,elapsed)
  assert not errors,errors
  results.append({'edition':edition,'reducedMotion':reduced,'decoderBlocked':fail,'seconds':round(elapsed,2),'video':dimensions,'passed':True})
  print(results[-1],flush=True);context.close();server.shutdown()
 browser.close()
(out/'launch-checks.json').write_text(json.dumps(results,indent=2)+'\n')
