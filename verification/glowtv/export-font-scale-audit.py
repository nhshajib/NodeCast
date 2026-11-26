"""Export browser-only font-scale fixtures; restore installed RN Web afterwards.

RN Web fixes fontScale at 1. This audit-only instrumentation exercises the
app's existing useWindowDimensions/TYPOGRAPHY path without shipping a test hook.
Native Dynamic Type and screen readers still require their native checks.
"""
from pathlib import Path
import os, subprocess

app = Path(__file__).resolve().parents[2] / 'apps/player'
dimensions = app / 'node_modules/react-native-web/dist/exports/Dimensions/index.js'
original = dimensions.read_text()
assert original.count('fontScale: 1,') == 4
try:
    dimensions.write_text(original.replace('fontScale: 1,', 'fontScale: Number(globalThis.__GLOWTV_AUDIT_FONT_SCALE__ || 1),'))
    for edition in ['ios', 'android']:
        env = dict(os.environ, EXPO_NO_TELEMETRY='1', EXPO_HOME='/tmp/glowtv-audit-expo-' + edition)
        if edition == 'android':
            env['EXPO_PUBLIC_DESIGN_PLATFORM'] = 'android'
        else:
            env.pop('EXPO_PUBLIC_DESIGN_PLATFORM', None)
        env.pop('EXPO_PUBLIC_APP_VARIANT', None)
        subprocess.run(['npx', 'expo', 'export', '--platform', 'web', '--output-dir', '/tmp/glowtv-font-audit-' + edition], cwd=app, env=env, check=True)
finally:
    dimensions.write_text(original)
