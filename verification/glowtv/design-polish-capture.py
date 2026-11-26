from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import threading,http.server,functools,json,re,time,urllib.parse,os
root=Path(__file__).resolve().parents[2];out=root/'verification/glowtv/design-polish-1.0.4'/os.environ.get('GLOWTV_CAPTURE_VARIANT','default');out.mkdir(exist_ok=True,parents=True)
clip=(root/'apps/player/assets/demo/glow-study.mp4').read_bytes();art=(root/'apps/player/assets/demo/Evening.png').read_bytes()
def provider(route):
 url=route.request.url;action=urllib.parse.parse_qs(urllib.parse.urlsplit(url).query).get('action',[''])[0]
 if 'xmltv.php' in url or 'guide.xml' in url:
  now=time.time();stamp=lambda t:time.strftime('%Y%m%d%H%M%S +0000',time.gmtime(t))
  xml='<tv>'+''.join(f'<channel id="ch{i}"><display-name>{n}</display-name></channel>'+''.join(f'<programme channel="ch{i}" start="{stamp(now-1200+j*2400)}" stop="{stamp(now+1200+j*2400)}"><title>{t}</title><desc>Original GlowTV demonstration schedule.</desc></programme>'for j,t in enumerate(['Evening light','A quiet morning','Wild North']))for i,n in [(1,'Evening studio'),(2,'Wild North'),(3,'Quiet studio')])+'</tv>'
  route.fulfill(body=xml,content_type='application/xml');return
 if url.endswith('.png'):route.fulfill(body=art,content_type='image/png');return
 if url.endswith(('.mp4','.m3u8','.ts')):route.fulfill(body=clip,content_type='video/mp4');return
 categories=[{'category_id':str(i),'category_name':n}for i,n in [(1,'News'),(2,'Sport'),(3,'Kids')]]
 if action.endswith('_categories'):value=categories
 elif action=='get_live_streams':value=[{'stream_id':i,'name':n,'epg_channel_id':f'ch{i}','category_id':str(i),'stream_icon':'https://provider.example/art.png'}for i,n in [(1,'Evening studio'),(2,'Wild North'),(3,'Quiet studio')]]
 elif action=='get_vod_streams':value=[{'stream_id':i,'name':n,'category_id':'1','container_extension':'mp4','stream_icon':'https://provider.example/art.png'}for i,n in enumerate(['Tidewater','Evening light','Quiet studio','Wild North','Paper skies','Morning stills','The coast','Night garden','Open water','Between tides','The long view','A quiet place'],7)]
 elif action=='get_series':value=[{'series_id':77,'name':'Tidewater Stories','category_id':'1','cover':'https://provider.example/art.png','plot':'An original sample series for verifying seasons and playback.'}]
 elif action=='get_series_info':value={'episodes':{'1':[{'id':401,'title':'Evening light','episode_num':1,'container_extension':'mp4','info':{'movie_image':'https://provider.example/art.png'}},{'id':402,'title':'A quiet morning','episode_num':2,'container_extension':'mp4'}],'2':[{'id':501,'title':'A new season','episode_num':1,'container_extension':'mp4'}]}}
 else:value={'user_info':{'auth':1,'status':'Active'},'server_info':{'timezone':'UTC'}}
 route.fulfill(json=value)
def capture(page,path):
 page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(250);page.screenshot(path=path)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
def visible_control(page,role,name):
 candidates=page.get_by_role(role,name=name,exact=True)
 deadline=time.time()+5
 while time.time()<deadline:
  for candidate in candidates.all():
   if candidate.evaluate('(el)=>{const r=el.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;const h=document.elementFromPoint(x,y);return x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&!!h&&(h===el||el.contains(h))}'):return candidate
  if not candidates.count():return candidates.last
  page.wait_for_timeout(200)
 return candidates.filter(visible=True).last
