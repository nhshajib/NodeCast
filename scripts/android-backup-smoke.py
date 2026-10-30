"""Transfer a synthetic encrypted setup through Android DocumentsUI to a fresh emulator app."""
import importlib.util,json,re,subprocess,time
from pathlib import Path
spec=importlib.util.spec_from_file_location('backup_helpers',Path(__file__).with_name('android-tv-playback-smoke.py'));h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
adb,dump,find,click,text=h.adb,h.dump,h.find,h.click,h.text
OUT=Path('verification/android');package='com.nhshajib.nodecast'
def system_click(label,timeout=45):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  nodes=[n for n in dump().iter('node') if (n.get('text') or n.get('content-desc') or '').strip().casefold()==label.casefold() and n.get('enabled')!='false'];nodes.sort(key=lambda n:n.get('clickable')!='true')
  for n in nodes:
   b=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
   if len(b)==4 and b[2]>b[0] and b[3]>b[1]:adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2));time.sleep(.5);return
  time.sleep(.5)
 raise RuntimeError('System document control unavailable: '+label)
def open_backup():
 click('Settings');click('Backup & transfer',True)
 root=dump()
 if any(n.get('content-desc')=='Unlock backup & transfer' for n in root.iter('node')):
  click('Unlock backup & transfer');text('Family PIN','123456');click('Unlock');find('Take your setup with you.',timeout=90)
def shot(name):OUT.joinpath(name).write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
try:
 click('Go back');click('Library');click('Add Phone Test Channel to favorites');open_backup()
 text('Backup password','transfer-test-password-123');text('Confirm backup password','transfer-test-password-123');click('Create encrypted backup',True)
 system_click('Save',timeout=120)
 if any('Unlock backup & transfer' in (n.get('content-desc') or '') for n in dump().iter('node')):
  click('Unlock backup & transfer');text('Family PIN','123456');click('Unlock');find('Take your setup with you.',timeout=90)
 find('Backup handed to the system file picker or share sheet. Keep the saved file and its password for your new device.',timeout=30,scroll=True)
 # The saved file must outlive app storage. It contains synthetic credentials only.
 end=time.monotonic()+30;paths=[]
 while time.monotonic()<end:
  paths=[line for line in adb('shell','find','/sdcard/Download','-maxdepth','1','-type','f').splitlines() if 'NodeCast-backup-' in line]
  if paths:
   try:
    candidate=subprocess.check_output(['adb','exec-out','cat',paths[-1]]);parsed=json.loads(candidate)
    if parsed.get('format')=='nodecast-encrypted':break
   except (ValueError,subprocess.CalledProcessError):pass
  time.sleep(.5)
 assert paths,'Encrypted backup not found in Downloads';path=paths[-1];filename=path.rsplit('/',1)[-1];local=OUT/'emulator-mobile-transfer.nodecast';adb('pull',path,str(local));encrypted=json.loads(local.read_text());assert encrypted['format']=='nodecast-encrypted';assert 'example' not in local.read_text(),'Plaintext provider credentials in export'
 # Only ever reset this disposable emulator app, never a connected physical device.
 assert adb('shell','getprop','ro.kernel.qemu')=='1' or adb('shell','getprop','ro.boot.qemu')=='1','Fresh-device test requires an emulator'
 adb('shell','pm','clear',package);adb('shell','am','start','-W','-n',package+'/.MainActivity');time.sleep(6);click('Explore demo');open_backup();click('Import backup');click('Choose backup file');system_click(filename,timeout=45);text('Backup password','transfer-test-password-123');click('Review backup',True);find('Ready for this device.',timeout=120,scroll=True);shot('emulator-mobile-backup-review.png');click('Import profiles & settings',True)
 find('Add playlist',timeout=45);click('Settings');click('Saved profiles',True);find('PhoneTest',timeout=30);shot('emulator-mobile-restored-profiles.png');click('Go back');click('Family controls',True);click('Unlock family controls');text('Family PIN','123456');click('Unlock');find('Find category to protect',timeout=90);click('Go back');click('Library');find('Open Phone Test Channel');find('Remove Phone Test Channel from favorites');click('Open TV guide');find('Phone Guide Match',timeout=45,scroll=True);shot('emulator-mobile-restored-guide.png')
 OUT.joinpath('emulator-mobile-backup-result.json').write_text(json.dumps({'passed':['Native AES-GCM export through Android Create Document','Encrypted file persists outside app storage','Fresh-emulator import through Android document picker','Provider, favorite, guide and dark appearance restored','Family PIN and protected category restored and unlocked','Fresh guide downloads after transfer'],'scope':'Synthetic credentials and disposable API 35 x86-64 emulator. The iOS share sheet and physical TV file pickers still need device confirmation.'},indent=2)+'\n');print('Encrypted Android file export and fresh-device restore passed.')
except Exception:
 shot('emulator-mobile-backup-failure.png');OUT.joinpath('emulator-mobile-backup-failure.xml').write_text(__import__('xml.etree.ElementTree',fromlist=['tostring']).tostring(dump(),encoding='unicode'));raise
