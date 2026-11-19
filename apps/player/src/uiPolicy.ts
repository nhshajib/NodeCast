export type AppMessage = { text: string; tone: 'info' | 'error' };
export const messageLifetime = (message: AppMessage | null) => message?.tone === 'info' ? 4000 : null;
export function tvBackAction({ home, lastBack, now }: { home: boolean; lastBack: number | null; now: number }): 'home' | 'warn' | 'exit' {
  if (!home) return 'home';
  return lastBack !== null && now - lastBack <= 2000 ? 'exit' : 'warn';
}