def button(page,name):return visible_control(page,'button',name)
def tab(page,name):return visible_control(page,'tab',name)
selection=os.environ.get('GLOWTV_CAPTURE_PROFILE');assert selection in [None,'iphone','android','ipad','tv'],selection
results=json.loads((out/'checks.json').read_text()) if selection and (out/'checks.json').exists() else {}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 for name,edition,width,height in [('iphone','ios',393,852),('android','android',412,915),('ipad','ios',1032,1376),('tv','tv',960,540)]:
  if selection and name!=selection:continue
  server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=os.environ.get('GLOWTV_CAPTURE_EXPORT_ROOT','/tmp/glowtv-polish-')+edition));threading.Thread(target=server.serve_forever,daemon=True).start()
  width=int(os.environ.get('GLOWTV_CAPTURE_WIDTH',width));height=int(os.environ.get('GLOWTV_CAPTURE_HEIGHT',height))
  context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=int(os.environ.get('GLOWTV_CAPTURE_DPR','2')),reduced_motion='reduce');context.add_init_script("localStorage.setItem('nodecast.preferences.v2',JSON.stringify({onboarded:true,player:'internal',theme:'"+os.environ.get('GLOWTV_CAPTURE_THEME',('light'if edition=='ios'else'dark'))+"',baseline:null}))")
  context.add_init_script('globalThis.__GLOWTV_AUDIT_FONT_SCALE__='+os.environ.get('GLOWTV_CAPTURE_FONT_SCALE','1'));page=context.new_page();errors=[];lookups=[];page.on('pageerror',lambda e:errors.append(str(e)+' '+str(e.stack)));page.on('request',lambda r:lookups.append(r.url)if 'ipwho.is' in r.url else None);page.route('https://provider.example/**',provider)
  try:
   page.goto('http://127.0.0.1:'+str(server.server_address[1]));page.get_by_test_id('startup-splash').wait_for(state='detached',timeout=30000)
   button(page,'Add your playlist'if edition=='tv'else'Add playlist').click();page.get_by_role('tab',name='Xtream Codes',exact=True).click();capture(page,path=str(out/(name+'-add-playlist.png')))
   for label,value in [('Profile name','Home'),('Server address','https://provider.example'),('Username','demo'),('Password','demo')]:page.get_by_label(label,exact=True).fill(value)
   button(page,'Connect playlist').click();page.get_by_text(re.compile('^Good (morning|afternoon|evening)\\.$')).wait_for(timeout=20000)
   assert button(page,'Watch live').count()==0,'Non-favorite channel was promoted to hero'
   capture(page,path=str(out/(name+'-greeting.png')))
   if edition=='tv':button(page,'Live TV').click();button(page,'Save favorite: Evening studio').click();button(page,'Home').click()
   else:page.get_by_test_id('navigation-tab-live').click();button(page,'Add Evening studio to favorites').click();page.get_by_test_id('navigation-tab-home').click()
   button(page,'Watch live').wait_for(timeout=20000)
   if edition=='tv':button(page,'Watch live').focus();page.wait_for_timeout(150)
   capture(page,path=str(out/(name+'-home.png')))
   if name=='ipad':
    page.set_viewport_size({'width':1376,'height':1032});page.wait_for_timeout(250);capture(page,path=str(out/'ipad-landscape-home.png'));page.set_viewport_size({'width':width,'height':height})
   if edition=='tv':button(page,'Live TV').click();button(page,'Library options').click();button(page,'Favorite categories').click()
   else:page.get_by_test_id('navigation-tab-live').click();button(page,'Favorite categories').click()
   row=page.get_by_role('checkbox',name='Sport, favorite category',exact=True);row.click();expect(row).to_be_checked();capture(page,path=str(out/(name+'-category-settings.png')))
   if edition=='tv':button(page,'Back').click();button(page,'Live TV').click()
   else:page.locator('[aria-label$=", back"], [aria-label="Go back"], [aria-label="Back"]').filter(visible=True).last.click()
   pinned=page.get_by_role('button',name='Sport, favorite category',exact=True);pinned.wait_for();news=page.get_by_label('News',exact=True)
   assert pinned.bounding_box()['x']<news.bounding_box()['x'],'Favorite category not ordered first'
   capture(page,path=str(out/(name+'-live.png')))
   if edition=='tv':button(page,'Settings').click()
   elif edition=='android':page.get_by_test_id('navigation-tab-settings').click()
   else:page.get_by_test_id('navigation-tab-home').click();button(page,'Settings').click()
   if edition!='tv':
    firstProfile=page.get_by_role('button',name=re.compile('^Manage active profile,')).filter(visible=True).last
    firstProfile.scroll_into_view_if_needed();firstProfile.evaluate('(el)=>{for(let n=el.parentElement;n;n=n.parentElement)n.scrollTop=0}')
   capture(page,path=str(out/(name+'-settings.png')))
   if os.environ.get('GLOWTV_CAPTURE_STOP_AFTER')=='settings':continue
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
    capture(page,path=str(out/'tv-category-from-settings.png'));button(page,'Back').click()
   destinations=['Appearance','Family controls','Playback'if edition=='tv'else'Default player','Library organization','Backup & transfer','Library & storage','Version history']
   def back():
    if edition=='tv':button(page,'Back').click()
    else:page.locator('[aria-label$=", back"], [aria-label="Go back"], [aria-label="Back"]').filter(visible=True).last.click()
   for destination in destinations:
    control=page.get_by_role('button',name=re.compile('^'+re.escape(destination)+r'(?:,|$)')).filter(visible=True).last
    control.scroll_into_view_if_needed();control.click();page.wait_for_timeout(250)
    capture(page,path=str(out/(name+'-settings-'+destination.lower().replace(' ','-')+'.png')))
    back()
   if edition=='ios':back()
   # Guide source and programme cells use the real parsed XMLTV pipeline.
   if edition=='tv':button(page,'TV guide').click()
   else:page.get_by_test_id('navigation-tab-guide').click()
   button(page,'Add full TV guide').click();page.get_by_label('XMLTV URL',exact=True).fill('https://provider.example/guide.xml');button(page,'Save and refresh guide').click()
   page.get_by_role('button',name=re.compile('Evening light')).first.wait_for(timeout=20000)
   capture(page,path=str(out/(name+'-guide.png')))
   if edition=='tv':back()
   # Series detail includes the scrollable header, seasons and episode rows.
   if edition=='tv':button(page,'Series').click()
   else:
    page.get_by_test_id('navigation-tab-library').click();tab(page,'Series').click()
   seriesTile=page.get_by_role('button',name=re.compile('^Open Tidewater Stories(?:,|$)')).filter(visible=True).last
   if edition=='tv':seriesTile.focus();page.wait_for_timeout(150)
   seriesTile.click()
   page.get_by_text('Evening light',exact=True).filter(visible=True).last.wait_for(timeout=20000)
   capture(page,path=str(out/(name+'-series.png')));back()
   if edition=='tv':
    button(page,'Search').click();search=page.get_by_label('Search channels and titles',exact=True)
   elif edition=='ios':
    page.get_by_test_id('navigation-tab-search').click();search=page.get_by_label('Search library',exact=True).filter(visible=True).last
   else:
    search=page.get_by_label('Search library',exact=True).filter(visible=True).last
   search.fill('Tidewater');page.wait_for_timeout(500);capture(page,path=str(out/(name+'-search.png')));search.fill('')
   # The same live transport appears on native and VLC; web exercises native.
   if edition=='tv':
    button(page,'Live TV').click();page.get_by_role('button',name=re.compile('^Play Evening studio(?:,|$)')).click()
   else:
    page.get_by_test_id('navigation-tab-live').click();page.get_by_role('button',name=re.compile('^Open Evening studio,')).click()
   page.get_by_test_id('live-channel-transport').wait_for(timeout=20000)
   page.wait_for_function('document.querySelector("video")?.currentTime>.5',timeout=20000)
   button(page,'Next channel').click()
   page.get_by_text('Wild North',exact=True).filter(visible=True).last.wait_for(timeout=20000)
   page.get_by_test_id('live-channel-transport').wait_for(timeout=20000)
   page.wait_for_function('document.querySelector("video")?.currentTime>.5',timeout=20000)
   button(page,'Previous channel').click()
   page.get_by_test_id('live-channel-transport').wait_for(timeout=20000)
   button(page,'Pause live TV').wait_for(timeout=20000)
   page.wait_for_function('document.querySelector("video")?.currentTime>.5',timeout=20000)
   capture(page,path=str(out/(name+'-live-player.png')))
   button(page,'Player options').click();capture(page,path=str(out/(name+'-player-options.png')));button(page,'Back to video').click()
   button(page,'Back to library').click()
   # Verify transport placement against the real decoded VOD surface.
   if edition=='tv':
    button(page,'Movies').click();movieTile=page.get_by_role('button',name=re.compile('^Play Tidewater,'));movieTile.focus();page.wait_for_timeout(150);movieTile.click()
   else:
    page.get_by_test_id('navigation-tab-library').click();page.wait_for_timeout(350)
    movieChoice=button(page,'Movies')
    if movieChoice.count():movieChoice.click()
    else:tab(page,'Movies').click()
    capture(page,path=str(out/(name+'-movies.png')));page.get_by_role('button',name=re.compile('^Open Tidewater,')).click();capture(page,path=str(out/(name+'-movie-detail.png')));button(page,'Play movie').click()
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
   capture(page,path=str(out/(name+'-player.png')))
   assert not lookups,lookups
   assert not errors,errors
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Root content overflows the viewport'
   results[name]={'greetingWithoutFavorite':True,'favoriteLiveHero':True,'categoryPinAndOrder':True,'noConnectionSettings':True,'noPublicIPRequests':True,'centeredPlayer':True,'visibleNextAndPrevious':True,'videoShadeFollowsControls':True,'categorySettingsUsesCachedCatalog':edition=='tv','pageErrors':errors,'fontScale':float(os.environ.get('GLOWTV_CAPTURE_FONT_SCALE','1')),'theme':os.environ.get('GLOWTV_CAPTURE_THEME',('light'if edition=='ios'else'dark')),'viewport':[width,height],'scope':'Browser platform preview, not a native device test','settingsDestinations':destinations,'guideAndSeries':True}
   print(name+' passed',flush=True)
  except Exception:
   (out/(name+'-failure-state.json')).write_text(json.dumps(page.evaluate('''()=>({videos:[...document.querySelectorAll('video')].map(v=>({paused:v.paused,time:v.currentTime})),scrims:[...document.querySelectorAll('[data-testid=video-controls-scrim]')].map(el=>{let nodes=[];for(let n=el;n&&nodes.length<4;n=n.parentElement)nodes.push({opacity:getComputedStyle(n).opacity,style:n.getAttribute('style'),testID:n.getAttribute('data-testid')});return nodes})})'''),indent=2))
   capture(page,path=str(out/(name+'-failure.png')));(out/(name+'-failure.txt')).write_text(page.locator('body').inner_text());raise
  finally:context.close();server.shutdown()
 browser.close()
(out/'checks.json').write_text(json.dumps(results,indent=2)+'\n')
