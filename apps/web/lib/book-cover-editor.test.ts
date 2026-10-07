import { describe, expect, it } from 'vitest';
import { DEFAULT_COVER } from '@knolstory/story-domain';
import { addCoverElement, createCoverDesign, editCoverBox, patchCoverElement, removeCoverElement, reorderCoverElement, selectCoverFacePreset } from './book-cover-editor';

describe('cover draft editing', () => {
  it('creates a valid three-face design with bound story text', () => {
    const design=createCoverDesign(DEFAULT_COVER);
    expect(design.faces.front.elements.some(e=>e.type==='text'&&'bind' in e.content&&e.content.bind==='project.title')).toBe(true);
    expect(Object.keys(design.faces)).toEqual(['front','spine','back']);
  });
  it('preserves independent copy and deleted elements when changing a face preset', () => {
    const original=createCoverDesign(DEFAULT_COVER);
    const edited=patchCoverElement(original,'front','front-title',{content:{text:'내 표지 제목'}});
    const removed=removeCoverElement(edited,'front','front-author');
    const next=selectCoverFacePreset(removed,'front','poster',DEFAULT_COVER);
    expect(next.faces.front.elements.find(e=>e.id==='front-title')).toMatchObject({content:{text:'내 표지 제목'}});
    expect(next.faces.front.elements.some(e=>e.id==='front-author')).toBe(false);
    expect(next.faces.back).toBe(removed.faces.back);
    expect(original.faces.front.elements.find(e=>e.id==='front-title')).toMatchObject({content:{bind:'project.title'}});
  });
  it('clamps boxes to the face and rejects nonfinite input without moving it', () => {
    expect(editCoverBox({x:.1,y:.2,w:.5,h:.5},'x',100)).toEqual({x:.5,y:.2,w:.5,h:.5});
    expect(editCoverBox({x:.1,y:.2,w:.5,h:.5},'w',-10).w).toBe(.02);
    expect(editCoverBox({x:.1,y:.2,w:.5,h:.5},'x',NaN).x).toBe(.1);
  });
  it('validates text, duplicate ids, image ranges and per-face limits', () => {
    const design=createCoverDesign(DEFAULT_COVER), title=design.faces.front.elements[0];
    expect(()=>addCoverElement(design,'front',title)).toThrow();
    expect(()=>patchCoverElement(design,'front',title.id,{content:{text:'가'.repeat(501)}})).toThrow();
    expect(()=>patchCoverElement(design,'front',title.id,{style:{fontSize:NaN}})).toThrow();
    let next=design;
    for(let n=next.faces.front.elements.filter(e=>e.type==='text').length;n<12;n++) next=addCoverElement(next,'front',{...title,id:`added-${n}`});
    expect(()=>addCoverElement(next,'front',{...title,id:'overflow'})).toThrow();
  });
  it('reorders only the chosen face and preserves every element', () => {
    const design=createCoverDesign(DEFAULT_COVER), first=design.faces.front.elements[0];
    const next=reorderCoverElement(design,'front',first.id,1);
    expect(next.faces.front.elements[1]).toBe(first);
    expect(next.faces.back).toBe(design.faces.back);
    expect(next.faces.front.elements).toHaveLength(design.faces.front.elements.length);
  });
});
