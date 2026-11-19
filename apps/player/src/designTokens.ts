/** Three color families: primary green, neutral, and semantic red.
 * Artwork/provider logos are content, not additional interface colors.
 * Optical details (1px borders, icon strokes, type) are not layout spacing.
 */
export const space = { none: 0, xs: 8, sm: 16, md: 24, lg: 32, xl: 40, xxl: 48, section: 64 } as const;
export const radius = { card: 16, control: 12, pill: 999 } as const;
export const control = { touch: 48, input: 56 } as const;
export const palette = {
 primary: { action: '#1EC677', ink: '#0D4029', link: '#0B7A47', subtle: '#DDF4E7', darkSubtle: '#1F4A36', onDark: '#C9F5DD' },
 neutral: { black: '#000000', light: '#F7F6F1', white: '#FFFFFF', lightSurface: '#EEEEE7', lightBorder: '#D8DCD7', ink: '#111613', muted: '#646B67', night: '#0A0E0C', dark: '#0F1412', darkPanel: '#1B2420', darkSurface: '#18201C', darkBorder: '#3D4B43', onDark: '#E8EEEA', darkMuted: '#A3ADA7' },
 semantic: { red: '#B42320', onDark: '#FFB4AC', lightSurface: '#FBEAE8', darkSurface: '#392321', onRed: '#FFFFFF' },
} as const;

/** TV title-safe geometry is intentionally not a layout gap. */
export const tvSafe = { h: 48, v: 27 } as const;
export const tvType = { caption: 14, small: 16, body: 18, label: 18, button: 18, h2: 24, h1: 36 } as const;

/** Fixed contrast surfaces over artwork/video, independent of light/dark canvas. */
export const videoPalette = {
 videoControlBorder:palette.neutral.white+'18',videoSignature:'#B5C9BD',videoBlack: palette.neutral.black, onVideo: palette.neutral.white,
 videoArtTop: palette.neutral.night+'26',videoArtBottom:palette.neutral.night+'F2',videoToolbar:palette.neutral.night+'C9',
 videoControl:palette.primary.ink+'CC',videoControlStrong:palette.primary.ink+'D9',videoErrorSurface:palette.primary.ink+'E8',
 videoSurface:palette.neutral.darkSurface,artPlaceholder:'#42524A',videoMuted:palette.neutral.darkMuted,
 featuredKicker:'#B9EAD1',featuredCopy:'#D0E9DB',videoLink:palette.primary.onDark,onVideoSecondary:'#D0DAD4',
 videoHandle:'#E6E3DA',videoCopy:palette.neutral.onDark,videoSecondary:palette.neutral.lightSurface,
 videoChip:palette.neutral.white+'10',videoDivider:palette.neutral.white+'20',videoBorder:palette.neutral.white+'30',videoTrackSoft:palette.neutral.white+'40',videoPressed:palette.neutral.white+'2A',
};
