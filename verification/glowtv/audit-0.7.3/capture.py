"""Reproducible RN Web audit. No credentials, real channels, or native verification."""
from pathlib import Path
import functools,http.server,threading,json,re,time,os
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[3]
# Reuse only the existing legally generated provider fixture and helpers, never its capture loop.
fixture=ROOT/'verification/glowtv/capture.py'
ns={'__file__':str(fixture)}
exec(fixture.read_text().split('# Each capture run')[0],ns)
provider=ns['provider']
OUT=Path(__file__).resolve().parent/'after';OUT.mkdir(exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
 def send_head(self):
  if not Path(self.translate_path(self.path.split('?')[0])).exists():self.path='/index.html'
  return super().send_head()
ports={}
if not Path('/tmp/glowtv-073-exports-ready').exists():raise RuntimeError('Run verify-phase.sh to completion before capturing; exporting deletes its output directory.')
for name,directory in [('ios','/tmp/glowtv-web'),('android','/tmp/glowtv-android-web'),('tv','/tmp/glowtv-tv-web')]:
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=directory))
 threading.Thread(target=server.serve_forever,daemon=True).start();ports[name]=server.server_address[1]
def btn(page,name,exact=True):
 candidates=page.get_by_role('button',name=name,exact=exact).filter(visible=True)
 for c in candidates.all():
  if c.evaluate('(e)=>{let r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,h=document.elementFromPoint(x,y);return x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&h&&(h===e||e.contains(h))}'):return c
 return candidates.last

def back(page,tv=False):
 if tv:btn(page,'Back').click();return
 buttons=page.locator('[aria-label$=", back"], [aria-label="Go back"], [aria-label="Back"]').filter(visible=True)
 if buttons.count():buttons.last.click()
 else:btn(page,'Done').click()

