import http.server,json,threading,time,base64,os
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
ROOT=Path(os.environ.get('NODECAST_WEB_EXPORT','build/tv-web'));OUT=Path(os.environ.get('NODECAST_QA_OUTPUT','verification/tv-library'));OUT.mkdir(parents=True,exist_ok=True);calls={};logos=[]
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aBT0AAAAASUVORK5CYII=')
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  parsed=urlparse(self.path)
  if parsed.path.startswith('/logo/'):
   logos.append(parsed.path);self.send_response(200);self.send_header('Content-Type','image/png');self.send_header('Content-Length',str(len(PNG)));self.end_headers();self.wfile.write(PNG);return
  if parsed.path=='/player_api.php':
   action=parse_qs(parsed.query).get('action',[''])[0];calls[action]=calls.get(action,0)+1
   if action=='get_live_categories':data=[{'category_id':str(i),'category_name':f'Group {i}'} for i in range(1,31)]
   elif action=='get_live_streams':data=[{'stream_id':i,'name':f'Channel {3001-i}','category_id':str(1+(i-1)%30),'tv_archive':0,'stream_icon':f'http://127.0.0.1:8751/logo/{i}.png'} for i in range(1,3001)]
   elif action=='get_vod_categories':data=[{'category_id':'m','category_name':'Cinema'}]
   elif action=='get_vod_streams':data=[{'stream_id':i,'name':f'Film {i}','category_id':'m','container_extension':'mp4'} for i in range(1,13)]
   elif action=='get_series_categories':data=[]
   elif action=='get_series':data=[]
   else:data={'user_info':{'auth':1,'status':'Active'},'server_info':{'timezone':'UTC'}}
   body=json.dumps(data).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
  super().do_GET()
server=http.server.ThreadingHTTPServer(('127.0.0.1',8751),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':960,'height':540});errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 def button(name):return page.get_by_role('button',name=name,exact=True)
 def click(name):button(name).click()
 def radio(name):return page.get_by_role('radio',name=name,exact=True)
 def selected(name):assert radio(name).inner_text().startswith('●'),name+' not selected'
 page.goto('http://127.0.0.1:8751');page.wait_for_timeout(3000)
 if button('Not now').count():click('Not now')
 click('Add your playlist')
 for label,value in [('Profile name','TV Library Test'),('Server address','http://127.0.0.1:8751'),('Username','fixture'),('Password','fixture')]:page.get_by_role('textbox',name=label,exact=True).fill(value)
 click('Connect playlist');button('Play Channel 3000').wait_for();button('Grid view').wait_for()
 assert not logos,'Default list requested channel artwork'
 assert not calls.get('get_vod_streams',0) and not calls.get('get_series',0),'Live TV eagerly loaded other libraries'
 count=page.get_by_role('button',name='Play Channel',exact=False).count();assert count<80,f'Too many mounted channel rows: {count}'
 assert button('TV guide').bounding_box()['x']+button('TV guide').bounding_box()['width']<=960,'Toolbar clipped at native TV logical resolution'
 page.screenshot(path=str(OUT/'tv-channel-list.png'))
 click('Library options');selected('Channel layout: List');radio('A–Z').click();selected('A–Z');click('Back');button('Play Channel 1').wait_for()
 assert calls['get_live_streams']==1,'Organization refetched a fresh live library'
 click('Grid view');button('List view').wait_for();page.wait_for_timeout(500);assert logos,'Grid did not load requested artwork'
 click('List view');button('Grid view').wait_for();page.wait_for_timeout(500);before=len(logos)
 search=page.get_by_role('textbox',name='Search channels and titles',exact=True);start=time.perf_counter();search.fill('Channel 2222');button('Play Channel 2222').wait_for();search_ms=(time.perf_counter()-start)*1000
 page.wait_for_timeout(300);assert len(logos)==before,'List search downloaded more channel logos';search.fill('');button('Play Channel 1').wait_for()
 click('Group 1');click('Library options');click('Categories');page.get_by_role('textbox',name='Find category',exact=True).fill('Group 1');page.get_by_role('switch',name='Show Group 1',exact=True).click();click('Back')
 assert button('All').is_visible();button('Play Channel 1').wait_for()
 click('Library options');click('Categories');page.get_by_role('textbox',name='Find category',exact=True).fill('Group 1');assert 'Hidden' in page.get_by_role('switch',name='Show Group 1',exact=True).inner_text();page.get_by_role('switch',name='Show Group 1',exact=True).click();click('Back')
 click('Save favorite: Channel 1');button('Remove favorite: Channel 1').wait_for();click('Save favorite: Channel 2');button('Remove favorite: Channel 2').wait_for();click('Library options');click('Favorites order');click('Move Channel 2 up');page.wait_for_timeout(250)
 assert button('Move Channel 2 down').is_enabled();click('Back');click('Favorites');button('Play Channel 2').wait_for();assert button('Play Channel 2').bounding_box()['y']<button('Play Channel 1').bounding_box()['y'],'Favorites order did not apply'
 click('Settings');click('Library organization');radio('Organize Movies').click();radio('Z–A').click();selected('Z–A');radio('All media').click();selected('All media')
 assert not calls.get('get_vod_streams',0),'Preferences loaded a movie library before categories were requested'
 click('Categories');page.get_by_role('switch',name='Show Cinema',exact=True).wait_for();assert calls['get_vod_streams']==1 and not calls.get('get_series',0)
 page.screenshot(path=str(OUT/'tv-organization-categories.png'));click('Back');click('Movies');button('Play Film 12').wait_for();assert calls['get_vod_streams']==1,'Movies did not reuse the organization catalogue'
 click('Settings');click('Library organization');selected('Organize Movies');selected('Z–A');selected('All media');radio('Organize Live TV').click();selected('A–Z');selected('Current category');selected('Channel layout: List');page.screenshot(path=str(OUT/'tv-organization-preferences.png'))
 assert not errors,errors
 (OUT/'browser-result.json').write_text(json.dumps({'passed':['3000-channel default text list, bounded mounted rows, no channel image requests','Live TV does not preload Movies/Series; preferences do not fetch catalogues','List/Grid toggle and list search skip image downloads','Hidden selected category returns to All; category visibility persists in session','Favorites reorder reaches displayed order without losing IDs','Media-specific sort/search settings preserve Live TV and Movies independently','Movie categories load lazily and are reused when opening Movies','No browser runtime errors'],'mountedPlayRows':count,'searchToVisibleMs':round(search_ms,2),'providerCalls':calls,'scope':'Chromium shared TV interface with synthetic provider. Native remote performance and durable restart checks are separate.'},indent=2))
 print('PASS: TV library browser integration',flush=True);browser.close()
server.shutdown()
