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
 // A cut's words include its score-conditioned variants (textVariants): readers see one of them instead of the main text.
 const words=(value:unknown)=>typeof value==='string'?value.trim():'';
 for(const item of items){
  const variants=Array.isArray((item as {textVariants?:unknown})?.textVariants)?((item as {textVariants:unknown[]}).textVariants).map(variant=>words((variant as {text?:unknown})?.text)):[];
  const text=[words((item as {text?:unknown})?.text),...variants].filter(Boolean).join('\n');
  if(text){amount++;chars+=[...text].length;}
 }
 return {amount,chars};
}
