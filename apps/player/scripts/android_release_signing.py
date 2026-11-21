"""Sign and verify Android releases against an owner-pinned private certificate.

Passwords enter apksigner/keytool through environment variables, never arguments.
The keystore is decoded only into a restricted temporary directory and removed.
"""
import base64
import hashlib
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

PUBLIC_TEST_CERT = 'fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c'


def fingerprint(value):
    value = value.replace(':', '').strip().lower()
    if not re.fullmatch(r'[a-f0-9]{64}', value) or value == PUBLIC_TEST_CERT:
        raise ValueError('A private release certificate SHA-256 is required; the public test key is forbidden')
    return value


def expected_certificate():
    return fingerprint(os.environ.get('GLOWTV_ANDROID_SIGNING_CERT_SHA256', ''))


def verify_report(report, expected):
    certificates = re.findall(r'^(?:Signer #[0-9]+|V[0-9]+(?:\.[0-9]+)? Signer):? certificate SHA-256 digest: ([a-fA-F0-9]{64})$', report, re.M)
    if not certificates or {fingerprint(c) for c in certificates} != {fingerprint(expected)}:
        raise ValueError('APK signing certificate does not match the owner-pinned release certificate; reported public certificate lines: ' + repr([line for line in report.splitlines() if 'certificate SHA-256 digest:' in line]))
    if re.search(r'certificate DN:.*CN=Android Debug', report, re.I):
        raise ValueError('Android debug signing is not allowed for stable releases')


def verify(tools, apk):
    report = subprocess.check_output([str(tools / 'apksigner'), 'verify', '--verbose', '--print-certs', str(apk)], text=True)
    verify_report(report, expected_certificate())
    print(f'Private release signature verified: {apk.name}')


def sign(tools, source, output):
    expected = expected_certificate()
    for name in ['GLOWTV_ANDROID_KEYSTORE_BASE64', 'GLOWTV_ANDROID_KEYSTORE_PASSWORD', 'GLOWTV_ANDROID_KEY_ALIAS', 'GLOWTV_ANDROID_KEY_PASSWORD']:
        if not os.environ.get(name):
            raise ValueError(f'Missing repository signing secret: {name}')
    with tempfile.TemporaryDirectory(prefix='glowtv-signing-') as directory:
        keystore = Path(directory) / 'release.p12'
        keystore.write_bytes(base64.b64decode(''.join(os.environ['GLOWTV_ANDROID_KEYSTORE_BASE64'].split()), validate=True))
        keystore.chmod(0o600)
        cert = subprocess.check_output(['keytool', '-exportcert', '-keystore', str(keystore), '-alias', os.environ['GLOWTV_ANDROID_KEY_ALIAS'], '-storepass:env', 'GLOWTV_ANDROID_KEYSTORE_PASSWORD'])
        if fingerprint(hashlib.sha256(cert).hexdigest()) != expected:
            raise ValueError('Keystore does not match the owner-pinned release certificate')
        subprocess.run([str(tools / 'apksigner'), 'sign', '--ks', str(keystore), '--ks-key-alias', os.environ['GLOWTV_ANDROID_KEY_ALIAS'], '--ks-pass', 'env:GLOWTV_ANDROID_KEYSTORE_PASSWORD', '--key-pass', 'env:GLOWTV_ANDROID_KEY_PASSWORD', '--out', str(output), str(source)], check=True)
        verify(tools, output)


if __name__ == '__main__':
    try:
        command, tools, *files = sys.argv[1:]
        if command == 'sign' and len(files) == 2:
            sign(Path(tools), *map(Path, files))
        elif command == 'verify' and len(files) == 1:
            verify(Path(tools), Path(files[0]))
        else:
            raise ValueError('Usage: android_release_signing.py sign BUILD_TOOLS INPUT OUTPUT | verify BUILD_TOOLS APK')
    except (ValueError, subprocess.CalledProcessError) as error:
        # Do not echo subprocess environments or any keystore/password contents.
        print(f'Release signing failed: {error}', file=sys.stderr)
        sys.exit(1)
