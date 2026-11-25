import type {Media} from './provider.ts';
/** Operates on the already filtered/authorized list; never reaches outside it. */
export function adjacentChannel(channels:readonly Media[],currentId:string,direction:1|-1):Media|undefined {
 if(channels.length<2)return;
 const index=channels.findIndex(item=>item.id===currentId);
 return channels[index<0?(direction===1?0:channels.length-1):(index+direction+channels.length)%channels.length];
}
