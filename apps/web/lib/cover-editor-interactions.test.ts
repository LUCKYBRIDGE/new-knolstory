import {describe, expect, it} from 'vitest';
import {DEFAULT_COVER, isStoryCover} from '@knolstory/story-domain';
import {createCoverDesign, patchCoverElement} from './book-cover-editor';
import {defaultCoverComposition, updateCoverComposition} from './book-cover';
import {changeCoverComposition, changeLayerBox, commitCoverDraft, redoCoverDraft, undoCoverDraft} from './cover-editor-interactions';

describe('cover canvas gestures preserve authored drafts', () => {
  it('converts a drag from face coordinates into band coordinates without changing text', () => {
    const design = createCoverDesign(DEFAULT_COVER);
    const band = design.faces.front.elements.find(item => item.type === 'text' && item.region === 'band')!;
    const box = changeLayerBox(band, 'move', .05, .018);
    expect(box.x).toBeCloseTo(band.box.x + .05);
    expect(box.y).toBeCloseTo(band.box.y + .1);
    const next = patchCoverElement(design, 'front', band.id, {box});
    expect(next.faces.front.elements.find(item => item.id === band.id)).toEqual({...band, box});
    expect(next.faces.back).toBe(design.faces.back);
    expect(design.faces.front.elements.find(item => item.id === band.id)).toBe(band);
  });
  it('clamps moving and resizing inside the face and leaves invalid input alone', () => {
    const item = createCoverDesign(DEFAULT_COVER).faces.front.elements[0];
    expect(changeLayerBox(item, 'move', 100, -100)).toEqual({...item.box, x: 1-item.box.w, y: 0});
    const resized = changeLayerBox(item, 'resize', 100, -100);
    expect(resized.w).toBeCloseTo(1-item.box.x);
    expect(resized.h).toBe(.02);
    expect(changeLayerBox(item, 'move', NaN, 0)).toEqual(item.box);
  });
  it('keeps composition inside valid ranges for every direct action', () => {
    const start = defaultCoverComposition(DEFAULT_COVER);
    for (const action of ['title','width','character','scale','background','zoom'] as const) {
      for (const delta of [-1000,1000]) {
        const cover = updateCoverComposition(DEFAULT_COVER, changeCoverComposition(start, action, delta, delta));
        expect(isStoryCover(cover)).toBe(true);
      }
    }
    expect(changeCoverComposition(start, 'background', 10, -10)).toEqual({backgroundX:40,backgroundY:60});
    expect(changeCoverComposition(start, 'title', NaN, 0)).toEqual({});
    expect(start).toEqual(defaultCoverComposition(DEFAULT_COVER));
  });
  it('undoes a gesture as one draft operation including title, and discards redo after a new edit', () => {
    const initial = {cover:structuredClone(DEFAULT_COVER), title:'원래 제목'};
    const original = {past:[], present:initial, future:[]};
    const changed = {...initial, title:'새 제목', cover:{...initial.cover, author:'새 지은이'}};
    const history = commitCoverDraft(original, changed);
    expect(undoCoverDraft(history).present).toEqual(initial);
    expect(redoCoverDraft(undoCoverDraft(history)).present).toEqual(changed);
    expect(commitCoverDraft(undoCoverDraft(history), {...initial,title:'다른 제목'}).future).toEqual([]);
    expect(original.present).toEqual(initial);
    expect(commitCoverDraft(history, structuredClone(changed))).toBe(history);
  });
});
