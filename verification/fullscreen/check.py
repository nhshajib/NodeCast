"""Run against the exported fixture.tsx, served on localhost:8082."""
from playwright.sync_api import sync_playwright
import json
from pathlib import Path
out=Path(__file__).parent
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':393,'height':852})
    errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:8082')
    stage=page.get_by_test_id('live-video-stage');stage.wait_for()
    original=stage.element_handle()
    # Reproduce a retained scroll offset before entering fullscreen.
    page.get_by_text('End of long settings').scroll_into_view_if_needed()
    page.get_by_test_id('enter').evaluate('(e)=>e.click()')
    samples=[]
    for width,height in [(1280,588),(844,390),(852,393),(393,852)]:
        page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(200)
        box=stage.bounding_box();assert box=={'x':0,'y':0,'width':width,'height':height},box
        for corner in ['top-left','top-right','bottom-left','bottom-right']:
            rect=page.get_by_test_id(corner).bounding_box()
            assert rect['x']>=0 and rect['y']>=0 and rect['x']+rect['width']<=width+1 and rect['y']+rect['height']<=height+1,rect
        assert original.evaluate('(e)=>e===document.querySelector(\'[data-testid="live-video-stage"]\')')
        samples.append({'width':width,'height':height,'stage':box,'allCornersVisible':True})
        if width==1280:page.screenshot(path=str(out/'landscape-geometry.png'))
    for _ in range(5):
        page.get_by_test_id('exit').click();page.get_by_test_id('enter').click()
    assert page.evaluate('window.surfaceMounts')==1
    assert not errors,errors
    (out/'checks.json').write_text(json.dumps({'sizes':samples,'repeatedFullscreenCycles':5,'surfaceMounts':1,'errors':errors,'scope':'Production layout with a test-card surface. Confirms geometry and stable mounting, not physical iOS VLC rendering.'},indent=2)+'\n')
    browser.close()
    print('Fullscreen viewport, all picture corners, retained scrolling and stable surface checks passed.')
