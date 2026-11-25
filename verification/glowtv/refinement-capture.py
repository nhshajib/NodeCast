from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import threading,http.server,functools,json,re,time,urllib.parse,os
root=Path(__file__).resolve().parents[2];out=root/'verification/glowtv/refinement-2026-11-25';out.mkdir(exist_ok=True)
clip=(root/'apps/player/assets/demo/glow-study.mp4').read_bytes();art=(root/'apps/player/assets/demo/Evening.png').read_bytes()
def provider(route):
 url=route.request.url;action=urllib.parse.parse_qs(urllib.parse.urlsplit(url).query).get('action',[''])[0]
 if url.endswith('.png'):route.fulfill(body=art,content_type='image/png');return
 if url.endswith(('.mp4','.m3u8','.ts')):route.fulfill(body=clip,content_type='video/mp4');return
 categories=[{'category_id':str(i),'category_name':n}for i,n in [(1,'News'),(2,'Sport'),(3,'Kids')]]
 if action.endswith('_categories'):value=categories
 elif action=='get_live_streams':value=[{'stream_id':i,'name':n,'category_id':str(i),'stream_icon':'https://provider.example/art.png'}for i,n in [(1,'Evening studio'),(2,'Wild North'),(3,'Quiet studio')]]
 elif action=='get_vod_streams':value=[{'stream_id':7,'name':'Tidewater','category_id':'1','container_extension':'mp4','stream_icon':'https://provider.example/art.png'}]
 elif action=='get_series':value=[]
 else:value={'user_info':{'auth':1,'status':'Active'},'server_info':{'timezone':'UTC'}}
 route.fulfill(json=value)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
def button(page,name):
 candidates=page.get_by_role('button',name=name,exact=True)
 for candidate in candidates.all():
  if candidate.evaluate('(el)=>{const r=el.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;const h=document.elementFromPoint(x,y);return !!h&&(h===el||el.contains(h))}'):return candidate
 return candidates.filter(visible=True).last
