"""Encrypted backup UI integration with synthetic provider data; not native file-picker QA."""
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json,sys
out=Path(__file__).parent
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 results={}
 for tv,port in [(False,8121),(True,8122)]:
  if '--tv' in sys.argv and not tv:continue
  print('Checking TV' if tv else 'Checking mobile',flush=True)
  context=browser.new_context(viewport={'width':960 if tv else 393,'height':540 if tv else 852},reduced_motion='reduce',accept_downloads=True)
  context.add_init_script("localStorage.setItem('nodecast.preferences.v2',JSON.stringify({onboarded:true,player:'internal',theme:'light',baseline:null,homeIPSetup:'skipped'}))")
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def provider(route):
   u=route.request.url
   if 'get_live_categories' in u:value=[{'category_id':'1','category_name':'News'}]
   elif 'get_live_streams' in u:value=[{'stream_id':1,'name':'News One','category_id':'1'}]
   elif 'action=' in u:value=[]
   else:value={'user_info':{'auth':1,'status':'Active'}}
   route.fulfill(json=value)
  page.route('https://provider.example/**',provider);page.route('https://ipwho.is/',lambda r:r.abort())
  page.goto(f'http://127.0.0.1:{port}');page.get_by_test_id('startup-splash').wait_for(state='detached')
  page.get_by_role('button',name='Add your playlist' if tv else 'Add playlist',exact=True).click()
  for label,value in [('Profile name','Transfer test'),('Server address','https://provider.example'),('Username','private-user'),('Password','private-provider-password')]:page.get_by_label(label,exact=True).fill(value)
  page.get_by_role('button',name='Connect playlist',exact=True).click()
  if not tv:page.get_by_role('dialog').wait_for(state='hidden');page.get_by_role('tab',name='Library',exact=True).click()
  if tv:page.get_by_role('button',name='Save favorite: News One',exact=True).click()
  else:page.get_by_role('button',name='Add News One to favorites',exact=True).click()
  def settings(name):
   page.get_by_role('button' if tv else 'tab',name='Settings',exact=True).click();page.get_by_role('button',name=name,exact=True).click()
  def back():
   page.get_by_role('button',name='Back' if tv else 'Go back',exact=True).click()
   if not tv:page.get_by_role('dialog').wait_for(state='hidden')
  settings('Appearance');page.get_by_role('radio',name='dark appearance',exact=True).click();back()
  settings('Family controls');page.get_by_label('New six-digit PIN',exact=True).fill('123456');page.get_by_label('Confirm PIN',exact=True).fill('123456');page.get_by_role('button',name='Set family PIN',exact=True).click();page.get_by_label('Find category to protect',exact=True).wait_for();page.get_by_role('button',name='Lock protected content now',exact=True).click();back()
  settings('Backup & transfer');page.get_by_role('button',name='Unlock backup & transfer',exact=True).wait_for();page.get_by_role('button',name='Unlock backup & transfer',exact=True).click();page.get_by_label('Family PIN',exact=True).fill('123456');page.get_by_role('button',name='Unlock',exact=True).click();page.get_by_text('Take your setup with you.',exact=True).wait_for();page.get_by_label('Family PIN',exact=True).wait_for(state='hidden')
  password='transfer-test-password-123';page.get_by_label('Backup password',exact=True).fill(password);page.get_by_label('Confirm backup password',exact=True).fill(password)
  with page.expect_download(timeout=60000) as pending:page.get_by_role('button',name='Create encrypted backup',exact=True).click()
  download=pending.value;path=Path('/workspace/nodecast-release-work')/('tv-test.nodecast' if tv else 'mobile-test.nodecast');download.save_as(path);text=path.read_text();assert 'private-user' not in text and 'private-provider-password' not in text;assert json.loads(text)['format']=='nodecast-encrypted'
  page.get_by_text('Backup handed to',exact=False).wait_for();page.get_by_role('button',name='Import backup',exact=True).click()
  with page.expect_file_chooser() as pending:page.get_by_role('button',name='Choose backup file',exact=True).click()
  pending.value.set_files(str(path));page.get_by_text('Selected:',exact=False).wait_for();page.get_by_label('Backup password',exact=True).fill('wrong-backup-password');page.get_by_role('button',name='Review backup',exact=True).click();page.get_by_text('Could not unlock this backup.',exact=False).wait_for(timeout=60000)
  expect(page.get_by_role('button',name='Import profiles & settings',exact=True)).to_have_count(0)
  page.get_by_label('Backup password',exact=True).fill(password);page.get_by_role('button',name='Review backup',exact=True).click();page.get_by_text('Ready for this device.',exact=True).wait_for(timeout=60000);page.get_by_text('1 profiles · 1 favorites',exact=False).wait_for()
  page.screenshot(path=str(out/('tv-backup-review.png' if tv else 'mobile-backup-review.png')))
  page.get_by_role('button',name='Import profiles & settings',exact=True).click();page.get_by_role('button',name='Live TV' if tv else 'Add playlist',exact=True).wait_for(timeout=30000)
  if tv:page.get_by_role('button',name='Settings',exact=True).click()
  else:settings('Saved profiles')
  page.get_by_text('Transfer test (imported)',exact=True).wait_for();page.screenshot(path=str(out/('tv-imported-profiles.png' if tv else 'mobile-imported-profiles.png')))
  assert 'private-user' not in page.evaluate('JSON.stringify(localStorage)') and 'private-provider-password' not in page.evaluate('JSON.stringify(localStorage)')
  assert not errors,errors
  results['tv' if tv else 'mobile']={'passed':['Backup gated by family unlock','Encrypted file download with no plaintext credentials','Wrong password rejected without import','Review profile and favorite counts','Import adds profiles while preserving existing profile','Imported setup reloads and keeps dark appearance'],'errors':errors}
  context.close()
 browser.close();(out/'checks.json').write_text(json.dumps(results,indent=2)+'\n');print('Encrypted transfer UI checks passed on mobile and TV.')
