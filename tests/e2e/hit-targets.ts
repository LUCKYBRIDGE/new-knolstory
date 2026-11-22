import {expect,type Page} from '@playwright/test';

export type CoveredControl=Readonly<{control:string;point:string;coveredBy:string}>;

/**
 * Finds visible controls that a press would not reach: another button, bar or panel sits on top of them.
 * Each control is probed at its centre and just inside the middle of each edge, because a bar that covers
 * only one edge still steals presses there (edge midpoints stay inside rounded and pill-shaped buttons).
 * A hit on one of the control's own ancestors means the control is clipped there, not covered by something else. When a modal dialog is open only its own controls are probed;
 * everything behind it is meant to be unreachable. Pass `scope` (a selector) the same way for an open popup menu. Visually hidden (screen-reader only) controls are skipped.
 */
export async function coveredControls(page:Page,scope?:string):Promise<CoveredControl[]>{
 return page.evaluate(scope=>{
  const describe=(node:Element|null)=>{
   if(!node)return 'nothing';
   const element=node as HTMLElement,label=element.getAttribute('aria-label')||element.innerText?.trim().split('\n')[0]||element.getAttribute('title')||'';
   const name=typeof element.className==='string'?element.className.split(' ')[0]?.replace(/__[A-Za-z0-9_-]+$/,''):'';
   return `${element.tagName.toLowerCase()}${name?`.${name}`:''}${label?` “${label.slice(0,40)}”`:''}`;
  };
  const modal=[...document.querySelectorAll('dialog[open]')].find(dialog=>dialog.matches(':modal'))??null;
  // An open popup menu covers the page on purpose; then only the menu's own controls matter.
  const root:ParentNode=modal??(scope?document.querySelector(scope):null)??document;
  const controls=[...root.querySelectorAll<HTMLElement>('button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"]')];
  const problems:{control:string;point:string;coveredBy:string}[]=[];
  for(const control of controls){
   if(control.closest('[inert],[aria-hidden="true"]')||(control as HTMLButtonElement).disabled)continue;
   // Closed <details>, display:none and visibility:hidden ancestors are not on screen at all.
   if(!control.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))continue;
   const style=getComputedStyle(control);
   if(style.pointerEvents==='none')continue;
   const rect=control.getBoundingClientRect();
   if(rect.width<4||rect.height<4)continue;
   // Screen-reader-only content is clipped on purpose.
   let clipped=false;for(let node:HTMLElement|null=control;node;node=node.parentElement){const value=getComputedStyle(node);if(value.clipPath==='inset(50%)'||(value.overflow==='hidden'&&node.getBoundingClientRect().width<=1)){clipped=true;break;}}
   if(clipped)continue;
   const inset=Math.min(6,rect.width/4,rect.height/4);
   const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
   const points:[string,number,number][]=[['centre',cx,cy],['left edge',rect.left+inset,cy],['right edge',rect.right-inset,cy],['top edge',cx,rect.top+inset],['bottom edge',cx,rect.bottom-inset]];
   for(const [point,x,y] of points){
    // Only what is on screen now; scrolled-away controls are checked when scrolled into view.
    if(x<0||y<0||x>=innerWidth||y>=innerHeight)continue;
    const hit=document.elementFromPoint(x,y);
    if(!hit||hit===control||control.contains(hit)||hit.contains(control))continue;
    // A label wrapping its own input is the same press target.
    if(hit instanceof HTMLLabelElement&&(hit.control===control||hit.contains(control)))continue;
    if(control instanceof HTMLLabelElement&&control.contains(hit))continue;
    // Clipped by a scrolling ancestor rather than covered: the control is partly scrolled out of its list.
    let scroller:HTMLElement|null=control.parentElement,outside=false;
    for(;scroller;scroller=scroller.parentElement){const value=getComputedStyle(scroller);if(/(auto|scroll|hidden)/.test(value.overflow+value.overflowX+value.overflowY)){const box=scroller.getBoundingClientRect();if(x<box.left||x>box.right||y<box.top||y>box.bottom){outside=true;break;}}}
    if(outside)continue;
    problems.push({control:describe(control),point,coveredBy:describe(hit)});
    break;
   }
  }
  return problems;
 },scope);
}

export async function expectControlsReachable(page:Page,where:string,scope?:string){
 const problems=await coveredControls(page,scope);
 expect(problems,`${where}: controls covered by another element`).toEqual([]);
}
