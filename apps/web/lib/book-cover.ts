import { resolveAsset } from '@knolstory/asset-registry';
import { DEFAULT_COVER, COVER_THEMES, type StoryProject, type StoryCover } from '@knolstory/story-domain';
import { COVER_FONTS, COVER_PRESET_OPTIONS, COVER_TITLE_SIZE, isStoryCoverComposition, type StoryCoverComposition, type CoverPresetId } from '@knolstory/story-domain';
import type { CoverBox, CoverFaceId, CoverImageElement, CoverTextElement } from '@knolstory/story-domain';
export { COVER_FONTS, COVER_PRESET_OPTIONS, COVER_TITLE_SIZE };
export type { StoryCoverComposition, CoverPresetId, CoverFaceId };
export const COVER_BAND = { top: .82, height: .18 } as const;
export type CoverTextContext = { title: string; description: string; author: string; subtitle: string; authorNote: string };
/** Archived cover-only aliases project onto the current watercolor edition; saved works stay intact. */
const CURRENT_COVER_ART:Readonly<Record<string,string>>={
  'legacy-cover.onggojib.background.warm-room-pixel':'onggojib.background.warm-room-pixel',
  'legacy-cover.onggojib.background.winter-courtyard-pixel':'onggojib.background.winter-courtyard-pixel',
  'legacy-cover.onggojib.background.classic-closed-house':'onggojib.background.spring-courtyard-pixel',
  'legacy-cover.onggojib.character.real-consistent-pixel':'onggojib.character.real-consistent-pixel',
  'legacy-cover.onggojib.character.real-angry-pixel':'onggojib.character.real-angry-pixel',
};
const currentCoverArt=(id:string)=>Object.hasOwn(CURRENT_COVER_ART,id)?CURRENT_COVER_ART[id]:id;
function projectCurrentCoverArt(cover:StoryCover):StoryCover {
  const design=cover.design;
  return {...cover,backgroundId:currentCoverArt(cover.backgroundId),characterId:currentCoverArt(cover.characterId),
    ...(design?{design:{...design,faces:Object.fromEntries(Object.entries(design.faces).map(([id,face])=>[id,{...face,elements:face.elements.map(item=>item.type==='image'?{...item,assetId:currentCoverArt(item.assetId)}:item)}])) as typeof design.faces}}:{})};
}
/** Cover metadata only. No playback scene, runtime composition or persisted changes. */
export function resolveStoryCover(project: Pick<StoryProject, 'cover' | 'chapters' | 'lines'>): StoryCover {
  if (project.cover) return projectCurrentCoverArt(structuredClone(project.cover));
  const chapter = [...project.chapters].sort((a,b)=>a.order-b.order)[0];
  const line = project.lines.filter(l=>l.chapterId===chapter?.id).sort((a,b)=>a.order-b.order)[0];
  return projectCurrentCoverArt({...DEFAULT_COVER,backgroundId:line?.backgroundId||chapter?.backgroundId||'',characterId:line?.leftAssetId||chapter?.leftAssetId||''});
}
export function defaultCoverComposition(cover: StoryCover): StoryCoverComposition {
  return {version:1,backgroundFit:'fill',backgroundX:50,backgroundY:50,backgroundZoom:1,
    characterX:cover.characterPosition==='left'?28:cover.characterPosition==='right'?72:50,
    characterBottom:cover.layout==='picture'?20:0,characterScale:1,titleX:50,
    titleY:cover.titlePosition==='top'?12:cover.titlePosition==='middle'?35:55,titleWidth:82,showEdition:true,textPanel:'auto'};
}
export function coverCompositionTitleX(composition: StoryCoverComposition): number {
  return Math.max(composition.titleWidth/2+5,Math.min(95-composition.titleWidth/2,composition.titleX));
}
export function updateCoverComposition(cover: StoryCover, patch: Partial<StoryCoverComposition>): StoryCover {
  const composition={...(cover.composition??defaultCoverComposition(cover)),...patch};
  if(!isStoryCoverComposition(composition)) throw new RangeError('표지 자유 배치 값이 올바르지 않아요.');
  return {...cover,composition:{...composition,titleX:coverCompositionTitleX(composition)}};
}
export function applyCoverPreset(cover: StoryCover, id: CoverPresetId): StoryCover {
  const layout=COVER_PRESET_OPTIONS.find(option=>option.id===id)?.layout;
  if(!layout) throw new RangeError('표지 디자인을 확인해 주세요.');
  const {composition: _composition,presetId: _preset,...content}=cover; void _composition;void _preset;
  const settings:Partial<StoryCover>=layout==='classic'?{titlePosition:'top',align:'center',titleSize:36,font:'serif',authorPosition:'bottom'}:layout==='picture'?{titlePosition:'bottom',align:'left',titleSize:32,font:'sans',authorPosition:'under-title'}:{titlePosition:'top',align:'center',titleSize:44,font:'sans',authorPosition:'bottom'};
  const next:StoryCover={...content,...settings,layout,presetId:id};
  if(layout==='classic') return id==='oval'?{...next,theme:'cream'}:next;
  if(id==='letter') return {...next,theme:'cream',font:'handwriting',titlePosition:'top'};
  if(id==='starlight'||id==='poster') return {...next,theme:id==='starlight'?'night':next.theme,font:id==='poster'?'rounded':'serif',titlePosition:'top'};
  return next;
}
export function coverTextPanel(color: string): string {
  const [r,g,b]=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);
  return .2126*r+.7152*g+.0722*b>.179?'#111111':'#ffffff';
}
export function coverTitleSize(title: string, chosenSize: number): number {
  return Math.min(chosenSize,Math.max(14,chosenSize/36*135/Math.sqrt(Math.max(1,Array.from(title).length))));
}
export function coverElementText(element: Pick<CoverTextElement,'content'>, context: CoverTextContext): string {
  if('text' in element.content) return element.content.text;
  return {'project.title':context.title,'project.description':context.description,'cover.author':context.author,'cover.subtitle':context.subtitle,'cover.authorNote':context.authorNote}[element.content.bind];
}
export function coverElementBox(element: {box: CoverBox; type: string; region?: string}): CoverBox {
  return element.type==='text'&&element.region==='band'?{...element.box,y:COVER_BAND.top+element.box.y*COVER_BAND.height,h:element.box.h*COVER_BAND.height}:{...element.box};
}
export function coverImageGeometry(image: Pick<CoverImageElement,'crop'>, natural: {width:number;height:number}, frame: {width:number;height:number}) {
  const {width:nw,height:nh}=natural,{width:fw,height:fh}=frame;
  if(![nw,nh,fw,fh].every(n=>Number.isFinite(n)&&n>0)) return undefined;
  const scale=(image.crop.fit==='cover'?Math.max(fw/nw,fh/nh):Math.min(fw/nw,fh/nh))*image.crop.zoom;
  const width=nw*scale,height=nh*scale;
  return {width,height,left:(fw-width)*image.crop.x/100,top:(fh-height)*image.crop.y/100};
}
function coverAsset(id:string,type:'background'|'character') { const asset=resolveAsset(id);return asset?.type===type?asset:undefined; }
/** Basic covers reserve paper for the whole copy group and a separate illustration inset.
 * Free compositions and layered designs own their coordinates and bypass these templates. */
