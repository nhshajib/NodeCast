"""Regression tests for emulator input, with no emulator or device required."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

HERE = Path(__file__).parent

def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, HERE / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result

remote = module('remote', 'tv-remote-driver.py')
with patch('subprocess.check_output', return_value='Physical size: 1080x1920'):
    helpers = module('helpers', 'android-tv-playback-smoke.py')

class InputDriverTests(unittest.TestCase):
    def test_fixed_back_header_waits_for_native_body_scroll(self):
        state = {'ups': 0}
        def tree():
            focused = state['ups'] >= 4
            return ET.fromstring(f'''<hierarchy>
              <node content-desc="Back" bounds="[272,86][509,204]" enabled="true" clickable="true" focusable="true" focused="{str(focused).lower()}"/>
              <node content-desc="Home Wi-Fi and VPN disconnected" bounds="[1483,335][1685,435]" enabled="true" clickable="true" focusable="true" focused="{str(not focused).lower()}"/>
            </hierarchy>''')
        def key(code):
            self.assertEqual(code, 19, 'Reach the fixed header with Up, not a rail detour')
            state['ups'] += 1
        with patch.object(remote, 'tree', tree), patch.object(remote, 'key', key):
            self.assertEqual(remote.name(remote.focus('Back', timeout=1)), 'Back')
        self.assertEqual(state['ups'], 4)

    def test_ime_back_is_sent_once(self):
        with patch.object(remote, 'adb', side_effect=['mInputShown=true', 'mInputShown=false']), patch.object(remote, 'key') as key:
            remote.dismiss_keyboard()
            key.assert_called_once_with(4)

    def test_hidden_ime_does_not_pop_form(self):
        with patch.object(remote, 'adb', return_value='mInputShown=false'), patch.object(remote, 'key') as key:
            remote.dismiss_keyboard()
            key.assert_not_called()

    def test_remote_explicit_submit_path_never_sends_go(self):
        with patch.object(remote, 'activate'), patch.object(remote, 'adb'), patch.object(remote, 'key') as key, patch.object(remote, 'dismiss_keyboard') as dismiss, patch.object(remote.time, 'sleep'):
            remote.fill('Password', 'synthetic', submit=False)
            key.assert_not_called()
            dismiss.assert_called_once()

    def test_remote_go_path_remains_available(self):
        with patch.object(remote, 'activate'), patch.object(remote, 'adb'), patch.object(remote, 'key') as key, patch.object(remote.time, 'sleep'):
            remote.fill('Password', 'synthetic')
            key.assert_called_once_with(66)

    def test_phone_explicit_submit_path_dismisses_ime_without_go(self):
        commands = []
        def adb(*args):
            commands.append(args)
            if args == ('shell', 'dumpsys', 'input_method'):
                return 'mInputShown=false' if ('shell', 'input', 'keyevent', '4') in commands else 'mInputShown=true'
            return ''
        with patch.object(helpers, 'REMOTE', False), patch.object(helpers, 'click'), patch.object(helpers, 'adb', adb), patch.object(helpers.time, 'sleep'):
            helpers.text('Password', 'synthetic', submit=False)
        self.assertNotIn(('shell', 'input', 'keyevent', '66'), commands)
        self.assertEqual(commands.count(('shell', 'input', 'keyevent', '4')), 1)

    def test_tv_touch_input_still_forbidden(self):
        for action in ['tap', 'swipe']:
            with self.assertRaisesRegex(RuntimeError, 'forbidden'):
                remote.adb('shell', 'input', action, '1', '1')

if __name__ == '__main__':
    unittest.main()
