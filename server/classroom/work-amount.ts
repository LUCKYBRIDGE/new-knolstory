/** The student's own share, as counted on their device, never more than the work holds. */
export function ownAmount(total:{amount:number;chars:number},written?:{amount:number;chars:number}){
 return written?{amount:Math.min(written.amount,total.amount),chars:Math.min(written.chars,total.chars)}:total;
}
/** How much a handed-in or saved work holds, for progress at a glance: cuts (KnolStory) or pages
 * (ShortStory) that have words, and the number of characters written. */
export function workAmount(snapshot:unknown):{amount:number;chars:number}{
 const content=(snapshot as {content?:{format?:string;project?:{pages?:unknown};document?:{project?:{lines?:unknown}}}})?.content;
 const items=content?.format==='shortstory'?content.project?.pages:content?.document?.project?.lines;
 if(!Array.isArray(items))return {amount:0,chars:0};
 let amount=0,chars=0;
 for(const item of items){const text=typeof (item as {text?:unknown})?.text==='string'?((item as {text:string}).text).trim():'';if(text){amount++;chars+=[...text].length;}}
 return {amount,chars};
}
