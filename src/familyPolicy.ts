import type { Media } from './provider.ts';
import type { Profile } from './vault.ts';
export function contentAllowed(profile: Profile | null | undefined,item: Pick<Media,'group'|'accessGroup'> & Partial<Pick<Media,'id'|'kind'>>,unlocked:boolean){if(!unlocked&&profile?.restrictedGroups?.length&&item.id?.startsWith('episode:')&&!item.accessGroup)return false;return unlocked||!profile?.restrictedGroups?.includes(item.accessGroup||item.group);}
export function pinValid(value:string){return /^\d{6}$/.test(value)}
export function cooldownRemaining(until:number,now=Date.now()){return Math.max(0,Math.ceil((until-now)/1000))}
