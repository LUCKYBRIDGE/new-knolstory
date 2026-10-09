import type {CoverElement, StoryCover, StoryCoverComposition} from '@knolstory/story-domain';
import {COVER_BAND, coverCompositionTitleX} from './book-cover';

export type CompositionAction = 'title'|'character'|'width'|'scale'|'background'|'zoom';
export type CoverDraft = Readonly<{cover:StoryCover; title:string}>;
export type CoverDraftHistory = Readonly<{past:CoverDraft[]; present:CoverDraft; future:CoverDraft[]}>;
const clamp = (value:number, min:number, max:number) => Math.max(min, Math.min(max,value));

/** Adapted from fixed story-maker@18da4fc story-cover-canvas; deltas start at pointerdown. */
export function changeCoverComposition(start:StoryCoverComposition, action:CompositionAction, dx:number, dy:number):Partial<StoryCoverComposition> {
  if (![dx,dy].every(Number.isFinite)) return {};
  if(action==='title') return {titleX:coverCompositionTitleX({...start,titleX:start.titleX+dx}),titleY:clamp(start.titleY+dy,5,70)};
  if(action==='width') {
    const titleWidth=clamp(start.titleWidth+dx*2,50,90);
    return {titleWidth,titleX:coverCompositionTitleX({...start,titleWidth})};
  }
  if(action==='background') return {backgroundX:clamp(start.backgroundX-dx,0,100),backgroundY:clamp(start.backgroundY-dy,0,100)};
  if(action==='zoom') return {backgroundZoom:clamp(start.backgroundZoom+dx/100,1,1.6)};
  if(action==='scale') return {characterScale:clamp(start.characterScale+dx/80,.5,1.3)};
  const width=Math.min(80*start.characterScale,90);
  return {characterX:clamp(start.characterX+dx,Math.max(15,5+width/2),Math.min(85,95-width/2)),characterBottom:clamp(start.characterBottom-dy,0,35)};
}

/** Layer coordinates are normalized to their region; band movement uses its own height. */
export function changeLayerBox(item:CoverElement, action:'move'|'resize', dx:number, dy:number):CoverElement['box'] {
  if(![dx,dy].every(Number.isFinite)) return {...item.box};
  const vertical=item.type==='text'&&item.region==='band'?dy/COVER_BAND.height:dy;
  const box=item.box;
  if(action==='resize')return {...box,w:clamp(box.w+dx,.02,1-box.x),h:clamp(box.h+vertical,.02,1-box.y)};
  return {...box,x:clamp(box.x+dx,0,1-box.w),y:clamp(box.y+vertical,0,1-box.h)};
}

export function commitCoverDraft(history:CoverDraftHistory, next:CoverDraft):CoverDraftHistory {
  if(JSON.stringify(history.present)===JSON.stringify(next))return history;
  return {past:[...history.past,history.present].slice(-40),present:next,future:[]};
}
export function undoCoverDraft(history:CoverDraftHistory):CoverDraftHistory {
  return history.past.length?{past:history.past.slice(0,-1),present:history.past.at(-1)!,future:[history.present,...history.future]}:history;
}
export function redoCoverDraft(history:CoverDraftHistory):CoverDraftHistory {
  return history.future.length?{past:[...history.past,history.present],present:history.future[0],future:history.future.slice(1)}:history;
}
