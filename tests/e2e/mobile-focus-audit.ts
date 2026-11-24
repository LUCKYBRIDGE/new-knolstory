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
  const folded=(node:Element)=>{for(let fold=node.closest('details:not([open])');fold;fold=fold.parentElement?.closest('details:not([open])')??null){const summary=fold.querySelector(':scope>summary');if(!summary||!summary.contains(node))return true;}return false;};
  const visible=(node:Element)=>{const box=node.getBoundingClientRect(),style=getComputedStyle(node);return box.width>0&&box.height>0&&style.visibility!=='hidden'&&style.display!=='none'&&!node.closest('[hidden],[aria-hidden="true"]')&&!folded(node);};
  const label=(node:Element)=>(node.getAttribute('aria-label')||node.textContent||'').replace(/\s+/g,' ').trim().slice(0,40);
  const controls=[...root.querySelectorAll('button,a[href],summary,select,input:not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea,[role=button],label:has(>input[type=checkbox]),label:has(>input[type=radio])')].filter(visible);
  // A transparent ::before can carry the touch area beyond a small visible control (the × close, ‹ ›).
  // A field's touch target is its wrapping label; a button may carry a transparent ::before inset or a fixed 44px ::after
  // (DESIGN 집중 편집 규칙 6: visible 32–36px, touch 44px).
  const touch=(node:Element)=>{
   const box=node.getBoundingClientRect(),px=(v:string)=>parseFloat(v)||0;let width=box.width,height=box.height;
   for(const which of ['::before','::after']){
    const pseudo=getComputedStyle(node,which);if(pseudo.content==='none'||pseudo.position!=='absolute')continue;
    if(px(pseudo.width)&&px(pseudo.height)&&!pseudo.left.endsWith('px')){width=Math.max(width,px(pseudo.width));height=Math.max(height,px(pseudo.height));}
    else if(pseudo.left.endsWith('px')&&pseudo.right.endsWith('px')){width=Math.max(width,box.width-px(pseudo.left)-px(pseudo.right));height=Math.max(height,box.height-px(pseudo.top)-px(pseudo.bottom));}
    else{width=Math.max(width,px(pseudo.width));height=Math.max(height,px(pseudo.height));}
   }
   if(/^(INPUT|SELECT|TEXTAREA)$/.test(node.tagName)){const wrap=node.closest('label');if(wrap){const outer=wrap.getBoundingClientRect();width=Math.max(width,outer.width);height=Math.max(height,outer.height);}}
   return {width,height};
  };
  const smallTargets=controls.filter(node=>{const box=touch(node);if(node.closest('p,li')&&node.tagName==='A'&&getComputedStyle(node).display==='inline')return false;return box.height<43.5||box.width<43.5;}).map(node=>{const box=node.getBoundingClientRect();return `${label(node)} (${Math.round(box.width)}×${Math.round(box.height)})`;});
  const hangul=/[가-힣]/;
  const brokenWords=[...root.querySelectorAll('*')].filter(node=>visible(node)&&[...node.childNodes].some(child=>child.nodeType===3&&hangul.test(child.textContent??'')&&/[가-힣]{2,}/.test(child.textContent??''))).filter(node=>{const style=getComputedStyle(node);if(style.wordBreak==='keep-all'||style.whiteSpace==='nowrap')return false;const range=document.createRange();range.selectNodeContents(node);return range.getClientRects().length>1&&node.getBoundingClientRect().height>parseFloat(style.lineHeight||'20')*1.5;}).map(node=>label(node));
  const fontSizes=[...new Set(controls.filter(node=>node.tagName==='BUTTON'||node.tagName==='A').map(node=>Math.round(parseFloat(getComputedStyle(node).fontSize))))].sort((a,b)=>a-b);
  const buttonHeights=[...new Set(controls.filter(node=>node.tagName==='BUTTON').map(node=>Math.round(node.getBoundingClientRect().height)))].sort((a,b)=>a-b);
  return {horizontalScroll:document.documentElement.scrollWidth>innerWidth+1,smallTargets,brokenWords,fontSizes,buttonHeights};
 });
 return {...result,primaryTop:primaryBox?Math.round(primaryBox.y):null,primaryVisible:!!primaryBox&&primaryBox.y>=0&&primaryBox.y+primaryBox.height<=viewport.height};
}

