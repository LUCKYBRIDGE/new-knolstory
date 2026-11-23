import type {Page,Locator} from '@playwright/test';
/** Phone and tablet sizes the classroom and settings screens are checked at (2026-11-23). */
export const focusViewports=[
 {name:'320x700',width:320,height:700},{name:'360x720',width:360,height:720},{name:'390x844',width:390,height:844},
 {name:'844x390',width:844,height:390},{name:'667x375',width:667,height:375},
 {name:'768x1024',width:768,height:1024},{name:'1024x768',width:1024,height:768},
] as const;
export type FocusAudit={horizontalScroll:boolean;smallTargets:string[];brokenWords:string[];primaryTop:number|null;primaryVisible:boolean;fontSizes:number[];buttonHeights:number[]};
/**
 * Measures one screen inside `scope`: page-level horizontal scroll, visible controls under 44px,
 * Korean text that may break inside a word, and whether the primary action is in the first view.
 */
export async function auditScreen(page:Page,scope:Locator,primary?:Locator):Promise<FocusAudit>{
 const primaryBox=primary&&await primary.count()?await primary.first().boundingBox():null;
 const viewport=page.viewportSize()!;
 const result=await scope.evaluate(root=>{
  // Content of a closed <details> can still report a box in Chromium; only its summary is on screen.
  const folded=(node:Element)=>{const fold=node.closest('details:not([open])');return !!fold&&!node.closest('details:not([open])>summary');};
  const visible=(node:Element)=>{const box=node.getBoundingClientRect(),style=getComputedStyle(node);return box.width>0&&box.height>0&&style.visibility!=='hidden'&&style.display!=='none'&&!node.closest('[hidden],[aria-hidden="true"]')&&!folded(node);};
  const label=(node:Element)=>(node.getAttribute('aria-label')||node.textContent||'').replace(/\s+/g,' ').trim().slice(0,40);
  const controls=[...root.querySelectorAll('button,a[href],summary,select,input:not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea,[role=button],label:has(>input[type=checkbox]),label:has(>input[type=radio])')].filter(visible);
  const smallTargets=controls.filter(node=>{const box=node.getBoundingClientRect();if(node.closest('p,li')&&node.tagName==='A'&&getComputedStyle(node).display==='inline')return false;return box.height<43.5||box.width<43.5;}).map(node=>{const box=node.getBoundingClientRect();return `${label(node)} (${Math.round(box.width)}×${Math.round(box.height)})`;});
  const hangul=/[가-힣]/;
  const brokenWords=[...root.querySelectorAll('*')].filter(node=>visible(node)&&[...node.childNodes].some(child=>child.nodeType===3&&hangul.test(child.textContent??'')&&/[가-힣]{2,}/.test(child.textContent??''))).filter(node=>{const style=getComputedStyle(node);if(style.wordBreak==='keep-all'||style.whiteSpace==='nowrap')return false;const range=document.createRange();range.selectNodeContents(node);return range.getClientRects().length>1&&node.getBoundingClientRect().height>parseFloat(style.lineHeight||'20')*1.5;}).map(node=>label(node));
  const fontSizes=[...new Set(controls.filter(node=>node.tagName==='BUTTON'||node.tagName==='A').map(node=>Math.round(parseFloat(getComputedStyle(node).fontSize))))].sort((a,b)=>a-b);
  const buttonHeights=[...new Set(controls.filter(node=>node.tagName==='BUTTON').map(node=>Math.round(node.getBoundingClientRect().height)))].sort((a,b)=>a-b);
  return {horizontalScroll:document.documentElement.scrollWidth>innerWidth+1,smallTargets,brokenWords,fontSizes,buttonHeights};
 });
 return {...result,primaryTop:primaryBox?Math.round(primaryBox.y):null,primaryVisible:!!primaryBox&&primaryBox.y>=0&&primaryBox.y+primaryBox.height<=viewport.height};
}