def run():
 results=[]
 selection=os.environ.get('AUDIT_CASE','')
 tvdp=os.environ.get('AUDIT_TV_DP')=='1'
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
  devices=[('tv',960,540,'tv')] if tvdp else [('ios',393,852,'ios'),('android',412,915,'android'),('ipad',1032,1376,'ios'),('tv',1920,1080,'tv')]
  for device,width,height,platform in devices:
   for theme in ['light','dark']:
    for scale in ([1] if device=='tv' else [1,2]):
     case=f'{device}'+('-dp1080' if tvdp else '')+f'-{theme}-text{scale}'
     if selection and selection not in case:continue
     print('START',case,flush=True)
     context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2 if tvdp else 1,reduced_motion='reduce',color_scheme=theme)
     context.add_init_script("localStorage.setItem('nodecast.preferences.v2',JSON.stringify({onboarded:true,player:'internal',baseline:null,homeIPSetup:'skipped',theme:"+json.dumps(theme)+"}))")
     page=context.new_page();page.set_default_timeout(10000);errors=[];shots=[];geometries=[];patches=[]
     page.on('pageerror',lambda e:errors.append(str(e)))
     page.route('https://provider.example/**',provider);page.route('https://ipwho.is/**',lambda r:r.abort())
     if scale==2:
      def scale_bundle(route):
       response=route.fetch();body=response.text()
       body,count=re.subn(r'fontScale:1(?=[,}])','fontScale:2',body)
       if count:patches.append(count)
       route.fulfill(response=response,body=body)
      page.route('**/*.js',scale_bundle)
     def capture(screen):
      page.wait_for_timeout(350)
      path=OUT/f'{case}-{screen}.png';page.screenshot(path=str(path));shots.append(str(path.relative_to(ROOT)))
      geometries.append({'screen':screen,'overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth')})
     try:
      page.goto(f'http://127.0.0.1:{ports[platform]}/');btn(page,'Add your playlist' if device=='tv' else 'Add playlist').wait_for(timeout=30000)
      page.get_by_test_id('startup-splash').wait_for(state='detached',timeout=30000)
      btn(page,'Add your playlist' if device=='tv' else 'Add playlist').click()
      for label,value in [('Profile name','My playlist'),('Server address','https://provider.example'),('Username','example'),('Password','example')]:page.get_by_label(label,exact=True).fill(value)
      capture('playlists');btn(page,'Connect playlist').click();page.wait_for_timeout(2200);capture('home')
      if device!='tv':
       page.get_by_test_id('home-content').evaluate('(e)=>e.scrollTop=e.scrollHeight');capture('home-bottom');page.get_by_test_id('home-content').evaluate('(e)=>e.scrollTop=0')
      (btn(page,'TV guide') if device=='tv' else page.get_by_test_id('navigation-tab-guide')).click()
      btn(page,'Add full TV guide').click();page.get_by_label('XMLTV URL',exact=True).fill('https://provider.example/guide.xml');btn(page,'Save and refresh guide').click()
      btn(page,re.compile(r'^Evening studio,')).wait_for(timeout=20000);capture('guide')
      if device=='tv':btn(page,'Back').click();btn(page,'Live TV').click()
      else:page.get_by_test_id('navigation-tab-home').click()
      btn(page,'Play Evening studio' if device=='tv' else 'Watch live').click();page.wait_for_timeout(1000);capture('player')
      btn(page,'Audio and subtitles').click();capture('player-tracks');btn(page,'Back to video' if device=='tv' else 'Close audio and subtitles').click()
      btn(page,'Back to library').click()
      if device=='tv':btn(page,'Movies').click()
      else:page.get_by_test_id('navigation-tab-library').click();page.get_by_role('tab',name='Movies',exact=True).click()
      btn(page,re.compile(r'^Play Tidewater,' if device=='tv' else r'^Open Tidewater,')).wait_for(timeout=20000)
      if device=='tv':
       btn(page,re.compile(r'^Play Tidewater,')).focus();page.wait_for_timeout(200);btn(page,re.compile(r'^Play Tidewater,')).focus()
      capture('movies')
      # Confirm stable route identity. Web intentionally does not persist provider credentials; native cold restoration needs a native build.
      if device!='tv':
       btn(page,re.compile(r'^Play Tidewater,' if device=='tv' else r'^Open Tidewater,')).click();page.wait_for_timeout(300);assert 'id=' in page.url and 'section=movies' in page.url;btn(page,'Play movie').wait_for(timeout=20000);btn(page,'Play movie').click();page.wait_for_timeout(600);capture('vod-player');btn(page,'Back to library').click();back(page)
      else:
       btn(page,re.compile(r'^Play Tidewater,')).click();page.wait_for_timeout(600);capture('vod-player');btn(page,'Back to library').click()
      if device=='tv':btn(page,'Series').click()
      else:page.get_by_role('tab',name='Series',exact=True).click()
      btn(page,re.compile(r'^Open Tidewater Stories')).click();btn(page,'Start series').wait_for(timeout=20000);capture('series');btn(page,'Start series').click();page.wait_for_timeout(600);capture('episode-player');btn(page,'Back to library').click();back(page,device=='tv')
      def settings():
       if device=='android':page.get_by_test_id('navigation-tab-settings').click()
       else:btn(page,'Settings').click()
      settings();capture('settings')
      visited=[]
      for title in ['Appearance','Family controls','Playback' if device=='tv' else 'Default player','Library organization','Backup & transfer','Library & storage','Home IP reference' if device=='tv' else 'Home IP & connection','Version history']:
       print(case,'SETTINGS',title,flush=True);btn(page,re.compile('^'+re.escape(title)+r'(?:,|$)')).click();page.wait_for_timeout(150)
       if title=='Backup & transfer':
        expect(page.get_by_role('tab',name='Export backup',exact=True)).to_have_attribute('aria-selected','true')
        page.get_by_role('tab',name='Import backup',exact=True).click();expect(page.get_by_role('tab',name='Import backup',exact=True)).to_have_attribute('aria-selected','true');page.get_by_role('tab',name='Export backup',exact=True).click()
       capture('settings-'+re.sub('[^a-z0-9]+','-',title.lower()).strip('-'));visited.append(title);back(page,device=='tv')
      if device=='tv':btn(page,'Search').click()
      elif device=='android':page.get_by_test_id('navigation-tab-live').click()
      else:
       back(page);page.get_by_test_id('navigation-tab-search').click()
      page.wait_for_timeout(1000)
      label='Search channels and titles' if device=='tv' else 'Search library'
      page.wait_for_function("label=>[...document.querySelectorAll('input')].some(e=>{if(e.getAttribute('aria-label')!==label)return false;let r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&document.elementFromPoint(x,y)===e})",arg=label)
      for field in page.get_by_label(label,exact=True).all():
       if field.evaluate('(e)=>{let r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e}'):
        field.fill('Tidewater' if device=='tv' else 'Evening');break
      if device!='tv':page.get_by_text(re.compile(r'^1 result' if device=='android' else r'^2 results')).filter(visible=True).last.wait_for(timeout=15000)
      else:btn(page,re.compile(r'^Open Tidewater Stories')).wait_for(timeout=15000)
      capture('search')
      assert not errors,errors
      assert not any(g['overflow'] for g in geometries),geometries
      if scale==2:assert patches and max(patches)==4,patches
      result={'case':case,'passed':True,'screenshots':shots,'geometries':geometries,'settingsDestinations':visited,'pageErrors':errors,'dimensionFontScalePatches':patches,'idDetailParams':device!='tv','nativeColdDetailRestore':'not verified; browser credential vault is intentionally memory-only'}
     except Exception as e:
      page.screenshot(path=str(OUT/f'{case}-FAIL.png'));(OUT/f'{case}-FAIL.txt').write_text(page.locator('body').inner_text())
      result={'case':case,'passed':False,'error':str(e),'url':page.url,'searchFields':page.locator('input[aria-label*="Search"]').evaluate_all('(xs)=>xs.map(e=>({value:e.value,label:e.getAttribute("aria-label"),hidden:!!e.closest("[aria-hidden=true]"),rect:e.getBoundingClientRect().toJSON()}))'),'screenshots':shots,'pageErrors':errors}
     results.append(result);context.close();print(case,'PASS' if result['passed'] else result.get('error'),flush=True)
     (OUT.parent/('browser-audit-tv-dp1080.json' if tvdp else 'browser-audit-'+selection+'.json' if selection else 'browser-audit.json')).write_text(json.dumps(results,indent=2)+'\n')
     if not result['passed']:break
    if results and not results[-1]['passed']:break
   if results and not results[-1]['passed']:break
  browser.close()
 return all(r['passed'] for r in results)
if __name__=='__main__':raise SystemExit(0 if run() else 1)
