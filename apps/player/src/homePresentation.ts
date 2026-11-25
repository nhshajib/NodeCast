import type {Media} from './provider.ts';
export function favoriteLiveChannel(items:Media[],favorites:readonly string[]):Media|undefined {
 const live=new Map(items.filter(item=>item.kind==='live').map(item=>[item.id,item]));
 for(const id of favorites){const item=live.get(id);if(item)return item;}
}
export function homeGreeting(hour:number):string {
 return hour<12?'Good morning.':hour<18?'Good afternoon.':'Good evening.';
}
