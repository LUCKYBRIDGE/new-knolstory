/** Keep modal boundary traversal within its controls; native Tab handles interior focus. */
export function dialogTabDestination(current:number,count:number,backwards:boolean):number|undefined{
 if(count<=0)return undefined;
 if(current<0)return backwards?count-1:0;
 if(backwards&&current===0)return count-1;
 if(!backwards&&current===count-1)return 0;
 return undefined;
}
export function trapDialogTab(event:Pick<KeyboardEvent,'key'|'shiftKey'|'preventDefault'>,dialog:HTMLDialogElement|null):void{
 if(event.key!=='Tab'||!dialog)return;
 const activeDialog=document.activeElement?.closest('dialog');
 if(activeDialog&&activeDialog!==dialog)return; // A nested asset dialog owns its focus.
 const controls=Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,a[href],[tabindex]:not([tabindex="-1"])')).filter(element=>element.closest('dialog')===dialog&&element.tabIndex>=0&&element.getClientRects().length>0&&getComputedStyle(element).visibility!=='hidden');
 const destination=dialogTabDestination(controls.indexOf(document.activeElement as HTMLElement),controls.length,event.shiftKey);
 if(destination===undefined)return;
 event.preventDefault();controls[destination].focus();
}
