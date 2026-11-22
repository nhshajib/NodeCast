/** Fit a complete poster and its readable labels below the persistent TV filters. */
export function tvPosterLayout(columnWidth:number,viewportHeight?:number) {
 const metadataHeight=112;
 // Leave room for the list's padding and the native focus ring/scale.
 const available=viewportHeight===undefined?Infinity:Math.max(160,Math.floor((viewportHeight-24)/8)*8);
 const imageWidth=Math.min(columnWidth,Math.max(32,(available-metadataHeight)/1.5));
 const imageHeight=imageWidth*1.5;
 return {imageWidth,imageHeight,tileHeight:Math.ceil((imageHeight+metadataHeight)/8)*8};
}
