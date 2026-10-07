import type { Point, Rect } from '@knolstory/runtime-contract';
export type StoryViewportSize = Readonly<{ width: number; height: number }>;
function validSize(size: StoryViewportSize) {
  return Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0;
}
/** Logical units follow the actual display ratio. Document placement stays in percentages. */
export function resolveStoryViewport(viewport: StoryViewportSize, display:StoryViewportSize=viewport) {
  if (!validSize(viewport) || !validSize(display)) throw new RangeError('Story viewport dimensions must be finite and positive.');
  const portrait = viewport.width < viewport.height;
  const width = portrait ? 720 : 1280;
  const height = Math.round(width * viewport.height / viewport.width);
  if (height < 240 || height > 2400) throw new RangeError('Story viewport ratio is outside the supported display range.');
  const scale = Math.min(display.width/width,display.height/height);
  const fontSize = Math.max(30, Math.min(64, Math.ceil(17 / scale)));
  const margin = portrait ? 24 : 48;
  const boxHeight = Math.max(Math.round(height * (portrait ? .30 : .2416666667)), Math.ceil(fontSize * 3.5 + 48));
  const textboxRect = { x: margin, y: Math.min(Math.round(height * (portrait ? .66 : .7083333333)), height - Math.round(height * .05) - boxHeight),
    width: width - margin * 2, height: boxHeight };
  return { width, height, portrait, textboxRect,
    dialogueStyle: { fontSize, speakerFontSize: Math.max(28, fontSize - 2), padding: 24 },
    actorBaseHeight: portrait ? height * .77 : height * .67,
    actorBaseline: portrait ? height * .85 : height * .775,
    actorHeadMargin: 8 };
}
/** Crop/contain is resolved once here; the presenter only draws the resulting rectangle. */
export function resolveBackgroundRect(source: StoryViewportSize, viewport: StoryViewportSize,
  fit: 'cover' | 'contain', focal: Point = { x: .5, y: .5 }): Rect {
  if (!validSize(source) || !validSize(viewport) || !Number.isFinite(focal.x) || !Number.isFinite(focal.y)
    || focal.x < 0 || focal.x > 1 || focal.y < 0 || focal.y > 1) throw new RangeError('Invalid background framing.');
  const scale = (fit === 'cover' ? Math.max : Math.min)(viewport.width / source.width, viewport.height / source.height);
  const width = source.width * scale, height = source.height * scale;
  // 0 and 1 expose opposite image edges; .5 keeps the original centered crop.
  return { x: (viewport.width - width) * focal.x, y: (viewport.height - height) * focal.y, width, height };
}
