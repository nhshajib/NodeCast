/** Three color families: primary green, neutral, and semantic red.
 * Artwork/provider logos are content, not additional interface colors.
 * Optical details (1px borders, icon strokes, type) are not layout spacing.
 */
export const space = { none: 0, xs: 8, sm: 16, md: 24, lg: 32, xl: 40, xxl: 48, section: 64 } as const;
export const radius = { card: 16, control: 12, pill: 999 } as const;
export const control = { touch: 48, input: 56 } as const;
export const palette = {
 primary: { action: '#1EC677', ink: '#0D4029', link: '#0B7A47', subtle: '#DDF4E7', darkSubtle: '#1F4A36', onDark: '#C9F5DD' },
 neutral: { light: '#F7F6F1', white: '#FFFFFF', lightSurface: '#EEEEE7', lightBorder: '#D8DCD7', ink: '#111613', muted: '#646B67', night: '#0A0E0C', dark: '#0F1412', darkPanel: '#1B2420', darkSurface: '#18201C', darkBorder: '#3D4B43', onDark: '#E8EEEA', darkMuted: '#A3ADA7' },
 semantic: { red: '#B42320', onDark: '#FFB4AC', lightSurface: '#FBEAE8', darkSurface: '#392321', onRed: '#FFFFFF' },
} as const;

/** TV title-safe geometry is intentionally not a layout gap. */
export const tvSafe = { h: 48, v: 27 } as const;
export const tvType = { caption: 14, small: 16, body: 18, label: 18, button: 18, h2: 24, h1: 36 } as const;
