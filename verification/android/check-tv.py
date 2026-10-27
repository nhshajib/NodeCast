"""TV layout/browser interaction check using a synthetic provider; not a native remote test."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=Path(__file__).parent
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1280,'height':720})
 context.add_init_script("localStorage.setItem('nodecast.preferences.v2',JSON.stringify({onboarded:true,player:'internal',baseline:null,homeIPSetup:'skipped'}))")
 page=context.new_page(); errors=[]; page.on('pageerror',lambda e: errors.append(str(e)))
 def provider(r):
  u=r.request.url
  if 'get_live_streams' in u: r.fulfill(json=[{'stream_id':i,'name':f'Example Channel {i:03d}','category_id':'1'} for i in range(1,101)])
  elif 'get_live_categories' in u: r.fulfill(json=[{'category_id':'1','category_name':'Sports'}])
  elif 'action=' in u: r.fulfill(json=[])
  else:r.fulfill(json={'user_info':{'auth':1,'status':'Active'}})
 page.route('https://provider.example/**',provider)
 page.route('https://ipwho.is/', lambda r:r.fulfill(json={'success':True,'ip':'203.0.113.42','city':'Example City','country':'Example Country'}))
 page.goto('http://127.0.0.1:8086');page.get_by_test_id('startup-splash').wait_for(state='detached',timeout=15000)
 page.get_by_role('button',name='Add your playlist',exact=True).click()
 page.get_by_role('textbox',name='Profile name',exact=True).fill('Living room')
 page.get_by_role('textbox',name='Server address',exact=True).fill('https://provider.example')
 page.get_by_role('textbox',name='Username',exact=True).fill('example')
 page.get_by_label('Password',exact=True).fill('example')
 page.get_by_role('button',name='Connect playlist',exact=True).click()
 page.get_by_role('button',name='Play Example Channel 001',exact=True).wait_for()
 page.get_by_role('textbox',name='Search channels and titles').fill('Channel 023')
 page.get_by_role('button',name='Play Example Channel 023',exact=True).wait_for()
 assert page.get_by_role('button',name='Play Example Channel 001',exact=True).count()==0
 page.get_by_role('button',name='Save favorite: Example Channel 023',exact=True).click()
 page.get_by_text('Favorites',exact=True).click()
 page.get_by_role('button',name='Play Example Channel 023',exact=True).wait_for()
 page.screenshot(path=str(out/'tv-favorites.png'))
 page.get_by_text('Live TV',exact=True).click()
 page.get_by_role('button',name='Play Example Channel 001',exact=True).wait_for()
 tile=page.get_by_role('button',name='Play Example Channel 001',exact=True)
 tile.focus();page.wait_for_timeout(100)
 assert tile.evaluate('(e)=>parseFloat(getComputedStyle(e).outlineWidth)')==3
 boxes=[page.get_by_role('button',name=f'Play Example Channel {i:03d}',exact=True).bounding_box() for i in range(1,4)]
 assert all(abs(boxes[0]['y']-b['y'])<2 for b in boxes)
 page.screenshot(path=str(out/'tv-library.png'))
 page.get_by_text('Settings',exact=True).click()
 page.get_by_role('button',name='Version history',exact=True).click()
 page.get_by_text('What’s new',exact=True).wait_for()
 page.get_by_role('button',name='Back',exact=True).click()
 page.get_by_text('Your profiles',exact=True).wait_for()
 page.screenshot(path=str(out/'tv-settings.png'))
 page.set_viewport_size({'width':960,'height':540})
 page.get_by_text('Live TV',exact=True).click()
 badge=page.get_by_role('button',name='Connection details in Settings').bounding_box()
 assert badge['y']+badge['height'] <= 540, badge
 footer=page.get_by_text('Free, always. · 0.3.3',exact=True).bounding_box()
 assert footer['y']+footer['height'] <= 540, footer
 page.screenshot(path=str(out/'tv-compact-960x540.png'))
 assert not errors,errors
 (out/'tv-checks.json').write_text(json.dumps({'passed':['Xtream connection with synthetic provider','100-channel library','Search','Favorites saved and filtered','Three columns at 1280x720','Visible keyboard focus outline','Version history and Back navigation'],'errors':errors,'scope':'Browser UI checks. Native D-pad, decoder and hardware behavior require device tests.'},indent=2)+'\n')
 browser.close()
 print('TV browser checks passed.')
