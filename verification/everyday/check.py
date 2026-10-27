"""Browser behavior checks with synthetic IPTV metadata/video; no real credentials."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, os
out=Path(__file__).parent
video=Path('tests/fixtures/android-episode-test.mp4').read_bytes()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 results={}
 for tv,port in [(False,8091),(True,8092)]:
  context=browser.new_context(viewport={'width':1280 if tv else 393,'height':720 if tv else 852},reduced_motion='reduce')
  context.add_init_script("localStorage.setItem('nodecast.preferences.v2',JSON.stringify({onboarded:true,player:'internal',baseline:null,homeIPSetup:'skipped'}))")
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));fail=[False]
  def provider(r):
   u=r.request.url
   if '.mp4' in u:r.fulfill(content_type='video/mp4',body=video);return
   if 'get_live_streams' in u:
    if fail[0]:r.fulfill(status=503,body='Unavailable');return
    value=[{'stream_id':i,'name':f'Channel {i:03d}','category_id':'1' if i%2 else '2'} for i in range(1,101)]
   elif 'get_live_categories' in u:value=[{'category_id':'1','category_name':'Sports'},{'category_id':'2','category_name':'News'}]
   elif 'get_series_info' in u:value={'episodes':{'2':[{'id':1002,'title':'Final Episode','episode_num':1}],'1':[{'id':905,'title':'Episode Two','episode_num':2},{'id':401,'title':'Episode One','episode_num':1}]}}
   elif 'get_series_categories' in u:value=[{'category_id':'1','category_name':'Drama'}]
   elif 'action=get_series' in u:value=[{'series_id':77,'name':'Sample Series','category_id':'1'}]
   elif 'action=' in u:value=[]
   else:value={'user_info':{'auth':1,'status':'Active'}}
   r.fulfill(json=value)
  page.route('https://provider.example/**',provider)
  page.route('https://ipwho.is/',lambda r:r.abort())
  page.goto(f'http://127.0.0.1:{port}');page.get_by_test_id('startup-splash').wait_for(state='detached',timeout=15000)
  page.get_by_role('button',name='Add your playlist' if tv else 'Add playlist',exact=True).click()
  for label,value in [('Profile name','Example test'),('Server address','https://provider.example'),('Username','example'),('Password','example')]:page.get_by_label(label,exact=True).fill(value)
  page.get_by_role('button',name='Connect playlist',exact=True).click()
  if not tv:page.get_by_role('dialog').wait_for(state='hidden');page.get_by_role('tab',name='Library',exact=True).click()
  else:page.get_by_role('button',name='Play Channel 001',exact=True).wait_for()
  page.get_by_role('button',name='Sports',exact=True).click()
  search=page.get_by_role('textbox',name='Search channels and titles' if tv else 'Search library',exact=True)
  search.fill('Channel');page.get_by_role('radio',name='This category',exact=True).wait_for()
  page.get_by_role('button',name='Play Channel 001' if tv else 'Open Channel 001',exact=True).wait_for()
  assert page.get_by_role('button',name='Play Channel 002' if tv else 'Open Channel 002',exact=True).count()==0
  page.get_by_role('radio',name='This media type',exact=True).click()
  page.get_by_role('button',name='Play Channel 002' if tv else 'Open Channel 002',exact=True).wait_for()
  search.fill('Channel 001')
  page.get_by_role('button',name='Playback options for Channel 001',exact=True).click()
  page.get_by_role('radio',name='External VLC',exact=True).click()
  page.get_by_role('button',name='Save playback options',exact=True).click();page.get_by_text('Saved. Applies next time you open this channel.',exact=True).wait_for()
  page.get_by_role('button',name='Back' if tv else 'Go back',exact=True).click()
  search=page.get_by_role('textbox',name='Search channels and titles' if tv else 'Search library',exact=True)
  assert search.input_value()=='Channel 001'
  page.get_by_role('button',name='Play Channel 001' if tv else 'Open Channel 001',exact=True).click()
  page.get_by_role('button',name='Open in VLC',exact=True).wait_for()
  page.get_by_role('button',name='Back' if tv else 'Go back',exact=True).click()
  fail[0]=True
  page.get_by_role('button',name='Refresh library',exact=True).click()
  page.get_by_role('button',name='Play Channel 001' if tv else 'Open Channel 001',exact=True).wait_for()
  assert search.input_value()=='Channel 001'
  page.screenshot(path=str(out/('tv-search.png' if tv else 'mobile-search.png')))
  fail[0]=False
  if tv:page.get_by_text('Series',exact=True).click()
  else:page.get_by_role('tab',name='Series',exact=True).click()
  page.get_by_role('button',name='Open Sample Series',exact=True).click()
  page.get_by_role('button',name='Mark watched',exact=True).first.click()
  page.get_by_text('Watched',exact=True).wait_for()
  page.get_by_role('button',name='Play Episode One',exact=True).click()
  page.wait_for_function("document.querySelector('video')?.readyState >= 2")
  page.get_by_role('button',name='Player options',exact=True).click()
  page.get_by_role('button',name='Playback information',exact=True).click()
  report=page.get_by_role('textbox',name='Redacted playback report, select text to copy').input_value()
  assert 'example' not in report and 'http' not in report
  page.screenshot(path=str(out/('tv-information.png' if tv else 'mobile-information.png')))
  page.get_by_role('button',name='Back to video',exact=True).click()
  next_button=page.get_by_test_id('next-episode') if tv else page.get_by_role('button',name='Next episode',exact=True)
  next_button.click();page.wait_for_function("document.querySelector('video')?.readyState >= 2")
  page.wait_for_function("document.querySelector('video')?.currentSrc.includes('905.mp4')")
  next_button=page.get_by_test_id('next-episode') if tv else page.get_by_role('button',name='Next episode',exact=True)
  next_button.click();page.wait_for_function("document.querySelector('video')?.currentSrc.includes('1002.mp4')")
  assert page.get_by_test_id('next-episode').count()==0 if tv else page.get_by_role('button',name='Next episode',exact=True).count()==0
  page.get_by_role('button',name='Back to library',exact=True).click()
  assert page.get_by_role('tab',name='Season 2',exact=True).get_attribute('aria-selected')=='true'
  page.get_by_role('tab',name='Season 2',exact=True).click()
  page.get_by_role('button',name='Play Final Episode',exact=True).wait_for()
  page.screenshot(path=str(out/('tv-series.png' if tv else 'mobile-series.png')))
  assert not errors,errors
  results['tv' if tv else 'mobile']={'passed':['Category remains selected while typing','Visible search scope changes results','Channel-specific player persists and opens external chooser','Back restores query','Failed refresh keeps cached search results','Manual watched state','Player information excludes server and credentials','Next episodes 401 → 905 → 1002','Final episode has no Next','Back restores season selection access'],'errors':errors}
  context.close()
 browser.close()
 (out/'checks.json').write_text(json.dumps({'scope':'Chromium with synthetic provider/video, not native device verification','results':results},indent=2)+'\n')
 print('Mobile and TV everyday browser checks passed.')
