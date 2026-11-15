export type DisplayFit = 'contain' | 'cover';
export const speeds = [.75, 1, 1.25, 1.5, 2] as const;
export const sleepMinutes = [15, 30, 60, 90] as const;
export function sleepDeadline(minutes: number, now = Date.now()): number | null {
  return sleepMinutes.includes(minutes as typeof sleepMinutes[number]) ? now + minutes * 60000 : null;
}
export function sleepExpired(deadline: number | null, now = Date.now()) { return deadline !== null && now >= deadline; }