function builtInCoverBoxes(cover:StoryCover):{titleBox:CoverBox;artBox:CoverBox} {
  const position=cover.titlePosition;
  const titleY=position==='top'?.12:position==='middle'?.35:.63;
  const artY=position==='top'?.38:position==='middle'?.08:.10;
  const artHeight=position==='top'?.48:position==='middle'?.23:.49;
  return {titleBox:{x:.11,y:titleY,w:.80,h:.23},artBox:{x:.11,y:artY,w:.80,h:artHeight}};
}
/** Canonical static cover model shared by shelf, preparation preview and start screen. */
export function resolveBookCover(project: StoryProject, face: CoverFaceId='front') {
  const cover=resolveStoryCover(project),theme=COVER_THEMES[cover.theme],composition=cover.composition;
  const title=project.title||'제목을 기다리는 이야기';
  const context={title,description:project.description,author:cover.author,subtitle:cover.subtitle,authorNote:cover.authorNote};
  const template=builtInCoverBoxes(cover);
  const artBox:CoverBox=composition?{x:0,y:0,w:1,h:1}:template.artBox;
  const width=composition?Math.min(80*composition.characterScale,90):80;
  const x=composition?Math.max(5+width/2,Math.min(95-width/2,composition.characterX)):cover.characterPosition==='left'?44:cover.characterPosition==='right'?56:50;
  const bottom=composition?composition.characterBottom:cover.layout==='picture'?(cover.titlePosition==='bottom'?32:cover.titlePosition==='top'?14:20):0;
  const height=composition?Math.min(72*composition.characterScale,95-bottom):cover.layout==='picture'?(cover.titlePosition==='bottom'?60:cover.titlePosition==='top'?48:75):90;
  const actorBox:CoverBox={x:(x-width/2)/100,y:(100-bottom-height)/100,w:width/100,h:height/100};
  const titleWidth=composition?.titleWidth??82,titleX=composition?coverCompositionTitleX(composition):51;
  const titleY=composition?.titleY??(cover.titlePosition==='top'?12:cover.titlePosition==='middle'?35:55);
  const titleBox:CoverBox=composition?{x:(titleX-titleWidth/2)/100,y:titleY/100,w:titleWidth/100,h:(94-titleY)/100}:template.titleBox;
  const ink=cover.titleColor||(cover.layout==='classic'?theme.accent:theme.ink);
  const design=cover.design;
  return {mode:design?'layers' as const:'legacy' as const,face,cover,preset:design?.faces[face].preset??cover.presetId??cover.layout,
    context,title,theme,ink,panel:cover.titleColor?coverTextPanel(ink):theme.paper,
    titleSize:coverTitleSize(title,cover.titleSize)/3.6*(composition?Math.sqrt(composition.titleWidth/82):1),
    artBox,actorBox,titleBox,background:coverAsset(cover.backgroundId,'background'),character:coverAsset(cover.characterId,'character'),
    elements:design?.faces[face].elements.filter(e=>e.type!=='text'||e.region!=='band'||design.band.enabled)??[]};
}
