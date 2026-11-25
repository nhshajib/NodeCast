/** Pins reorder available categories only; they never reveal hidden/restricted groups. */
export function orderFavoriteGroups(groups:string[],favorites:readonly string[]=[]):string[] {
 const available=new Set(groups.filter(group=>group!=='All'));
 const pinned=[...new Set(favorites)].filter(group=>available.has(group));
 const selected=new Set(pinned);
 return ['All',...pinned,...[...available].filter(group=>!selected.has(group))];
}
export function toggleFavoriteGroup(groups:readonly string[]|undefined,group:string):string[] {
 const current=[...new Set(groups||[])];
 if(!group||group==='All')return current;
 if(current.includes(group))return current.filter(value=>value!==group);
 if(current.length>=300)throw new Error('You can pin up to 300 categories. Unpin one first.');
 return [...current,group];
}
