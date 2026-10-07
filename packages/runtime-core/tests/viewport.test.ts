import { describe, expect, it } from 'vitest';
import { compileScene, createInitialDraft, fitStage, moveActor, screenToStage, stageToScreen } from '../src/index';

describe('fixed logical stage in responsive viewport', () => {
  it('fits a landscape phone without stretching or cropping', () => {
    const viewport = fitStage({ width: 740, height: 320 });
    expect(viewport.scale).toBeCloseTo(320 / 720);
    expect(viewport.width).toBeCloseTo(1280 * 320 / 720);
    expect(viewport.offsetX).toBeCloseTo((740 - viewport.width) / 2);
    expect(viewport.offsetY).toBe(0);
  });

  it('preserves portrait margins and excludes letterbox from editing', () => {
    const viewport = fitStage({ width: 360, height: 400 });
    expect(viewport.height).toBe(202.5);
    expect(screenToStage({ x: 180, y: 10 }, viewport)).toBeNull();
    expect(screenToStage({ x: 180, y: 200 }, viewport)).toEqual({ x: 640, y: 360 });
  });

  it.each([{ width: 1280, height: 720 }, { width: 900, height: 700 }, { width: 360, height: 400 }])(
    'round-trips pointer positions at $width by $height', (size) => {
      const viewport = fitStage(size);
      const rect = stageToScreen({ x: 420, y: 280, width: 100, height: 80 }, viewport);
      expect(screenToStage({ x: rect.x, y: rect.y }, viewport)).toEqual({ x: 420, y: 280 });
      expect(rect.width).toBeCloseTo(100 * viewport.scale);
    },
  );

  it('uses CSS coordinates independently of physical pixel density', () => {
    const viewport = fitStage({ width: 640, height: 360 });
    expect(screenToStage({ x: 100, y: 120 }, viewport)).toEqual({ x: 200, y: 240 });
  });

  it.each([{ width: 0, height: 400 }, { width: 400, height: -1 }, { width: Infinity, height: 300 }])(
    'rejects unmeasurable containers', (size) => expect(() => fitStage(size)).toThrow(),
  );

  it('rejects invalid logical dimensions and pointers', () => {
    expect(() => fitStage({ width: 100, height: 100 }, { width: 0, height: 720 })).toThrow();
    expect(screenToStage({ x: NaN, y: 0 }, fitStage({ width: 640, height: 360 }))).toBeNull();
  });
});

describe('editing probe state', () => {
  it('updates actors immutably and keeps them inside the logical stage', () => {
    const draft = createInitialDraft();
    const before = structuredClone(draft);
    const next = moveActor(draft, draft.actors[0]!.id, { x: -40, y: 900 });
    expect(draft).toEqual(before);
    expect(next.actors[0]!.rect.x).toBe(0);
    expect(next.actors[0]!.rect.y + next.actors[0]!.rect.height).toBe(720);
    expect(next.actors[1]).toBe(draft.actors[1]);
  });

  it('does not silently lose text or re-run layout after viewport resizing', () => {
    const draft = { ...createInitialDraft(), text: '선녀가 말했습니다.\n우리 이야기를 시작해 볼까요?' };
    fitStage({ width: 360, height: 400 });
    fitStage({ width: 1000, height: 600 });
    const scene = compileScene(draft, 12);
    expect(scene.dialogue.text).toBe(draft.text);
    expect(scene.actors).toEqual(draft.actors);
    expect(scene.revision).toBe(12);
  });

  it('rejects unknown actors and invalid numeric input', () => {
    const draft = createInitialDraft();
    expect(() => moveActor(draft, 'missing', { x: 0, y: 0 })).toThrow();
    expect(() => moveActor(draft, draft.actors[0]!.id, { x: NaN, y: 0 })).toThrow();
    expect(() => compileScene(draft, -1)).toThrow();
  });
});
