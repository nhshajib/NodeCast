from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json,time,sys,threading,http.server,functools,re
root=Path(__file__).resolve().parents[2];out=root/'verification/glowtv';app=root/'apps/player'
video=Path(__import__('os').environ.get('NODECAST_SCREENSHOT_CLIP',str(app/'assets/demo/glow-study.mp4'))).read_bytes();art=(app/'assets/demo/Evening.png').read_bytes();now=time.time();stamp=lambda t:time.strftime('%Y%m%d%H%M%S +0000',time.gmtime(t))
xml='<tv>'+''.join(f'<channel id="ch{i}"><display-name>{n}</display-name></channel>'+''.join(f'<programme channel="ch{i}" start="{stamp(now-1200+j*2400)}" stop="{stamp(now+1200+j*2400)}"><title>{t}</title><desc>Original demo schedule for GlowTV interface verification.</desc></programme>' for j,t in enumerate(['Evening studio','Wild North','Quiet studio'])) for i,n in enumerate(['Evening studio','Wild North','Quiet studio'],1))+'</tv>'
def provider(r):
 u=r.request.url
 if '.mp4' in u or '/live/' in u or '/movie/' in u or '/series/' in u:r.fulfill(content_type='video/mp4',body=video);return
 if '.jpg' in u:r.fulfill(content_type='image/jpeg',body=art);return
 if 'xmltv.php' in u or 'guide.xml' in u:r.fulfill(content_type='application/xml',body=xml);return
 if 'get_live_streams' in u:v=[{'stream_id':i,'name':name,'category_id':'1','epg_channel_id':f'ch{i}','stream_icon':f'https://provider.example/art{i}.jpg','direct_source':'https://provider.example/live.mp4','tv_archive':1,'tv_archive_duration':7} for i,name in enumerate(['Evening studio','Wild North','Quiet studio'],1)]
 elif 'get_live_categories' in u:v=[{'category_id':'1','category_name':'Documentary'}]
 elif 'get_series_info' in u:v={'episodes':{'1':[{'id':401,'title':'Episode One','episode_num':1,'container_extension':'mp4','info':{'movie_image':'https://provider.example/art.jpg'}},{'id':402,'title':'Episode Two','episode_num':2,'container_extension':'mp4'}],'2':[{'id':501,'title':'A new season','episode_num':1,'container_extension':'mp4'}]}}
 elif 'get_series_categories' in u:v=[{'category_id':'1','category_name':'Drama'}]
 elif 'action=get_series' in u:v=[{'series_id':77,'name':'Tidewater Stories','category_id':'1','cover':'https://provider.example/art.jpg','plot':'A sample series for testing seasons and playback.'}]
 elif 'get_vod_categories' in u:v=[{'category_id':'1','category_name':'Animation'}]
 elif 'get_vod_streams' in u:v=[{'stream_id':i,'name':n,'category_id':'1','container_extension':'mp4','stream_icon':'https://provider.example/art.jpg'} for i,n in [(1,'Tidewater'),(2,'Evening light')]]
 elif 'get_short_epg' in u:v={'epg_listings':[]}
 elif 'action=' in u:v=[]
 else:v={'user_info':{'auth':1,'status':'Active'},'server_info':{'timezone':'UTC'}}
 r.fulfill(json=v)
def button(page,name):
 if name=='Close programme details':name='Close'
 if name=='Go back':
  if '/sheet/' in page.url:return page.get_by_role('button',name='Close',exact=True).first
  return page.locator('[aria-label$=", back"], [aria-label="Go back"], [aria-label="Back"]').filter(visible=True).last
 candidates=page.get_by_role('button',name=name,exact=True)
 for candidate in candidates.all():
  if candidate.evaluate('(el)=>{const r=el.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;const hit=document.elementFromPoint(x,y);return x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&!!hit&&(hit===el||el.contains(hit))}'):
   return candidate
 return candidates.filter(visible=True).last
