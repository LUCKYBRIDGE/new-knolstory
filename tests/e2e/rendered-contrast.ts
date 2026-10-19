import type {Locator} from '@playwright/test';
import {PNG} from 'pngjs';
import {writeFile} from 'node:fs/promises';
import {contrastRatio,glyphMaskSupportsPixel,type Rgb} from './contrast-math';
/** Diagnostic sampling of the actual backdrop with layout-preserving text hiding. */
export async function renderedTextContrast(element:Locator,outputPrefix:string){
 const info=await element.evaluate(node=>{
  const target=node as HTMLElement,style=getComputedStyle(target);let opacity=1;const filters:string[]=[];
  for(let parent:HTMLElement|null=target;parent;parent=parent.parentElement){const value=getComputedStyle(parent);opacity*=Number(value.opacity);if(value.filter!=='none')filters.push(value.filter);}
  const box=target.getBoundingClientRect(),walker=document.createTreeWalker(target,NodeFilter.SHOW_TEXT),textRanges=[];let mixedTextStyle=false;
  while(walker.nextNode()){
   const text=walker.currentNode;if(!text.textContent?.trim())continue;
   const parent=text.parentElement;if(parent){const child=getComputedStyle(parent);if(child.color!==style.color||child.webkitTextFillColor!==style.webkitTextFillColor||child.fontSize!==style.fontSize||child.fontWeight!==style.fontWeight)mixedTextStyle=true;}
   const range=document.createRange();range.selectNodeContents(text);
   for(const rect of range.getClientRects())textRanges.push({left:rect.left-box.left,top:rect.top-box.top,right:rect.right-box.left,bottom:rect.bottom-box.top});
  }
  return {style:target.getAttribute('style'),text:target.innerText,color:style.color,fill:style.webkitTextFillColor,fontSize:parseFloat(style.fontSize),fontWeight:Number(style.fontWeight),opacity,filters,box:{width:box.width,height:box.height},textRanges,mixedTextStyle};
 });
 const color=info.color.match(/[\d.]+/g)?.map(Number);
 if(!/^rgba?\(/.test(info.color)||!color||color.length<3||info.filters.length||info.fill!==info.color||info.opacity!==1||(color[3]??1)!==1||info.mixedTextStyle||!info.textRanges.length)throw Error('Unsupported CSS foreground or filter; manual review required.');
 const original=await element.screenshot({animations:'disabled'});let backdrop:Buffer,blackMask:Buffer,whiteMask:Buffer;
 try{
  for(const color of ['#000000','#ffffff','transparent']){
   await element.evaluate((node,color)=>{const target=node as HTMLElement;target.style.setProperty('color',color,'important');target.style.setProperty('-webkit-text-fill-color',color,'important');target.style.setProperty('text-shadow','none','important');},color);
   const pixels=await element.screenshot({animations:'disabled'});
   if(color==='#000000')blackMask=pixels;else if(color==='#ffffff')whiteMask=pixels;else backdrop=pixels;
  }
 }finally{await element.evaluate((node,style)=>{if(style===null)node.removeAttribute('style');else node.setAttribute('style',style);},info.style);}
 await Promise.all([writeFile(outputPrefix+'-text.png',original),writeFile(outputPrefix+'-backdrop.png',backdrop!),writeFile(outputPrefix+'-black-mask.png',blackMask!),writeFile(outputPrefix+'-white-mask.png',whiteMask!)]);
 const text=PNG.sync.read(original),background=PNG.sync.read(backdrop!),black=PNG.sync.read(blackMask!),white=PNG.sync.read(whiteMask!);
 if([background,black,white].some(image=>image.width!==text.width||image.height!==text.height))throw Error('Temporary text hiding changed layout.');
 let minimum=Infinity,samples=0,worst:{x:number;y:number;background:Rgb}|undefined;
 for(let offset=0;offset<text.data.length;offset+=4){
  const dark=[black.data[offset]!,black.data[offset+1]!,black.data[offset+2]!] as const,light=[white.data[offset]!,white.data[offset+1]!,white.data[offset+2]!] as const;
  if(!glyphMaskSupportsPixel(dark,light))continue;
  const x=(offset/4%text.width+.5)*info.box.width/text.width,y=(Math.floor(offset/4/text.width)+.5)*info.box.height/text.height;
  if(!info.textRanges.some(rect=>x>=rect.left-.5&&x<=rect.right+.5&&y>=rect.top-.5&&y<=rect.bottom+.5))continue;
  const bg=[background.data[offset]!,background.data[offset+1]!,background.data[offset+2]!] as const;
  const ratio=contrastRatio(color.slice(0,3) as unknown as Rgb,bg);samples++;
  if(ratio<minimum){minimum=ratio;worst={x:offset/4%text.width,y:Math.floor(offset/4/text.width),background:bg};}
 }
 if(!samples)throw Error('No changed text paint found; manual review required.');
 return {info,minimum,samples,worst,scope:'Opaque CSS foreground against rendered backdrop at independently detected black/white mask pixels within actual text-node range rectangles (excluding borders). Nonopaque/filter/fill cases require manual review; not full-page/device conformance.'};
}
