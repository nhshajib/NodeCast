import unittest
import base64
import hashlib
import os
from pathlib import Path
from unittest.mock import patch
from android_release_signing import sign
from android_release_signing import PUBLIC_TEST_CERT, fingerprint, verify_report


class SigningTests(unittest.TestCase):
    def test_pinned_certificate_accepts_keytool_format(self):
        self.assertEqual(fingerprint(':'.join(['AB'] * 32)), 'ab' * 32)

    def test_rejects_unknown_or_public_test_certificate(self):
        for value in ['', 'bad', PUBLIC_TEST_CERT, ':'.join(PUBLIC_TEST_CERT[i:i+2] for i in range(0, 64, 2))]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                fingerprint(value)

    def test_requires_exact_actual_signer(self):
        verify_report('Signer #1: certificate SHA-256 digest: ' + 'ab' * 32, 'ab' * 32)
        for report in ['', 'Signer #1: certificate SHA-256 digest: ' + 'cd' * 32, 'Signer #1: certificate SHA-256 digest: ' + PUBLIC_TEST_CERT, 'Signer #1: certificate SHA-256 digest: ' + 'ab' * 32 + '\nSigner #2: certificate SHA-256 digest: ' + 'cd' * 32]:
            with self.subTest(report=report), self.assertRaises(ValueError):
                verify_report(report, 'ab' * 32)

    def test_rejects_debug_certificate(self):
        with self.assertRaises(ValueError):
            verify_report('Signer #1: certificate SHA-256 digest: ' + 'ab' * 32 + '\nSigner #1: certificate DN: CN=Android Debug, O=Android', 'ab' * 32)

    def test_signing_uses_environment_passwords_and_removes_temporary_key(self):
        cert = b'public certificate test fixture'
        expected = hashlib.sha256(cert).hexdigest()
        environment = {'GLOWTV_ANDROID_SIGNING_CERT_SHA256': expected,
            'GLOWTV_ANDROID_KEYSTORE_BASE64': base64.b64encode(b'fake keystore fixture').decode() + '\r\n',
            'GLOWTV_ANDROID_KEYSTORE_PASSWORD': 'fixture-store-password',
            'GLOWTV_ANDROID_KEY_PASSWORD': 'fixture-key-password',
            'GLOWTV_ANDROID_KEY_ALIAS': 'glowtv-release'}
        commands = []
        key_paths = []
        def check_output(command, **kwargs):
            commands.append(command)
            if command[0] == 'keytool':
                key = Path(command[command.index('-keystore') + 1])
                key_paths.append(key)
                self.assertTrue(key.exists())
                self.assertEqual(key.stat().st_mode & 0o777, 0o600)
                return cert
            return 'Signer #1: certificate SHA-256 digest: ' + expected
        with patch.dict(os.environ, environment, clear=True), patch('android_release_signing.subprocess.check_output', side_effect=check_output), patch('android_release_signing.subprocess.run') as run:
            sign(Path('/fake/build-tools'), Path('/fake/input.apk'), Path('/fake/output.apk'))
            commands.append(run.call_args.args[0])
        self.assertTrue(key_paths)
        self.assertTrue(all(not key.exists() for key in key_paths))
        self.assertNotIn('fixture-store-password', repr(commands))
        self.assertNotIn('fixture-key-password', repr(commands))


if __name__ == '__main__':
    unittest.main()
