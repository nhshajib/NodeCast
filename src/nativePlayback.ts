import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
export function hasCompatibilityPlayer(): boolean {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  // Do not import expo-libvlc-player here: its entry point requires the native module.
  try { return !!requireOptionalNativeModule('ExpoLibVlcPlayer'); } catch { return false; }
}
