import { Dimensions, Platform } from 'react-native';
import * as Orientation from 'expo-screen-orientation';
import { isTVBuild } from './FocusPressable';
import { orientationPolicy } from './orientationPolicy';
export function restoreOrientation() {
  if (Platform.OS === 'web') return Promise.resolve();
  const mode = orientationPolicy({ ...Dimensions.get('screen'), tablet: Platform.OS === 'ios' && Platform.isPad, television: isTVBuild });
  return mode === 'unlocked' ? Orientation.unlockAsync() : Orientation.lockAsync(mode === 'landscape' ? Orientation.OrientationLock.LANDSCAPE : Orientation.OrientationLock.PORTRAIT_UP);
}
