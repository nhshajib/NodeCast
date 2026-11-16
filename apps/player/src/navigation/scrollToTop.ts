import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Re-tapping the active tab scrolls its main list to the top. iOS NativeTabs does this for the
 * first native scroll view; this registry covers Android, web and screens whose main list is not
 * the first scroll view (the library's category chips come before its list).
 */
type Scrollable = object;
type Methods = { scrollToOffset?: (options: { offset: number; animated?: boolean }) => void; scrollTo?: (options: { x?: number; y?: number; animated?: boolean }) => void };
const handlers = new Map<string, () => void>();
let focusedTab = '';

export function setFocusedTab(name: string) { focusedTab = name; }
export function getFocusedTab() { return focusedTab; }
/** Called from the tab bar's press event. Pressing a different tab only switches tabs. */
export function tabPressed(name: string) { if (focusedTab === name) handlers.get(name)?.(); }

export function scrollToTop(target: Scrollable | null | undefined, animated = true) {
  const list = target as Methods | null | undefined;
  if (!list) return;
  if (typeof list.scrollToOffset === 'function') list.scrollToOffset({ offset: 0, animated });
  else if (typeof list.scrollTo === 'function') list.scrollTo({ x: 0, y: 0, animated });
}

export function useTabScrollToTop(tab: string | undefined, ref: RefObject<Scrollable | null>) {
  useEffect(() => {
    if (!tab) return;
    const handler = () => scrollToTop(ref.current);
    handlers.set(tab, handler);
    return () => { if (handlers.get(tab) === handler) handlers.delete(tab); };
  }, [tab, ref]);
}
