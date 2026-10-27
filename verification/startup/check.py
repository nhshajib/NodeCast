"""Browser checks of the actual App launch; native handoff needs the standalone IPA."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=Path(__file__).parent
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':393,'height':852},record_video_dir=str(out/'video'),record_video_size={'width':393,'height':852})
    page=context.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('https://ipwho.is/',lambda r:r.abort())
    page.goto('http://127.0.0.1:8084')
    intro=page.get_by_test_id('startup-splash');intro.wait_for()
    before=page.get_by_test_id('startup-mark').bounding_box()
    page.screenshot(path=str(out/'01-handoff.png'))
    page.wait_for_timeout(650);after=page.get_by_test_id('startup-mark').bounding_box();assert after['y'] < before['y']-10,(before,after)
    page.screenshot(path=str(out/'02-reveal.png'))
    intro.wait_for(state='detached',timeout=6000)
    page.get_by_role('button',name='Get started',exact=True).wait_for()
    page.screenshot(path=str(out/'03-ready.png'))
    video=page.video; context.close(); video.save_as(str(out/'launch-browser-preview.webm'))
    # Returning profiles may trigger setup only after the animated overlay is gone.
    returning=browser.new_context(viewport={'width':393,'height':852})
    returning.add_init_script("localStorage.setItem('nodecast.preferences.v2',JSON.stringify({onboarded:true,player:'internal',baseline:null}))")
    page=returning.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.route('https://ipwho.is/',lambda r:r.abort())
    page.goto('http://127.0.0.1:8084');page.get_by_test_id('startup-splash').wait_for()
    assert page.get_by_text('Know when you’re home.',exact=True).count()==0
    page.get_by_test_id('startup-splash').wait_for(state='detached',timeout=6000)
    page.get_by_text('Know when you’re home.',exact=True).wait_for()
    returning.close()
    reduced=browser.new_context(viewport={'width':320,'height':568},reduced_motion='reduce')
    page=reduced.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:8084');page.get_by_test_id('startup-splash').wait_for()
    page.wait_for_timeout(60);one=page.get_by_text('NodeCast',exact=True).bounding_box()
    page.wait_for_timeout(60);two=page.get_by_text('NodeCast',exact=True).bounding_box()
    assert one==two,(one,two)
    page.screenshot(path=str(out/'04-reduce-motion.png'))
    page.get_by_test_id('startup-splash').wait_for(state='detached',timeout=6000)
    page.get_by_role('button',name='Get started',exact=True).wait_for()
    assert not errors,errors
    (out/'checks.json').write_text(json.dumps({'checks':['Actual App animated intro appears and dismisses','Logo movement and wordmark reveal verified','Launch completes with IP service unavailable','Welcome appears after launch','Returning-user setup waits for intro','Reduce Motion has stationary text','Compact 320x568 launch completes'],'errors':errors,'scope':'Browser App startup with native splash unavailable. Physical iPhone launch-screen handoff requires the IPA.'},indent=2)+'\n')
    browser.close()
    print('Actual startup, unavailable network, setup ordering and Reduce Motion checks passed.')
