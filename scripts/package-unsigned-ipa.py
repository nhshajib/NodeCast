#!/usr/bin/env python3
"""Package a real unsigned iPhone Release .app for personal re-signing, not App Store upload."""
import hashlib
import json
import plistlib
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path


def validate_app(app: Path) -> tuple[dict, Path]:
    if app.suffix != '.app' or not app.is_dir():
        raise ValueError('Expected a compiled .app directory, not source or an archive for Simulator.')
    with (app / 'Info.plist').open('rb') as stream:
        info = plistlib.load(stream)
    if info.get('DTPlatformName') != 'iphoneos' or 'iPhoneOS' not in info.get('CFBundleSupportedPlatforms', []):
        raise ValueError('This is not a physical-iPhone build. Simulator apps cannot be sideloaded.')
    executable = app / info['CFBundleExecutable']
    if not executable.is_file() or executable.parent != app:
        raise ValueError('Compiled executable is missing or invalid.')
    if not (app / 'main.jsbundle').is_file() or (app / 'main.jsbundle').stat().st_size == 0:
        raise ValueError('Embedded JavaScript bundle is missing. A Metro-dependent app is not a standalone Release.')
    return info, executable


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit('Usage: package-unsigned-ipa.py /path/NodeCast.app /output/directory')
    app = Path(sys.argv[1]).resolve()
    out = Path(sys.argv[2]).resolve()
    info, executable = validate_app(app)
    architectures = subprocess.check_output(['xcrun', 'lipo', '-archs', str(executable)], text=True).split()
    if 'arm64' not in architectures or any(value.startswith('x86') for value in architectures):
        raise ValueError(f'Expected an arm64 device binary, received {architectures!r}.')
    # Ensure the native compatibility module was actually linked, not only installed in node_modules.
    if b'ExpoLibVlcPlayer' not in executable.read_bytes():
        raise ValueError('Embedded VLC native module is absent from the compiled executable.')
    version = str(info.get('CFBundleShortVersionString', 'unknown'))
    if not re.fullmatch(r'[A-Za-z0-9._-]+', version):
        raise ValueError('Invalid version for an artifact filename.')
    out.mkdir(parents=True, exist_ok=True)
    ipa = out / f'NodeCast-{version}-unsigned.ipa'
    with tempfile.TemporaryDirectory(prefix='nodecast-payload-') as temporary:
        payload = Path(temporary) / 'Payload'
        payload.mkdir()
        shutil.copytree(app, payload / app.name, symlinks=True)
        subprocess.run(['/usr/bin/ditto', '-c', '-k', '--keepParent', str(payload), str(ipa)], check=True)
    with zipfile.ZipFile(ipa) as archive:
        if archive.testzip() is not None or f'Payload/{app.name}/main.jsbundle' not in archive.namelist():
            raise ValueError('IPA integrity/standalone-bundle verification failed.')
    digest = hashlib.sha256(ipa.read_bytes()).hexdigest()
    (out / 'SHA256SUMS.txt').write_text(f'{digest}  {ipa.name}\n')
    (out / 'INSTALL.txt').write_text(
        'NodeCast — unsigned standalone iPhone IPA\n\n'
        'This file must be signed by Sideloadly with your own Apple account before installation.\n'
        'It is not a signed App Store/TestFlight release and cannot install by tapping it.\n'
        'Do not try to install the surrounding GitHub artifact ZIP; extract this .ipa first.\n'
        'With free signing, refresh before the seven-day signing expires.\n'
        'Your PC/Metro server is not needed while watching after installation.\n'
        'Register/trust the developer on iPhone and enable Developer Mode if prompted.\n'
        'Enter provider details in NodeCast; no IPTV account is bundled.\n'
    )
    print(json.dumps({'ipa': str(ipa), 'version': version, 'bundleIdentifier': info.get('CFBundleIdentifier'),
                      'architectures': architectures, 'sha256': digest, 'bytes': ipa.stat().st_size}))


if __name__ == '__main__':
    main()
