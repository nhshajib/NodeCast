import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
/** Android uses the live region; VoiceOver needs an explicit announcement. */
export function useAnnouncement(text: string, enabled = true) {
  useEffect(() => { if (enabled && text && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(text); }, [text, enabled]);
}

export function Announcement({text}:{text:string}){useAnnouncement(text);return null;}
