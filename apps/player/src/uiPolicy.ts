export type AppMessage = { text: string; tone: 'info' | 'error' };
export const messageLifetime = (message: AppMessage | null) => message?.tone === 'info' ? 4000 : null;
export function tvBackAction({ home, lastBack, now }: { home: boolean; lastBack: number | null; now: number }): 'home' | 'warn' | 'exit' {
  if (!home) return 'home';
  return lastBack !== null && now - lastBack <= 2000 ? 'exit' : 'warn';
}

/** Native search and the tab body must address the same independent library view. */
export function libraryTabView(tab:string,android:boolean):'watch'|'live'|'library'|'search'|null {
 if(tab==='live')return android?'watch':'live';
 return tab==='library'||tab==='search'?tab:null;
}

/** Window-coordinate measurements account for bottom bars, top tabs and rotation. */
export function miniPlayerBottom(rootBottom:number|null,contentBottom:number|null,safeBottom:number):number {
 return Math.max(safeBottom,rootBottom!==null&&contentBottom!==null?Math.max(0,rootBottom-contentBottom):0)+16;
}
