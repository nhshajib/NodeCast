/**
 * Internal switches for the 1.0.0 feature phases (docs/RELEASE-1.0.0.md).
 * Each flag turns on only after its phase passes its regression gate. They are
 * compile-time constants: never shown in Settings and never stored per user.
 */
export const features = {
  /** Phase 1: SQLite catalogue store with legacy JSON fallback. */
  catalogRepository: true,
  /** Phase 2: ranked search, newest-first sort, staged refresh. */
  rankedSearch: false,
  /** Phase 3: named lists, hidden items, series display options, autoplay countdown. */
  organization: false,
  /** Phase 4: guide health, matching suggestions and time offsets. */
  guideRepair: false,
  /** Phase 5: buffering watchdog, previous channel, return to live, playback help. */
  playbackAssist: false,
  /** Phase 6: paste-and-preview setup and backup import preview (Add or Update). */
  transferPreview: false,
} as const;
export type FeatureName = keyof typeof features;