export type FocusDensity={controls:number;texts:string[];duplicates:string[];offGrid:string[];crowded:string[];oversized:string[];cutNavTop:number|null;cutNavHeight:number|null};
/**
 * Focus-screen density (2026-11-24 rules): visible controls, standing explanations, the same action twice,
 * spacing off the 4px grid, controls closer than 8px, and type or buttons larger than the scale.
 */
export async function auditDensity(page:Page,scope:Locator):Promise<FocusDensity>{
 return scope.evaluate(root=>{
  const folded=(node:Element)=>{for(let fold=node.closest('details:not([open])');fold;fold=fold.parentElement?.closest('details:not([open])')??null){const summary=fold.querySelector(':scope>summary');if(!summary||!summary.contains(node))return true;}return false;};
  const visible=(node:Element)=>{const box=node.getBoundingClientRect(),style=getComputedStyle(node);return box.width>0&&box.height>0&&box.bottom>0&&box.top<innerHeight&&style.visibility!=='hidden'&&style.display!=='none'&&style.opacity!=='0'&&!node.closest('[hidden],[aria-hidden="true"]')&&!folded(node);};
  const name=(node:Element)=>(node.getAttribute('aria-label')||node.textContent||'').replace(/\s+/g,' ').trim();
  const controls=[...root.querySelectorAll('button,a[href],summary,select,input:not([type=hidden]),textarea,[role=button]')].filter(visible).filter(node=>!(node instanceof HTMLInputElement&&node.type==='file'));
  const counts=new Map<string,number>();for(const node of controls){const key=name(node);if(key)counts.set(key,(counts.get(key)??0)+1);}
  const duplicates=[...counts].filter(([,n])=>n>1).map(([key,n])=>`${key.slice(0,30)} ×${n}`);
  // Standing explanation: a visible paragraph-like text of a sentence or more that is not a control or a field label.
  const texts=[...root.querySelectorAll('p,small,span,div,li,legend')].filter(node=>visible(node)&&!node.closest('button,a,summary,select,textarea,label,[role=status],[role=alert],[data-cut-text]')&&[...node.childNodes].some(child=>child.nodeType===3&&(child.textContent??'').trim().length>=14)).map(node=>(node.textContent??'').replace(/\s+/g,' ').trim().slice(0,48));
  const grid=(value:string)=>value.split(' ').every(part=>{const n=parseFloat(part);return Number.isNaN(n)||Math.round(n)%4===0;});
  const offGrid:string[]=[];
  for(const node of [...root.querySelectorAll('*')].filter(visible).slice(0,1500)){const s=getComputedStyle(node);for(const prop of ['gap','padding','margin'] as const){const v=s[prop];if(v&&v!=='normal'&&v!=='0px'&&!grid(v)){offGrid.push(`${node.tagName.toLowerCase()}.${String(node.className).split(/\s+/)[0]?.split('__')[1]??''} ${prop}:${v}`);}}}
  const boxes=controls.map(node=>({node,box:node.getBoundingClientRect()}));const crowded:string[]=[];
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i]!.box,b=boxes[j]!.box;if(boxes[i]!.node.contains(boxes[j]!.node)||boxes[j]!.node.contains(boxes[i]!.node))continue;const dx=Math.max(0,Math.max(a.left,b.left)-Math.min(a.right,b.right)),dy=Math.max(0,Math.max(a.top,b.top)-Math.min(a.bottom,b.bottom));if(Math.max(dx,dy)<4)crowded.push(`${name(boxes[i]!.node).slice(0,16)} / ${name(boxes[j]!.node).slice(0,16)}`);}
  const oversized=controls.filter(node=>{const s=getComputedStyle(node),box=node.getBoundingClientRect();return node.tagName!=='TEXTAREA'&&(parseFloat(s.fontSize)>17||box.height>56&&node.tagName==='BUTTON');}).map(node=>`${name(node).slice(0,20)} (${Math.round(node.getBoundingClientRect().height)}px, ${getComputedStyle(node).fontSize})`);
  const nav=root.querySelector('[data-cut-nav]')??root.querySelector('select[aria-label="현재 장과 컷 이동"]');const navBox=nav&&nav.getBoundingClientRect().height>0?nav.getBoundingClientRect():null;
  return {controls:controls.length,texts:[...new Set(texts)],duplicates,offGrid:[...new Set(offGrid)].slice(0,60),crowded:[...new Set(crowded)].slice(0,30),oversized,cutNavTop:navBox?Math.round(navBox.top):null,cutNavHeight:navBox?Math.round(navBox.height):null};
 });
}