# Each capture run serves its own exports; no stale background server is used.
class QuietHandler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
ports={}
for platform in ['ios','android','tv']:
 directory=Path('/tmp/glowtv-'+platform)
 if not (directory/'index.html').exists():raise RuntimeError(f'Export {platform} to {directory} before capturing')
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(directory)))
 threading.Thread(target=server.serve_forever,daemon=True).start();ports[platform]=server.server_address[1]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);results={}
 for name,port,w,h in [('ios',ports['ios'],440,956),('ipad',ports['ios'],1032,1376),('android',ports['android'],360,780),('tv',ports['tv'],960,540)]:
  c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=2 if name in ('tv','ipad') else 3,reduced_motion='reduce');c.add_init_script("localStorage.setItem('nodecast.preferences.v2',JSON.stringify({onboarded:true,player:'internal',baseline:null,homeIPSetup:'skipped',theme:'"+('light' if name in ('ios','ipad') else 'dark')+"'}))")
  page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('https://provider.example/**',provider);page.route('https://ipwho.is/**',lambda r:r.abort());page.goto(f'http://127.0.0.1:{port}');button(page,'Add your playlist' if name=='tv' else 'Add playlist').wait_for(timeout=30000);page.wait_for_timeout(2500);page.get_by_test_id('startup-splash').wait_for(state='detached',timeout=30000)
  button(page,'Add your playlist' if name=='tv' else 'Add playlist').click()
  for label,value in [('Profile name','My playlist'),('Server address','https://provider.example'),('Username','example'),('Password','example')]:page.get_by_label(label,exact=True).fill(value)
  page.wait_for_timeout(250);page.screenshot(path=str(out/f'{name}-playlists.png'))
  button(page,'Connect playlist').click();page.wait_for_timeout(2000)
  if name=='tv':
   button(page,'Settings').click();button(page,'Library organization').click();page.get_by_role('switch',name='Channel logos in list view').click();button(page,'Back').click();button(page,'Home').click();page.wait_for_timeout(1500)
  page.wait_for_timeout(250);page.screenshot(path=str(out/f'{name}-home.png'))
  if name!='tv':
   # Preserve an actual visible saved/unsaved state through the icon migration.
   button(page,'Save favorite: Evening studio').click()
   saved=button(page,'Remove favorite: Evening studio');saved.wait_for(timeout=10000)
   expect(saved.locator('svg')).to_have_attribute('fill','#E8EEEA')
   saved.click()
   expect(button(page,'Save favorite: Evening studio').locator('svg')).to_have_attribute('fill','none')
  # Full guide source and detail sheet through the original saved profile.
  (button(page,'TV guide') if name=='tv' else page.get_by_test_id('navigation-tab-guide')).click();button(page,'Add full TV guide').click();page.get_by_label('XMLTV URL',exact=True).fill('https://provider.example/guide.xml');button(page,'Save and refresh guide').click();page.get_by_role('button',name='Evening studio,',exact=False).first.wait_for(timeout=20000)
  if name in ('ios','ipad'):page.get_by_role('button',name='Evening studio,',exact=False).first.click()
  if name=='tv':button(page,'Preview Evening studio').click();page.wait_for_timeout(1500)
  page.wait_for_timeout(250);page.screenshot(path=str(out/f'{name}-guide.png'))
  if name in ('ios','ipad'):button(page,'Close programme details').click()
  if name=='tv':
   button(page,'Close mini player').click();button(page,'Back').click();button(page,'Live TV').click()
  else:page.get_by_test_id('navigation-tab-home').click()
  button(page,'Watch live' if name!='tv' else 'Play Evening studio').click();page.wait_for_timeout(1500);
  page.wait_for_timeout(250);page.screenshot(path=str(out/f'{name}-player.png'))
  button(page,'Back to library').first.click()
  if name!='tv':
   (page.get_by_test_id('navigation-tab-movies') if name in ('ios','ipad') else button(page,'Movies')).click();page.get_by_role('button',name='Open Tidewater',exact=True).filter(visible=True).first.wait_for(timeout=30000);page.wait_for_timeout(250);page.screenshot(path=str(out/f'{name}-movies.png'))
   if name=='android':page.get_by_test_id('navigation-tab-home').click()
   (page.get_by_test_id('navigation-tab-series') if name in ('ios','ipad') else button(page,'Series')).click();page.get_by_role('button',name='Open Tidewater Stories',exact=True).filter(visible=True).last.click();page.get_by_role('button',name='Start series',exact=True).wait_for(timeout=20000);page.wait_for_timeout(250);page.screenshot(path=str(out/f'{name}-series.png'));button(page,'Go back').click()
  if name=='tv':
   button(page,'Movies').click();page.wait_for_timeout(250);page.screenshot(path=str(out/'tv-movies.png'));button(page,'Series').click();page.get_by_role('button',name='Open Tidewater Stories',exact=True).filter(visible=True).last.click();page.wait_for_timeout(800);page.wait_for_timeout(250);page.screenshot(path=str(out/'tv-series.png'));button(page,'Back').click()
  # Every settings destination remains reachable through the redesigned shell.
  settings_names = ['Appearance','Family controls','Playback' if name=='tv' else 'Default player','Library organization','Backup & transfer','Library & storage','Set home IP reference' if name=='tv' else 'Home IP & connection','Version history']
  def open_settings():
   if name=='android':page.get_by_test_id('navigation-tab-settings').click()
   else:button(page,'Settings').click()
  open_settings()
  button(page,'Playback' if name=='tv' else 'Default player').wait_for(timeout=30000)
  page.wait_for_timeout(250);page.screenshot(path=str(out/f'{name}-settings.png'))
  for destination in settings_names:
   button(page,destination).click();page.wait_for_timeout(180)
   button(page,'Back' if name=='tv' else 'Go back').click()
  # Small/large phones, 1080p and 4K-equivalent TV logical sizes; both themes.
  sizes = [(960,540),(1280,720),(1920,1080)] if name=='tv' else [(320,568),(393,852),(430,932),(768,1024)]
  geometries=[]
  for theme in ['light','dark']:
   button(page,'Appearance').click();page.get_by_role('radio',name=theme+' appearance',exact=True).click();button(page,'Back' if name=='tv' else 'Go back').click()
   for width,height in sizes:
    page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(100)
    overflow=page.evaluate('document.documentElement.scrollWidth > window.innerWidth')
    geometries.append({'theme':theme,'width':width,'height':height,'overflow':overflow})
    assert not overflow,(name,theme,width,height)
  results[name]={'savedFavoriteVisualState':'passed' if name!='tv' else 'shared icon; remote audit separate','errors':errors,'checkedDestinations':settings_names,'geometries':geometries,'screenshots':'home, guide'+(', player, series' if name!='tv' else ''),'scope':'React Native Web platform preview; not a native-device test'}
  assert not errors,errors
  page.set_viewport_size({'width':w,'height':h})
  if name in ('ios','ipad'):
   button(page,'Appearance').click();page.get_by_role('radio',name='Light',exact=True).click();button(page,'Go back').click();button(page,'Go back').click()
  if name=='tv':
   button(page,'Search').click()
  elif name in ('ios','ipad'):page.get_by_test_id('navigation-tab-search').click()
  else:page.get_by_test_id('navigation-tab-home').click();button(page,'Search').click()
  page.wait_for_timeout(250);page.screenshot(path=str(out/f'{name}-search.png'))
  if name!='tv':
   if name=='android':button(page,'Go back').click()
   # Check existing retained cells, not only a fresh screen in each theme.
   for kind,tab,title in [('posters','movies' if name in ('ios','ipad') else 'library','Tidewater'),('rows','search' if name in ('ios','ipad') else 'live','Evening studio')]:
    page.get_by_test_id('navigation-tab-'+tab).click()
    cell=page.get_by_role('button',name='Open '+title,exact=True).filter(visible=True).last
    cell.wait_for(timeout=30000)
    for theme,expected in [('dark','rgb(232, 238, 234)'),('light','rgb(17, 22, 19)')]:
     open_settings();button(page,'Appearance').click();page.get_by_role('radio',name=theme+' appearance',exact=True).click();button(page,'Go back').click()
     if name in ('ios','ipad'):button(page,'Go back').click()
     else:page.get_by_test_id('navigation-tab-'+tab).click()
     text=cell.get_by_text(title,exact=True);text.wait_for(timeout=30000)
     expect(text).to_have_css('color',expected)
   results[name]['retainedCardThemeRoundTrip']='posters and rows, dark then light: passed'
  c.close();print(name,'PASS',flush=True)
 b.close();(out/'browser-audit.json').write_text(json.dumps(results,indent=2)+'\n')