selection=os.environ.get('GLOWTV_CAPTURE_PROFILE');assert selection in [None,'iphone','android','ipad','tv'],selection
results=json.loads((out/'checks.json').read_text()) if selection and (out/'checks.json').exists() else {}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 for name,edition,width,height in [('iphone','ios',393,852),('android','android',412,915),('ipad','ios',1032,1376),('tv','tv',960,540)]:
  if selection and name!=selection:continue
  server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory='/tmp/glowtv-refine-'+edition));threading.Thread(target=server.serve_forever,daemon=True).start()
  context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2,reduced_motion='reduce');context.add_init_script("localStorage.setItem('nodecast.preferences.v2',JSON.stringify({onboarded:true,player:'internal',theme:'"+('light'if edition=='ios'else'dark')+"',baseline:null}))")
  page=context.new_page();errors=[];lookups=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:lookups.append(r.url)if 'ipwho.is' in r.url else None);page.route('https://provider.example/**',provider)
  try:
   page.goto('http://127.0.0.1:'+str(server.server_address[1]));page.get_by_test_id('startup-splash').wait_for(state='detached',timeout=30000)
   button(page,'Add your playlist'if edition=='tv'else'Add playlist').click();page.get_by_role('tab',name='Xtream Codes',exact=True).click()
   for label,value in [('Profile name','Home'),('Server address','https://provider.example'),('Username','demo'),('Password','demo')]:page.get_by_label(label,exact=True).fill(value)
   button(page,'Connect playlist').click();page.get_by_text(re.compile('^Good (morning|afternoon|evening)\\.$')).wait_for(timeout=20000)
   assert button(page,'Watch live').count()==0,'Non-favorite channel was promoted to hero'
   page.screenshot(path=str(out/(name+'-greeting.png')))
   if edition=='tv':button(page,'Live TV').click();button(page,'Save favorite: Evening studio').click();button(page,'Home').click()
   else:page.get_by_test_id('navigation-tab-live').click();button(page,'Add Evening studio to favorites').click();page.get_by_test_id('navigation-tab-home').click()
   button(page,'Watch live').wait_for(timeout=20000)
   if edition=='tv':button(page,'Watch live').focus();page.wait_for_timeout(150)
   page.screenshot(path=str(out/(name+'-home.png')))
   if edition=='tv':button(page,'Live TV').click();button(page,'Library options').click();button(page,'Favorite categories').click()
   else:page.get_by_test_id('navigation-tab-live').click();button(page,'Favorite categories').click()
   row=page.get_by_role('checkbox',name='Sport, favorite category',exact=True);row.click();expect(row).to_be_checked();page.screenshot(path=str(out/(name+'-category-settings.png')))
   if edition=='tv':button(page,'Back').click();button(page,'Live TV').click()
   else:page.locator('[aria-label$=", back"], [aria-label="Go back"], [aria-label="Back"]').filter(visible=True).last.click()
   pinned=page.get_by_role('button',name='Sport, favorite category',exact=True);pinned.wait_for();news=page.get_by_label('News',exact=True)
   assert pinned.bounding_box()['x']<news.bounding_box()['x'],'Favorite category not ordered first'
   page.screenshot(path=str(out/(name+'-live.png')))
   if edition=='tv':button(page,'Settings').click()
   elif edition=='android':page.get_by_test_id('navigation-tab-settings').click()
   else:page.get_by_test_id('navigation-tab-home').click();button(page,'Settings').click()
   assert page.get_by_text('Your connection',exact=True).count()==0
   assert page.get_by_text('Home IP & connection',exact=True).count()==0
   assert page.get_by_text('Connection details',exact=True).count()==0
   if edition=='tv':
    # Settings deliberately has no current-page items. Management must use
    # the active profile's cached catalogue, and keep the saved pin visible.
    organization=page.get_by_role('button',name=re.compile('^Library organization,'))
    organization.focus();page.wait_for_timeout(150);organization.click();button(page,'Favorite categories').click()
    row=page.get_by_role('checkbox',name='Sport, favorite category',exact=True)
    expect(row).to_be_checked();row.click();expect(row).not_to_be_checked();row.click();expect(row).to_be_checked()
    page.screenshot(path=str(out/'tv-category-from-settings.png'));button(page,'Back').click()
   if edition=='ios':page.locator('[aria-label$=", back"], [aria-label="Go back"], [aria-label="Back"]').filter(visible=True).last.click()
   # Verify transport placement against the real decoded VOD surface.
   if edition=='tv':
    button(page,'Movies').click();movieTile=page.get_by_role('button',name=re.compile('^Play Tidewater,'));movieTile.focus();page.wait_for_timeout(150);movieTile.click()
   else:
    page.get_by_test_id('navigation-tab-library').click();page.wait_for_timeout(350)
    movieChoice=button(page,'Movies')
    if movieChoice.count():movieChoice.click()
    else:page.get_by_role('tab',name='Movies',exact=True).filter(visible=True).last.click()
    page.get_by_role('button',name=re.compile('^Open Tidewater,')).click();button(page,'Play movie').click()
   pause=page.get_by_role('button',name='Pause video',exact=True);start=page.get_by_role('button',name='Play video',exact=True)
   page.wait_for_function('document.querySelector("video")?.readyState>=2',timeout=30000)
   if start.is_visible():start.click()
   page.wait_for_function('document.querySelector("video").currentTime>.3',timeout=15000)
   hide=button(page,'Hide player controls')
   if hide.count():hide.click(position={'x':4,'y':hide.bounding_box()['height']/2})
   page.wait_for_function('Number(getComputedStyle(document.querySelector("[data-testid=video-controls-scrim]").parentElement).opacity)===0',timeout=10000)
   button(page,'Show player controls').click();pause.wait_for(timeout=10000);pause.click();page.wait_for_timeout(300)
   play=page.get_by_role('button',name='Play video',exact=True).bounding_box();back=page.get_by_role('button',name='Back to library',exact=True).bounding_box();seek=page.get_by_label('Seek video',exact=True) if edition!='tv' else page.get_by_label('Video progress, Left or Right to seek ten seconds',exact=True)
   seek.wait_for(timeout=10000)
   if seek.count():
    bar=seek.bounding_box();assert play['y']>=back['y']+back['height'],(name,play,back);assert play['y']+play['height']<=bar['y'],(name,play,bar)
   page.screenshot(path=str(out/(name+'-player.png')))
   assert not lookups,lookups
   assert not errors,errors
   results[name]={'greetingWithoutFavorite':True,'favoriteLiveHero':True,'categoryPinAndOrder':True,'noConnectionSettings':True,'noPublicIPRequests':True,'centeredPlayer':True,'videoShadeFollowsControls':True,'categorySettingsUsesCachedCatalog':edition=='tv','pageErrors':errors}
   print(name+' passed',flush=True)
  except Exception:
   (out/(name+'-failure-state.json')).write_text(json.dumps(page.evaluate('''()=>({videos:[...document.querySelectorAll('video')].map(v=>({paused:v.paused,time:v.currentTime})),scrims:[...document.querySelectorAll('[data-testid=video-controls-scrim]')].map(el=>{let nodes=[];for(let n=el;n&&nodes.length<4;n=n.parentElement)nodes.push({opacity:getComputedStyle(n).opacity,style:n.getAttribute('style'),testID:n.getAttribute('data-testid')});return nodes})})'''),indent=2))
   page.screenshot(path=str(out/(name+'-failure.png')));(out/(name+'-failure.txt')).write_text(page.locator('body').inner_text());raise
  finally:context.close();server.shutdown()
 browser.close()
(out/'checks.json').write_text(json.dumps(results,indent=2)+'\n')
