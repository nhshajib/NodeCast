"""Fullscreen TV episode transitions using synthetic metadata and a generated MP4."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=Path(__file__).parent
video=Path('tests/fixtures/android-episode-test.mp4').read_bytes(); requested=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1280,'height':720})
 context.add_init_script("localStorage.setItem('nodecast.preferences.v2',JSON.stringify({onboarded:true,player:'internal',baseline:null,homeIPSetup:'skipped'}))")
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def provider(r):
  url=r.request.url
  if '.mp4' in url:
   requested.append(url.split('?')[0].rsplit('/',1)[-1]);r.fulfill(content_type='video/mp4',body=video);return
  if 'action=get_series_info' in url:value={'episodes':{'2':[{'id':1002,'title':'Final Episode','episode_num':1}],'1':[{'id':905,'title':'Episode Two','episode_num':2},{'id':401,'title':'Episode One','episode_num':1}]}}
  elif 'action=get_series_categories' in url:value=[{'category_id':'1','category_name':'Example series'}]
  elif 'action=get_series' in url:value=[{'series_id':77,'name':'Sample Series','category_id':'1'}]
  elif 'action=' in url:value=[]
  else:value={'user_info':{'auth':1,'status':'Active'}}
  r.fulfill(json=value)
 page.route('https://provider.example/**',provider)
 page.route('https://ipwho.is/',lambda r:r.fulfill(json={'success':True,'ip':'203.0.113.42','city':'Example City','country':'Example Country'}))
 page.goto('http://127.0.0.1:8086');page.get_by_test_id('startup-splash').wait_for(state='detached',timeout=15000)
 page.get_by_role('button',name='Add your playlist',exact=True).click()
 for label,value in [('Profile name','Series test'),('Server address','https://provider.example'),('Username','example'),('Password','example')]:page.get_by_label(label,exact=True).fill(value)
 page.get_by_role('button',name='Connect playlist',exact=True).click()
 page.get_by_text('Series',exact=True).click();page.get_by_role('button',name='Open Sample Series',exact=True).click()
 page.get_by_text('Episode Two',exact=True).click()
 page.wait_for_function("document.querySelector('video')?.readyState >= 2")
 page.locator('video').evaluate('(e)=>{e.currentTime=14}')
 page.wait_for_timeout(1200)
 page.get_by_role('button',name='Back to library',exact=True).click()
 page.get_by_role('button',name='Open Sample Series',exact=True).click()
 page.get_by_text('Episode One',exact=True).click()
 page.wait_for_function("document.querySelector('video')?.readyState >= 2")
 first=page.get_by_test_id('next-episode');assert 'Episode Two' in first.get_attribute('aria-label')
 box=first.bounding_box();assert box['x']+box['width']>1024 and box['y']>540,box
 page.screenshot(path=str(out/'tv-next-episode.png'))
 first.click();page.get_by_text('Episode Two',exact=True).wait_for();page.wait_for_function("document.querySelector('video')?.readyState >= 2")
 assert page.locator('video').evaluate('(e)=>e.currentTime')<4, 'Next should start at zero, even when this episode was watched before'
 assert 'Season 2' in page.get_by_test_id('next-episode').get_attribute('aria-label')
 page.screenshot(path=str(out/'tv-next-season.png'))
 page.get_by_test_id('next-episode').click();page.get_by_text('Final Episode',exact=True).wait_for();page.wait_for_function("document.querySelector('video')?.readyState >= 2")
 assert page.get_by_test_id('next-episode').count()==0
 assert all(f'{episode}.mp4' in requested for episode in [401,905,1002]),requested
 page.screenshot(path=str(out/'tv-last-episode.png'))
 assert not errors,errors
 (out/'next-episode-checks.json').write_text(json.dumps({'passed':['Opens an episode without reloading it as a series','Fullscreen bottom-right button','Provider IDs 401 → 905 → 1002, without guessed URLs','Numerical season and episode ordering','Cross-season next episode','Starts at zero despite saved progress','Last episode has no Next button'],'requestedFiles':requested,'errors':errors,'scope':'Chromium UI and playback fixture. Android native playback checked separately.'},indent=2)+'\n')
 browser.close();print('Next-episode browser checks passed.')
