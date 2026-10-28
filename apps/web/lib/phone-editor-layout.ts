/** Use layout/device geometry, never the visual viewport reduced by an OS keyboard. */
export function usesPhoneEditor(width:number,screenWidth:number,screenHeight:number,coarsePointer:boolean){
 return width<=700||(width<=1000&&coarsePointer&&Math.min(screenWidth,screenHeight)<=700);
}
