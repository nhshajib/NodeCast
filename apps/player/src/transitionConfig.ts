/**
 * A short slide communicates drill-in navigation without moving a whole screen.
 * Root tabs are peers: switch them immediately; animate only the tab indicator.
 * Player surfaces stay still to preserve decoder state and remote focus.
 */
export type TransitionType = 'slide' | 'none';
export const slideTransition = Object.freeze({ duration: 210, distance: 24, settleAfter: 380 });

export const defaultTransitions: Readonly<Record<string, TransitionType>> = Object.freeze({
  home: 'none', watch: 'none', saved: 'none', you: 'none', search: 'none', 'guide-tab': 'none',
  player: 'none', '': 'none',
  details: 'slide', series: 'slide', provider: 'slide', profiles: 'slide',
  players: 'slide', delete: 'slide', external: 'slide', appearance: 'slide',
  storage: 'slide', backup: 'slide', family: 'slide', 'channel-options': 'slide',
  privacy: 'slide', organize: 'slide', guide: 'slide', history: 'slide', 'home-ip': 'slide',
});

const overrides = new Map<string, TransitionType>();
const listeners = new Set<() => void>();
const isTransition = (value: unknown): value is TransitionType => value === 'slide' || value === 'none';

export function getTransition(screenName: string): TransitionType {
  return overrides.get(screenName) ?? (
    Object.prototype.hasOwnProperty.call(defaultTransitions, screenName)
      ? defaultTransitions[screenName] : 'slide'
  );
}

/** Configure one route. Changes notify mounted consumers once, never per frame. */
export function setTransition(screenName: string, transitionType: TransitionType): void {
  if (!screenName.trim()) throw new TypeError('A transition requires a screen name.');
  if (!isTransition(transitionType)) throw new TypeError('Supported transitions: slide, none.');
  if (getTransition(screenName) === transitionType) return;
  overrides.set(screenName, transitionType);
  for (const listener of [...listeners]) listener();
}

/** Restore a screen's application default, e.g. after a temporary experiment. */
export function resetTransition(screenName: string): void {
  const previous = getTransition(screenName);
  overrides.delete(screenName);
  if (getTransition(screenName) !== previous) {
    for (const listener of [...listeners]) listener();
  }
}

export function subscribeTransitions(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
