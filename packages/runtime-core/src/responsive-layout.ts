import type { Point, Rect } from '@knolstory/runtime-contract';
export type StoryViewportSize = Readonly<{ width: number; height: number }>;
/** Host chrome in actual display pixels, never saved in StoryDocument. */
export type DialogueDock = Readonly<{bottomInsetPx:number;safeBottomPx?:number}>;
function validSize(size: StoryViewportSize) {
  return Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0;
}
/** Two fixed stage shapes, contained without reframing the artwork. */
export function resolveStoryViewport(viewport: StoryViewportSize, display:StoryViewportSize=viewport, dock?:DialogueDock) {
  if (!validSize(viewport) || !validSize(display)) throw new RangeError('Story viewport dimensions must be finite and positive.');
  if (!isSupportedStoryViewportSize(viewport)) throw new RangeError('Story viewport ratio is outside the supported display range.');
  const portrait = viewport.width < viewport.height;
  const width = portrait ? 720 : 1280;
  const height = portrait ? 1280 : 720;
  const scale = Math.min(display.width/width,display.height/height);
  const fontSize = 32;
  const margin = dock ? 0 : (portrait ? 24 : 48);
  const naturalBoxHeight = Math.max(Math.round(height * (portrait ? .30 : .2416666667)), Math.ceil(fontSize * 3.5 + 48));
  const reserve=dock ? dock.bottomInsetPx+(dock.safeBottomPx??8) : 0;
  if(dock && (!Number.isFinite(dock.bottomInsetPx)||dock.bottomInsetPx<0||!Number.isFinite(dock.safeBottomPx??8)||(dock.safeBottomPx??8)<0||reserve>display.height*.4))
    throw new RangeError('Dialogue dock reserve must fit the display.');
  // Native text metrics determine the final panel height. This deterministic estimate
  // reserves body, speaker, navigation and tools inside an overlay, never actor space.
  const speakerFontSize = 24;
  const padding = portrait ? 28 : 48;
  const displayToolsHeight = Math.min(512, Math.max(44, Math.ceil(44 / scale)));
  const toolsHeight = Math.max(displayToolsHeight, Math.ceil(fontSize * 2.6), reserve / scale);
  const panelHeight = Math.ceil(32 + speakerFontSize * 1.4 + fontSize * 1.55
    + fontSize * .8 + toolsHeight);
  const boxHeight=dock ? Math.min(height, panelHeight) : naturalBoxHeight;
  const textboxRect = { x: margin, y: dock ? height-boxHeight : Math.min(Math.round(height * (portrait ? .66 : .7083333333)), height - Math.round(height * .05) - boxHeight),
    width: width - margin * 2, height: boxHeight };
  return { width, height, portrait, textboxRect,
    dialogueStyle: { fontSize, speakerFontSize, padding, paginationFontSize: 32, toolsHeight: displayToolsHeight },
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

/** Ignore transient collapsed containers; keep strict scene layout validation. */
export function isSupportedStoryViewportSize(size:StoryViewportSize):boolean {
 if(!validSize(size))return false;
 const width=size.width<size.height?720:1280;
 const height=Math.round(width*size.height/size.width);
 return height>=240&&height<=2400;
}
