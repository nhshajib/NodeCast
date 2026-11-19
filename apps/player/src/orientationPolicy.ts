/** Hardware/tablet size survives rotation and narrow iPad multitasking windows. */
export function orientationPolicy({ width, height, tablet = false, television = false }: { width: number; height: number; tablet?: boolean; television?: boolean }): 'portrait' | 'unlocked' | 'landscape' {
  if (television) return 'landscape';
  return tablet || Math.min(width, height) >= 600 ? 'unlocked' : 'portrait';
}
