import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Haptics only when something actually happens: a favorite toggled, a setting switched,
 * a seek committed, a playlist saved or a profile removed. Never for plain navigation taps.
 * Silent on web and TV, and when the native module is missing (an older development build).
 */
export type HapticKind = 'selection' | 'success' | 'warning' | 'impact';
const enabled = Platform.OS !== 'web' && !Platform.isTV && process.env.EXPO_PUBLIC_APP_VARIANT !== 'tv';

export function haptic(kind: HapticKind = 'selection'): void {
  if (!enabled) return;
  try {
    const result = kind === 'selection' ? Haptics.selectionAsync()
      : kind === 'impact' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    void Promise.resolve(result).catch(() => {});
  } catch { /* Haptics are optional feedback, never a failure. */ }
}
