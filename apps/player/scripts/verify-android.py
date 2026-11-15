"""Check the actual APK, not just source config, before publishing a download."""
import sys, zipfile
from pathlib import Path
apk, target, manifest = sys.argv[1:]
info = Path(manifest).read_text()
package = 'com.nhshajib.nodecast' + ('.tv' if target == 'tv' else '')
assert f"package: name='{package}'" in info, info
assert "application-debuggable" not in info, 'Release APK must not be debuggable'
with zipfile.ZipFile(apk) as archive:
    names = archive.namelist()
    assert archive.testzip() is None
    assert any(n.endswith('index.android.bundle') for n in names), 'Missing offline JavaScript'
    for arch in ['arm64-v8a', 'armeabi-v7a', 'x86_64']:
        assert any(n.startswith(f'lib/{arch}/') and 'vlc' in n.lower() for n in names), f'Missing VLC {arch}'
if target == 'tv':
    assert 'leanback-launchable-activity:' in info, 'Missing TV launcher'
    assert "uses-feature: name='android.hardware.touchscreen'" not in info, 'TV cannot require touch'
else:
    assert 'launchable-activity:' in info
print(f'Validated standalone {target} release: {package}, JS bundle, VLC, ARM32/64 and x86_64.')
