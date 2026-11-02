import {expect,type Page} from '@playwright/test';
import {PNG} from 'pngjs';
/** Locate the actual painted native action, rather than duplicating its placement formula.
 * Confirmation cards have a wide solid mint action on an opaque black/white card.
 */
export async function nativeTransitionActionBox(page:Page){
 const frame=page.getByTestId('story-runtime-frame');
 const bounds=(await frame.boundingBox())!;expect(bounds).toBeTruthy();
 const shot=PNG.sync.read(await frame.screenshot()),ratio=shot.width/bounds.width;
 const matches=(x:number,y:number)=>{const offset=(y*shot.width+x)*4;return Math.abs(shot.data[offset]-214)<=4&&Math.abs(shot.data[offset+1]-234)<=4&&Math.abs(shot.data[offset+2]-223)<=4;};
 const groups:Array<{top:number;bottom:number;left:number;right:number}>=[];
 for(let y=Math.floor(shot.height*.5);y<shot.height;y++){
  let count=0,left=shot.width,right=-1;
  for(let x=0;x<shot.width;x++)if(matches(x,y)){count++;left=Math.min(left,x);right=Math.max(right,x);}
  if(count<shot.width*.5)continue;
  const last=groups.at(-1);
  if(last&&y===last.bottom+1){last.bottom=y;last.left=Math.min(last.left,left);last.right=Math.max(last.right,right);}else groups.push({top:y,bottom:y,left,right});
 }
 const action=groups.sort((a,b)=>(b.bottom-b.top)-(a.bottom-a.top))[0];
 expect(action,'the native confirmation action must be visibly painted').toBeDefined();
 return {x:bounds.x+action.left/ratio,y:bounds.y+action.top/ratio,width:(action.right-action.left+1)/ratio,height:(action.bottom-action.top+1)/ratio};
}
/** Manual title cards contain a single dark green native action in their lower half. */
export async function nativeManualTitleActionBox(page:Page){
 const frame=page.getByTestId('story-runtime-frame'),bounds=(await frame.boundingBox())!;
 const shot=PNG.sync.read(await frame.screenshot()),ratio=shot.width/bounds.width;
 let left=shot.width,right=-1,top=shot.height,bottom=-1;
 for(let y=Math.floor(shot.height*.5);y<shot.height;y++)for(let x=0;x<shot.width;x++){
  const i=(y*shot.width+x)*4,r=shot.data[i],g=shot.data[i+1],b=shot.data[i+2];
  if(r<90&&g-r>=15&&b-r>=12){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 }
 expect(right,'the native manual-title action is visibly painted').toBeGreaterThan(left);
 return {x:bounds.x+left/ratio,y:bounds.y+top/ratio,width:(right-left+1)/ratio,height:(bottom-top+1)/ratio};
}
