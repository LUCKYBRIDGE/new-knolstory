export function keyboardOccludesEditor(size:{layoutHeight:number;visualHeight:number;offsetTop:number;focused:boolean;scale:number}){
 // Browser toolbars and pinch zoom are not evidence of an on-screen keyboard.
 return size.focused&&size.scale===1&&size.layoutHeight-size.visualHeight-size.offsetTop>Math.max(80,size.layoutHeight*.15);
}
export function adjacentManuscriptCuts<T extends {id:string}>(cuts:readonly T[],id:string):{previous?:T;next?:T}{
 const index=cuts.findIndex(cut=>cut.id===id);
 return index<0?{}:{previous:cuts[index-1],next:cuts[index+1]};
}
