import { useEffect, useRef, useState } from 'react';
import { isTVBuild } from './FocusPressable';
import { Platform } from 'react-native';
import * as Orientation from 'expo-screen-orientation';
// A new video can mount before the previous video's asynchronous cleanup finishes.
let orientationOwner: symbol | null = null;
export function usePlayerOrientation(onFullscreen: (value: boolean) => void) {
  const alive = useRef(true);
  const [notice, setNotice] = useState('');
  const changes = useRef(Promise.resolve());
  useEffect(() => {
    alive.current = true;
    const owner = Symbol('player-orientation'); orientationOwner = owner;
    return () => {
      alive.current = false;
      void changes.current.finally(async () => {
        // Next episode / engine handoff keeps the new player's current orientation.
        if (orientationOwner !== owner) return;
        orientationOwner = null;
        await Orientation.lockAsync(isTVBuild ? Orientation.OrientationLock.LANDSCAPE : Orientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      });
    };
  }, []);
  function orient(landscape: boolean) {
    changes.current = changes.current.then(async () => {
      if (!alive.current) return;
      try {
        if (Platform.OS === 'web') { setNotice('Rotate your device manually if your browser cannot change orientation.'); return; }
        await Orientation.lockAsync(landscape ? Orientation.OrientationLock.LANDSCAPE : (isTVBuild ? Orientation.OrientationLock.LANDSCAPE : Orientation.OrientationLock.PORTRAIT_UP));
        if (alive.current) setNotice('');
      } catch { if (alive.current) setNotice('Rotate your device manually. This device could not change orientation automatically.'); }
    });
  }
  return { notice, enter: () => { onFullscreen(true); orient(true); }, exit: () => { onFullscreen(false); orient(false); }, rotate: (landscape: boolean) => orient(landscape) };
}
