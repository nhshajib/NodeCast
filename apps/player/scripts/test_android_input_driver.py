"""Regression tests for emulator input, with no emulator or device required."""
import importlib.util
import io
from types import SimpleNamespace
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
    def test_scan_keeps_direction_past_two_controls_to_offscreen_rows(self):
        # Settings scrolled to the bottom: tiles above are offscreen (inverted bounds).
        order=['Home IP reference','Version history','Add playlist','Buy me a coffee']
        state={'at':3}
        def tree():
            nodes=[]
            for index,label in enumerate(order):
                visible=index>=state['at']-1 or index>=2
                bounds=f'[272,{200+index*200}][1744,{300+index*200}]' if visible else f'[272,210][1744,{100-index*50}]'
                nodes.append(f'<node content-desc="{label}" bounds="{bounds}" enabled="true" clickable="true" focusable="true" focused="{str(index==state["at"]).lower()}"/>')
            return ET.fromstring('<hierarchy>'+''.join(nodes)+'</hierarchy>')
        def key(code):
            if code==19:state['at']=max(0,state['at']-1)
            elif code==20:state['at']=min(len(order)-1,state['at']+1)
        with patch.object(remote,'tree',tree),patch.object(remote,'key',key):
            self.assertEqual(remote.name(remote.focus('Home IP reference',timeout=5)),'Home IP reference')

    def test_reveal_pages_until_offscreen_message_is_on_screen(self):
        state={'downs':0}
        def tree():
            on=state['downs']>=3
            box='[336,700][1680,800]' if on else '[336,1236][1680,1026]'
            rows=''.join(f'<node content-desc="Option {i}" bounds="[336,{300+i*100}][1680,{380+i*100}]" enabled="true" clickable="true" focusable="true" focused="{str(i==state["downs"]).lower()}"/>' for i in range(4))
            return ET.fromstring(f'<hierarchy>{rows}<node text="Saved. Applies next time you open this channel." bounds="{box}"/></hierarchy>')
        def key(code):
            self.assertEqual(code,20)
            state['downs']+=1
        with patch.object(remote,'tree',tree),patch.object(remote,'key',key):
            remote.reveal('Saved. Applies next time you open this channel.',timeout=5)
        self.assertEqual(state['downs'],3)

    def test_rail_targets_move_by_rail_order_not_through_the_page(self):
        rail=['Home','Search','Live TV','TV guide','Movies','Series','Favorites','Settings']
        state={'at':'page','index':0,'keys':[]}
        def tree():
            nodes=[f'<node content-desc="{label}" bounds="[103,{164+i*104}][240,{256+i*104}]" enabled="true" clickable="true" focusable="true" focused="{str(state["at"]=="rail" and state["index"]==i).lower()}"/>' for i,label in enumerate(rail)]
            nodes.append(f'<node content-desc="TV guide" bounds="[673,294][938,418]" enabled="true" clickable="true" focusable="true" focused="false"/>')
            nodes.append(f'<node content-desc="Watch live" bounds="[312,294][655,414]" enabled="true" clickable="true" focusable="true" focused="{str(state["at"]=="page").lower()}"/>')
            return ET.fromstring('<hierarchy>'+''.join(nodes)+'</hierarchy>')
        def key(code):
            state['keys'].append(code)
            if state['at']=='page':
                self.assertEqual(code,21,'Enter the rail with Left only');state['at']='rail';state['index']=0
            elif code==20:state['index']=min(len(rail)-1,state['index']+1)
            elif code==19:state['index']=max(0,state['index']-1)
            else:self.fail('Left/Right inside the rail are not part of the route')
        with patch.object(remote,'tree',tree),patch.object(remote,'key',key):
            self.assertEqual(remote.name(remote.focus('Settings',timeout=5)),'Settings')
            self.assertEqual(remote.bounds(remote.focus('TV guide',timeout=5))[0],103)

    def test_clipped_horizontal_nodes_keep_signed_bounds(self):
        node=ET.fromstring('<node bounds="[272,314][-500,402]" enabled="true" clickable="true" focusable="true"/>')
        self.assertEqual(remote.bounds(node),[272,314,-500,402])
        self.assertEqual(remote.actions(node),[])

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

    def test_stale_ime_flag_is_not_polled_after_back(self):
        with patch.object(remote, 'adb', return_value='mInputShown=true') as adb, patch.object(remote, 'key') as key:
            remote.dismiss_keyboard()
            key.assert_called_once_with(4)
            adb.assert_called_once()

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

    def test_phone_connect_uses_foreground_sheet_and_not_covered_tabs(self):
        tree = ET.fromstring('''<hierarchy>
          <node content-desc="Connect playlist" clickable="true" bounds="[0,100][900,200]"/>
          <node content-desc="Home" clickable="true" bounds="[0,1700][200,1800]"/>
          <node content-desc="Profile name" class="android.widget.EditText" bounds="[0,400][900,500]"/>
          <node content-desc="Connect playlist" clickable="true" bounds="[0,1720][900,1840]"/>
        </hierarchy>''')
        with patch.object(helpers, 'REMOTE', False), patch.object(helpers, 'dump', return_value=tree):
            self.assertEqual(helpers.find('Connect playlist'), [0,1720,900,1840])

    def test_select_rechecks_focus_after_transition_without_pressing_wrong_control(self):
        home = ET.fromstring('<node content-desc="Home" focused="true"/>')
        player = ET.fromstring('<node content-desc="Watch live" focused="true"/>')
        with patch.object(remote, 'focus', return_value=home) as focus, patch.object(remote, 'tree', side_effect=[player,home]), patch.object(remote, 'key') as key, patch.object(remote.time, 'sleep'):
            remote.activate('Home', timeout=1)
            self.assertEqual(focus.call_count, 2)
            key.assert_called_once_with(23)

    def reader(self, output):
        reader = remote.NativeHierarchy.__new__(remote.NativeHierarchy)
        reader.process = SimpleNamespace(stdin=io.StringIO(), stdout=io.StringIO(output), poll=lambda: 0)
        return reader

    def test_native_reader_parses_actual_xml_after_shell_preamble(self):
        reader = self.reader('shell preamble\n<?xml version="1.0"?><hierarchy><node content-desc="Player options" focused="true"/></hierarchy>\n')
        with patch.object(remote.select, 'select', return_value=([reader.process.stdout],[],[])):
            self.assertEqual(remote.name(remote.focused(reader.dump())), 'Player options')
        self.assertEqual(reader.process.stdin.getvalue(), 'dump\n')

    def test_native_reader_eof_is_a_failure_not_a_cached_hierarchy(self):
        reader = self.reader('')
        with patch.object(remote.select, 'select', return_value=([reader.process.stdout],[],[])):
            with self.assertRaisesRegex(RuntimeError, 'reader exited'):
                reader.dump()

    def test_native_reader_timeout_is_a_failure(self):
        reader = self.reader('')
        with patch.object(remote.select, 'select', return_value=([],[],[])):
            with self.assertRaisesRegex(RuntimeError, 'did not respond'):
                reader.dump()

    def test_stale_reveal_snapshot_never_selects_the_new_menu_back_button(self):
        old = ET.fromstring('<hierarchy><node content-desc="Show player controls" focused="true"/></hierarchy>')
        menu = ET.fromstring('<hierarchy><node content-desc="Back to video" focused="true"/></hierarchy>')
        with patch.object(remote, 'tree', return_value=menu), patch.object(remote, 'key') as key, patch.object(remote.time, 'sleep'):
            self.assertTrue(remote.wake_controls(old))
            key.assert_not_called()

    def test_still_focused_reveal_control_gets_exactly_one_select(self):
        root = ET.fromstring('<hierarchy><node content-desc="Show player controls" focused="true"/></hierarchy>')
        with patch.object(remote, 'tree', return_value=root), patch.object(remote, 'key') as key, patch.object(remote.time, 'sleep'):
            self.assertTrue(remote.wake_controls(root))
            key.assert_called_once_with(23)

    def test_demo_entry_uses_welcome_action_over_covered_home_and_tab_bar(self):
        root = ET.fromstring('''<hierarchy>
          <node content-desc="Explore demo" clickable="true" bounds="[63,828][1017,975]"/>
          <node content-desc="Settings" clickable="true" bounds="[864,1646][1080,1857]"/>
          <node content-desc="Get started" clickable="true" bounds="[63,1363][1017,1510]"/>
          <node content-desc="Explore demo" clickable="true" bounds="[63,1552][1017,1699]"/>
        </hierarchy>''')
        with patch.object(helpers, 'REMOTE', False), patch.object(helpers, 'dump', return_value=root):
            self.assertEqual(helpers.find('Explore demo'), [63,1552,1017,1699])

    def test_down_from_toolbar_prefers_aligned_wide_row_over_nearer_sidebar(self):
        root = ET.fromstring('''<hierarchy>
          <node content-desc="Recently watched" bounds="[263,426][651,518]"/>
          <node content-desc="Favorites" bounds="[120,702][216,814]"/>
          <node content-desc="Play Example Live Test" bounds="[290,550][1518,706]"/>
        </hierarchy>''')
        self.assertEqual(remote.route(list(root), 0, 2), [20])

if __name__ == '__main__':
    unittest.main()
