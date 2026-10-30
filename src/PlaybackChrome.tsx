import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, DeviceEventEmitter } from 'react-native';

type Chrome = { visible: boolean; show: () => void; toggle: () => void; activity: () => void; hold: (key: string, active: boolean) => void };
const Context = createContext<Chrome | null>(null);
export function usePlaybackChrome() { const value = useContext(Context); if (!value) throw new Error('Playback chrome requires its provider'); return value; }
export function PlaybackChromeProvider({ children, panelOpen, onIdle, playing, minimized }: { children: React.ReactNode; panelOpen: boolean; onIdle: () => void; playing: boolean; minimized: boolean }) {
  const [visible, setVisible] = useState(true);
  const [screenReader, setScreenReader] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holds = useRef(new Set<string>());
  const latest = useRef({ panelOpen, onIdle, playing, minimized, screenReader });
  latest.current = { panelOpen, onIdle, playing, minimized, screenReader };
  const clear = useCallback(() => { if (timer.current) clearTimeout(timer.current); timer.current = null; }, []);
  const activity = useCallback(() => {
    clear();
    const state = latest.current;
    if (!state.playing || state.minimized || state.screenReader || holds.current.size) return;
    timer.current = setTimeout(() => {
      if (holds.current.size) return;
      latest.current.onIdle(); setVisible(false);
    }, state.panelOpen ? 8000 : 4000);
  }, [clear]);
  const show = useCallback(() => { setVisible(true); activity(); }, [activity]);
  const toggle = useCallback(() => { setVisible(value => !value); activity(); }, [activity]);
  const hold = useCallback((key: string, active: boolean) => { if (active) holds.current.add(key); else holds.current.delete(key); activity(); }, [activity]);
  useEffect(() => { let alive = true; void AccessibilityInfo.isScreenReaderEnabled().then(value => { if (alive) setScreenReader(value); }); const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader); return () => { alive = false; sub.remove(); }; }, []);
  useEffect(() => { if (!playing || screenReader) setVisible(true); activity(); return clear; }, [playing, minimized, panelOpen, screenReader, activity, clear]);
  useEffect(() => { const sub = DeviceEventEmitter.addListener('NodeCastPlaybackActivity', show); return () => sub.remove(); }, [show]);
  const value = React.useMemo(() => ({ visible, show, toggle, activity, hold }), [visible, show, toggle, activity, hold]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePlaybackMedia(action: (key: number) => void) {
  const latest = useRef(action); latest.current = action;
  useEffect(() => { const sub = DeviceEventEmitter.addListener('NodeCastPlaybackMedia', key => latest.current(key)); return () => sub.remove(); }, []);
}
