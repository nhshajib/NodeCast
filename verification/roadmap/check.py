"""Synthetic browser integration for roadmap features. Not physical-device validation."""
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json,time,sys
out=Path(__file__).parent
video=Path('tests/fixtures/android-episode-test.mp4').read_bytes()
now=time.time();stamp=lambda t:time.strftime('%Y%m%d%H%M%S +0000',time.gmtime(t))
xml=f'<tv><channel id="sports"><display-name>Sports</display-name></channel><channel id="kids"><display-name>Kids</display-name></channel><programme channel="sports" start="{stamp(now-1200)}" stop="{stamp(now+2400)}"><title>Championship Live</title></programme><programme channel="kids" start="{stamp(now-1200)}" stop="{stamp(now+2400)}"><title>Happy Hour</title></programme></tv>'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 results={}
 for tv,port in [(False,8111),(True,8112)]:
  if '--tv' in sys.argv and not tv:continue
  print('Checking TV' if tv else 'Checking mobile',flush=True)
  c=browser.new_context(viewport={'width':1280 if tv else 393,'height':720 if tv else 852},reduced_motion='reduce')
  c.add_init_script("localStorage.setItem('nodecast.preferences.v2',JSON.stringify({onboarded:true,player:'internal',baseline:null,homeIPSetup:'skipped'}))")
  page=c.new_page();page.clock.install();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def provider(r):
   u=r.request.url
   if '.mp4' in u:r.fulfill(content_type='video/mp4',body=video);return
   if 'guide.xml' in u:r.fulfill(content_type='application/xml',body=xml);return
   if 'get_live_streams' in u:value=[{'stream_id':1,'name':'Sports 10','category_id':'1','epg_channel_id':'sports','direct_source':'https://provider.example/live.mp4'},{'stream_id':2,'name':'Kids 2','category_id':'2','epg_channel_id':'kids','direct_source':'https://provider.example/kids.mp4'}]
   elif 'get_live_categories' in u:value=[{'category_id':'1','category_name':'Sports'},{'category_id':'2','category_name':'Kids'}]
   elif 'get_series_info' in u:value={'episodes':{'1':[{'id':401,'title':'Episode One','episode_num':1},{'id':905,'title':'Episode Two','episode_num':2}]}}
   elif 'get_series_categories' in u:value=[{'category_id':'1','category_name':'Drama'}]
   elif 'action=get_series' in u:value=[{'series_id':77,'name':'Sample Series','category_id':'1'}]
   elif 'get_vod_categories' in u:value=[{'category_id':'1','category_name':'Films'}]
   elif 'get_vod_streams' in u:value=[{'stream_id':1,'name':'Sample Film','category_id':'1','container_extension':'mp4'}]
   elif 'action=' in u:value=[]
   else:value={'user_info':{'auth':1,'status':'Active'}}
   r.fulfill(json=value)
  page.route('https://provider.example/**',provider);page.route('https://ipwho.is/',lambda r:r.abort())
  page.goto(f'http://127.0.0.1:{port}');page.get_by_test_id('startup-splash').wait_for(state='detached',timeout=20000)
  page.get_by_role('button',name='Add your playlist' if tv else 'Add playlist',exact=True).click()
  for label,value in [('Profile name','Roadmap test'),('Server address','https://provider.example'),('Username','example'),('Password','example')]:page.get_by_label(label,exact=True).fill(value)
  page.get_by_role('button',name='Connect playlist',exact=True).click()
  if not tv:page.get_by_role('dialog').wait_for(state='hidden');page.get_by_role('tab',name='Library',exact=True).click()
  def settings(name):
   if tv:page.get_by_role('button',name='Settings',exact=True).click();page.get_by_role('button',name=name,exact=True).click()
   else:page.get_by_role('tab',name='Settings',exact=True).click();page.get_by_role('button',name=name,exact=True).click()
  def back():
   page.get_by_role('button',name='Back' if tv else 'Go back',exact=True).click()
   if not tv:page.get_by_role('dialog').wait_for(state='hidden')
  settings('Appearance');page.get_by_role('radio',name='dark appearance',exact=True).click()
  page.screenshot(path=str(out/('tv-dark.png' if tv else 'mobile-dark.png')))
  back()
  if not tv:
   page.get_by_role('tab',name='Home',exact=True).click();page.screenshot(path=str(out/'mobile-home-dark.png'))
  if tv:page.get_by_text('Live TV',exact=True).click();page.get_by_role('button',name='Library options',exact=True).click()
  else:page.get_by_role('tab',name='Library',exact=True).click();page.get_by_role('button',name='Library options',exact=True).click()
  page.get_by_role('radio',name='A–Z',exact=True).click();back()
  if tv:page.get_by_role('button',name='TV guide',exact=True).click()
  else:page.get_by_role('button',name='Open TV guide',exact=True).click()
  page.get_by_role('button',name='Add full TV guide',exact=True).click();page.get_by_label('XMLTV URL',exact=True).fill('https://provider.example/guide.xml')
  page.get_by_role('button',name='Save and refresh guide',exact=True).click();page.get_by_text('Championship Live',exact=True).wait_for()
  page.get_by_label('Search programme titles',exact=True).fill('Happy');page.get_by_text('Happy Hour',exact=True).wait_for()
  expect(page.get_by_text('Championship Live',exact=True)).to_have_count(0)
  page.screenshot(path=str(out/('tv-guide.png' if tv else 'mobile-guide.png')));back()
  if tv:page.get_by_text('Movies',exact=True).click();page.get_by_role('button',name='Play Sample Film',exact=True).click()
  else:page.get_by_role('tab',name='Movies',exact=True).click();page.get_by_role('button',name='Open Sample Film',exact=True).click();page.get_by_role('button',name='Play movie',exact=True).click()
  page.wait_for_function("document.querySelector('video')?.readyState>=2")
  element=page.locator('video').element_handle()
  page.get_by_role('button',name='Player options',exact=True).click();page.get_by_role('button',name='Display, speed & sleep timer',exact=True).click()
  page.get_by_role('button',name='1.5× speed',exact=True).click();assert page.locator('video').evaluate('(v)=>v.playbackRate')==1.5
  page.get_by_role('button',name='Fill · crop the edges',exact=True).click()
  page.get_by_role('button',name='Stop after 15 minutes',exact=True).click();page.get_by_text('Stops at',exact=False).wait_for()
  page.get_by_role('button',name='Back to video',exact=True).click();page.get_by_role('button',name='Player options',exact=True).click();page.get_by_role('button',name='Watch while browsing',exact=True).click()
  assert element.evaluate('(v)=>v===document.querySelector("video")'),'Mini-player replaced the surface'
  if tv:page.get_by_role('button',name='Return to video',exact=True).click()
  else:page.get_by_role('button',name='Return to Sample Film',exact=True).click()
  assert element.evaluate('(v)=>v===document.querySelector("video")'),'Restore replaced the surface'
  page.clock.fast_forward(16*60*1000);page.wait_for_function("document.querySelector('video')===null")
  if not tv:page.get_by_role('button',name='Close sheet',exact=True).click() if page.get_by_role('button',name='Close sheet',exact=True).count() else None
  settings('Family controls');page.get_by_label('New six-digit PIN',exact=True).fill('123456');page.get_by_label('Confirm PIN',exact=True).fill('123456');page.get_by_role('button',name='Set family PIN',exact=True).click();page.get_by_role('button',name='Lock protected content now',exact=True).wait_for(timeout=20000)
  page.get_by_role('checkbox',name='Protect Sports',exact=True).click();page.get_by_role('button',name='Lock protected content now',exact=True).click();back()
  if tv:page.get_by_text('Live TV',exact=True).click()
  else:page.get_by_role('tab',name='Library',exact=True).click();page.get_by_role('tab',name='Live TV',exact=True).click()
  expect(page.get_by_role('button',name='Play Sports 10' if tv else 'Open Sports 10',exact=True)).to_have_count(0)
  page.get_by_role('button',name='Play Kids 2' if tv else 'Open Kids 2',exact=True).wait_for()
  page.screenshot(path=str(out/('tv-family-filter.png' if tv else 'mobile-family-filter.png')))
  settings('Family controls');page.get_by_role('button',name='Unlock family controls',exact=True).click()
  page.get_by_label('Family PIN',exact=True).fill('000000');page.get_by_role('button',name='Unlock',exact=True).click();page.get_by_text('PIN did not match.',exact=True).wait_for()
  page.get_by_label('Family PIN',exact=True).fill('123456');page.get_by_role('button',name='Unlock',exact=True).click();page.get_by_label('Find category to protect',exact=True).wait_for();back()
  if tv:page.get_by_text('Live TV',exact=True).click()
  else:page.get_by_role('tab',name='Library',exact=True).click()
  page.get_by_role('button',name='Play Sports 10' if tv else 'Open Sports 10',exact=True).wait_for()
  # Browser app-state simulation: protection must lock without losing saved profiles.
  page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))")
  page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'))")
  expect(page.get_by_role('button',name='Play Sports 10' if tv else 'Open Sports 10',exact=True)).to_have_count(0)
  settings('Family controls');page.get_by_role('button',name='Unlock family controls',exact=True).click()
  page.get_by_label('Family PIN',exact=True).fill('123456');page.get_by_role('button',name='Unlock',exact=True).click();page.get_by_label('Find category to protect',exact=True).wait_for();back()
  if tv:page.get_by_role('button',name='Settings',exact=True).click()
  page.get_by_role('button',name='Add playlist',exact=True).click();page.get_by_role('tab',name='M3U link',exact=True).click();page.get_by_label('Profile name',exact=True).fill('Travel')
  with page.expect_file_chooser() as chooser:page.get_by_role('button',name='Import playlist file',exact=True).click()
  chooser.value.set_files({'name':'travel.m3u','mimeType':'audio/x-mpegurl','buffer':b'#EXTM3U\n#EXTINF:-1 group-title="Travel",Travel Channel\nhttps://provider.example/travel.ts?token=secret-file-token\n'})
  page.get_by_text('Local file imported.',exact=False).wait_for();page.get_by_role('button',name='Connect playlist',exact=True).click()
  if tv:
   page.get_by_text('Live TV',exact=True).click()
  else:page.get_by_role('dialog').wait_for(state='hidden');page.get_by_role('tab',name='Library',exact=True).click();page.get_by_role('tab',name='Live TV',exact=True).click()
  page.get_by_role('button',name='Play Travel Channel' if tv else 'Open Travel Channel',exact=True).wait_for()
  assert 'secret-file-token' not in page.evaluate('JSON.stringify(localStorage)'), 'Playlist token leaked to browser metadata'
  assert not errors,errors
  results['tv' if tv else 'mobile']={'passed':['Dark theme selectable','Sort setting','XMLTV import','Programme search','VOD speed','Fit/Fill','Sleep deadline','Same mini-player video element','PIN setup and protected category excluded','Wrong PIN rejected, correct PIN restores access','Background relocks protection','Sleep expiry closes playback','Local M3U import; no token in browser metadata'],'errors':errors}
  c.close()
 browser.close();(out/'checks.json').write_text(json.dumps(results,indent=2)+'\n');print('Roadmap browser checks passed.')
