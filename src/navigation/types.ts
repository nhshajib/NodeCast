import type { Media, Section } from '../provider';
import type { Profile } from '../vault';
import type { ExternalPlayer } from '../players';
import type { SearchScope } from '../SearchScope';
import type { GuideProgramme } from '../xmltv';

/** Library lists. Each keeps its own search, category and section so tabs never share state. */
export type LibraryView = 'watch' | 'live' | 'movies' | 'series' | 'search' | 'saved' | 'library';
/** Anything that can be the focused screen and decides which catalogues to load. */
export type FocusView = LibraryView | 'home' | 'guide' | 'settings';
export type ViewState = { search: string; category: string; section: Section; scope: SearchScope; hidden: boolean; source: 'saved' | 'movies' | 'series' };

/** Pushed onto the native stack. Short tasks among them are presented as native form sheets. */
export type Page = { type: 'provider'; profile?: Profile } | { type: 'profiles' } | { type: 'players' } | { type: 'delete'; profile: Profile } |
  { type: 'series'; item: Media } | { type: 'details'; item: Media } | { type: 'external'; item: Media; preferred?: ExternalPlayer } |
  { type: 'appearance' } | { type: 'storage' } | { type: 'backup' } | { type: 'family' } | { type: 'channel-options'; item: Media } |
  { type: 'privacy' } | { type: 'organize'; view: LibraryView } | { type: 'guide' } | { type: 'history' } | { type: 'home-ip' } |
  { type: 'browse'; view: LibraryView } | { type: 'settings' } | { type: 'programme'; item: Media; programme: GuideProgramme };
export type PageEntry = { key: string; page: Page };
export type PlayerSession = { item: Media; resumeAt?: number };

/** Presented with `presentation: 'formSheet'` and these detents (fractions of the screen height). */
export const sheetDetents: Partial<Record<Page['type'], number[]>> = {
  provider: [0.75, 1], external: [0.55, 1], delete: [0.42], 'channel-options': [0.6, 1], programme: [0.45, 0.9],
};
export const isSheet = (type: Page['type']) => type in sheetDetents;
