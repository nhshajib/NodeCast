from playwright.sync_api import sync_playwright
from pathlib import Path
import json,time
playlist='#EXTM3U\n#EXTINF:-1 tvg-id="ch1" group-title="Documentary",Discover the world\nhttps://provider.example/live.m3u8\n'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(viewport={'width':412,'height':915},reduced_motion='reduce');c.add_init_script("localStorage.setItem('nodecast.preferences.v2',JSON.stringify({onboarded:true,homeIPSetup:'skipped',player:'internal',baseline:null,theme:'dark'}))")
 page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def service(r):
  u=r.request.url
  if 'get.php' in u:r.fulfill(status=404,body='Not found');return
  if 'playlist.m3u' in u:r.fulfill(content_type='audio/x-mpegurl',body=playlist);return
  if 'get_live_streams' in u:v=[{'stream_id':1,'name':'Discover the world','category_id':'1'}]
  elif 'get_live_categories' in u:v=[{'category_id':'1','category_name':'Documentary'}]
  elif 'action=' in u:v=[]
  else:v={'user_info':{'auth':1,'status':'Active'}}
  r.fulfill(json=v)
 page.route('https://provider.example/**',service);page.route('https://ipwho.is/**',lambda r:r.abort());page.goto('http://127.0.0.1:8152');page.get_by_role('button',name='Add playlist',exact=True).wait_for(timeout=30000);page.wait_for_timeout(2000)
 def add():page.get_by_role('button',name='Add playlist',exact=True).click();return page.get_by_role('dialog')
 d=add();d.get_by_role('tab',name='M3U link',exact=True).click();d.get_by_label('Profile name',exact=True).fill('Link profile');d.get_by_label('Playlist link',exact=True).fill('https://provider.example/playlist.m3u');d.get_by_role('button',name='Connect playlist',exact=True).click();d.wait_for(state='hidden');page.get_by_role('tab',name='Home',exact=True).click();page.get_by_role('button',name='Watch live',exact=True).wait_for(timeout=15000)
 d=add();d.get_by_role('tab',name='File',exact=True).click();d.get_by_label('Profile name',exact=True).fill('File profile')
 with page.expect_file_chooser() as chooser:d.get_by_role('button',name='Import playlist file',exact=True).click()
 chooser.value.set_files({'name':'public-test.m3u','mimeType':'audio/x-mpegurl','buffer':playlist.encode()});d.get_by_text('Local file imported.',exact=False).wait_for();d.get_by_role('button',name='Connect playlist',exact=True).click();d.wait_for(state='hidden')
 d=add();d.get_by_role('tab',name='M3U link',exact=True).click();d.get_by_label('Profile name',exact=True).fill('Recovery profile');d.get_by_label('Playlist link',exact=True).fill('https://provider.example/get.php?username=example&password=example&type=m3u_plus&output=ts');d.get_by_role('button',name='Connect playlist',exact=True).click();d.get_by_role('button',name='Connect with Xtream instead',exact=True).click();d.wait_for(state='hidden',timeout=20000)
 assert not errors,errors
 out=Path(__file__).resolve().with_name('source-methods.json');out.write_text(json.dumps({'passed':['M3U link import','File tab and file chooser import','M3U HTTP 404 recovery through Xtream'],'errors':errors,'scope':'Synthetic browser provider, dummy credentials only'},indent=2)+'\n');print('M3U, File and HTTP 404 recovery checks passed.');b.close()
