"""Run against the exported app on localhost:8085. Uses only a synthetic IPTV provider."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,time,tempfile,subprocess
out=Path(__file__).parent
streams=[{'stream_id':i+1,'name':f'Channel {i:05d}','category_id':str(i%40)} for i in range(30000)]
stream_json=json.dumps(streams)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    temporary=tempfile.TemporaryDirectory(prefix='nodecast-navigation-video-')
    context=browser.new_context(viewport={'width':393,'height':852},record_video_dir=temporary.name,record_video_size={'width':393,'height':852})
    context.add_init_script("localStorage.setItem('nodecast.preferences.v2',JSON.stringify({onboarded:true,player:'internal',baseline:null,homeIPSetup:'skipped'}))")
    started=time.monotonic();page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('https://ipwho.is/',lambda r:r.fulfill(json={'success':True,'ip':'203.0.113.42','city':'Example City','country':'Example Country'}))
    def provider(r):
        url=r.request.url
        if 'action=get_live_categories' in url:r.fulfill(json=[{'category_id':str(i),'category_name':f'Group {i:02d}'} for i in range(40)])
        elif 'action=get_live_streams' in url:r.fulfill(content_type='application/json',body=stream_json)
        else:r.fulfill(json={'user_info':{'auth':1,'status':'Active'}})
    page.route('https://provider.example/**',provider)
    page.goto('http://127.0.0.1:8085');page.get_by_test_id('startup-splash').wait_for(state='detached',timeout=10000)
    page.get_by_role('button',name='Add playlist',exact=True).click()
    dialog=page.get_by_role('dialog');dialog.get_by_role('textbox',name='Profile name',exact=True).fill('Example 30,000-channel library')
    dialog.get_by_role('textbox',name='Server address',exact=True).fill('https://provider.example')
    dialog.get_by_role('textbox',name='Username',exact=True).fill('example');dialog.get_by_label('Password',exact=True).fill('example')
    dialog.get_by_role('button',name='Connect playlist',exact=True).click();page.get_by_role('dialog').wait_for(state='hidden',timeout=15000);page.wait_for_timeout(700)
    def tab(name):page.get_by_role('tab',name=name,exact=True).click();page.wait_for_timeout(280)
    tab('Library');page.get_by_role('textbox',name='Search library',exact=True).fill('Channel 00123')
    page.get_by_role('button',name='Add Channel 00123 to favorites',exact=True).click()
    tab('Favorites');assert page.get_by_role('textbox',name='Search library',exact=True).input_value()==''
    page.get_by_role('button',name='Open Channel 00123',exact=True).wait_for()
    page.get_by_role('textbox',name='Search library',exact=True).fill('missing favorite');page.wait_for_timeout(180)
    tab('Library');assert page.get_by_role('textbox',name='Search library',exact=True).input_value()=='Channel 00123'
    tab('Favorites');assert page.get_by_role('textbox',name='Search library',exact=True).input_value()=='missing favorite'
    page.get_by_role('textbox',name='Search library',exact=True).fill('')
    tab('Home')
    def scroll(name, value=None):
        return page.get_by_test_id('tab-scene-'+name).evaluate('''(root,value)=>{const e=[root,...root.querySelectorAll('*')].find(e=>getComputedStyle(e).overflowY==='auto'&&e.scrollHeight>e.clientHeight+20);if(!e)throw Error('No scroll view');if(value!==null)e.scrollTop=value;return e.scrollTop;}''',value)
    home=page.get_by_test_id('tab-scene-home').element_handle();home_offset=scroll('home',210)
    tab('Settings');settings=page.get_by_test_id('tab-scene-you').element_handle();settings_offset=scroll('you',180)
    tab('Home');assert abs(scroll('home')-home_offset)<2
    assert home.evaluate('(e)=>e===document.querySelector(\'[data-testid="tab-scene-home"]\')')
    tab('Settings');assert abs(scroll('you')-settings_offset)<2
    assert settings.evaluate('(e)=>e===document.querySelector(\'[data-testid="tab-scene-you"]\')')
    page.get_by_role('button',name='Default player',exact=True).click();dialog=page.get_by_role('dialog');dialog.get_by_text('Choose where to watch.',exact=False).wait_for();page.wait_for_timeout(350)
    dialog.get_by_role('button',name='Go back',exact=True).click();page.wait_for_timeout(25)
    assert page.get_by_text('Choose where to watch.',exact=False).count()==1,'Dismissal cleared its contents too soon'
    page.get_by_role('dialog').wait_for(state='hidden');assert abs(scroll('you')-settings_offset)<2
    # A rapid sequence must settle on its final selection, without an empty transition frame.
    samples=page.evaluate('''async()=>{window.navLongTasks=[];const obs=new PerformanceObserver(list=>window.navLongTasks.push(...list.getEntries().map(e=>e.duration)));obs.observe({type:'longtask',buffered:false});const samples=[];for(let i=0;i<24;i++){const name=['Home','Library','Favorites','Settings'][i%4];document.querySelector('[role="tab"][aria-label="'+name+'"]').click();await new Promise(requestAnimationFrame);samples.push([...document.querySelectorAll('[data-testid^="tab-scene-"]')].reduce((sum,e)=>sum+Number(getComputedStyle(e).opacity),0));}await new Promise(r=>setTimeout(r,350));obs.disconnect();return samples;}''')
    assert min(samples)>.25,samples
    assert page.get_by_role('tab',name='Settings',exact=True).get_attribute('aria-selected')=='true'
    visible=page.get_by_test_id('tab-scene-you');assert float(visible.evaluate('(e)=>getComputedStyle(e).opacity'))>.99
    indicator=page.get_by_test_id('tab-indicator').bounding_box();icon=page.get_by_role('tab',name='Settings',exact=True).bounding_box()
    assert abs((indicator['x']+23)-(icon['x']+icon['width']/2))<2
    page.screenshot(path=str(out/'01-settings.png'))
    clip_start=time.monotonic()-started
    tab('Home');page.get_by_role('button',name='NodeCast home',exact=True).click();page.wait_for_timeout(280)
    tab('Library');tab('Favorites');tab('Settings')
    scroll('you',0);page.get_by_role('button',name='Default player',exact=True).click();page.wait_for_timeout(450)
    page.get_by_role('dialog').get_by_role('button',name='Go back',exact=True).click();page.wait_for_timeout(450);tab('Home');clip_end=time.monotonic()-started
    page.screenshot(path=str(out/'02-home.png'))
    long_tasks=page.evaluate('window.navLongTasks');video=page.video;context.close();video.save_as(str(out/'navigation-browser-preview.webm'))
    reduced=browser.new_context(viewport={'width':320,'height':568},reduced_motion='reduce')
    reduced.add_init_script("localStorage.setItem('nodecast.preferences.v2',JSON.stringify({onboarded:true,player:'internal',baseline:null,homeIPSetup:'skipped'}))")
    page=reduced.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.route('https://ipwho.is/',lambda r:r.abort());page.goto('http://127.0.0.1:8085');page.get_by_test_id('startup-splash').wait_for(state='detached',timeout=10000)
    page.get_by_role('tab',name='Settings',exact=True).click();page.wait_for_timeout(20)
    scene=page.get_by_test_id('tab-scene-you');assert float(scene.evaluate('(e)=>getComputedStyle(e).opacity'))==1
    assert scene.evaluate('(e)=>getComputedStyle(e).transform') in ['none','matrix(1, 0, 0, 1, 0, 0)']
    page.screenshot(path=str(out/'03-reduced-motion.png'))
    assert not errors,errors
    (out/'checks.json').write_text(json.dumps({'checks':['Synthetic 30,000-channel provider','Separate Library/Favorites queries','Home and Settings scroll and native subtree retention','Playback Back returns to the same Settings position','Closing content remains during dismissal','24 rapid tab changes settle correctly','No empty sampled transition frame','Moving indicator aligns with selected tab','Reduce Motion has no navigation displacement'],'homeScroll':home_offset,'settingsScroll':settings_offset,'maxObservedLongTaskMs':max(long_tasks,default=0),'minimumSampledOpacitySum':min(samples),'errors':errors,'scope':'Chromium UI/layout verification. This does not measure physical iPhone frame rate or UIKit dismissal.'},indent=2)+'\n')
    browser.close();subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(clip_start),'-i',str(out/'navigation-browser-preview.webm'),'-t',str(clip_end-clip_start),'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',str(out/'navigation-browser-preview.mp4')],check=True)
    (out/'navigation-browser-preview.webm').unlink();temporary.cleanup()
    print('Navigation, state retention, 30k-title fixture, rapid tapping, dismissal and Reduce Motion checks passed.')
