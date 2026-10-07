import { isRuntimeAudio, type RuntimeAudio } from "./audio";
export * from "./audio";
/** Initial editing probe contract. This is not the final StoryDocument runtime schema. */
export type Point = Readonly<{ x: number; y: number }>;
export type Rect = Readonly<Point & { width: number; height: number }>;
export type RuntimeActor = Readonly<{ handle?:Point; id: string; name: string; rect: Rect; imagePath?: string;
  motion?:Readonly<{version:1;type:"fade-in"|"fade-out"|"move";offsetX:number;durationMs:number;delayMs:number}>;
  flipX?: boolean; opacity?: number; emphasis?: 'normal' | 'dim'; spectral?: boolean; depth?: number }>;
export type RuntimeEffect = Readonly<{ target?:Readonly<{kind:'screen'|'background'}|{kind:'actor';actorId:string}>; repeat?:'once'|'loop';periodMs?:number;originEntry?:string; id?: string; type: 'shake' | 'flash-red' | 'fade-black' | 'crack' | 'spotlight' | 'flash' | 'screen-crack';
  intensity?: 'soft' | 'normal' | 'strong'; trigger?: 'scene-enter' | 'with-dialogue' | 'after-delay'; delayMs?: number }>;
export type RuntimePresentation = Readonly<{ version?:2; effects?: readonly RuntimeEffect[];
  look?: Readonly<{ type: 'flashback' | 'fractured-reality'; intensity?: 'soft' | 'normal' | 'strong' }>;
  transition?: Readonly<{ type: 'fade-black' | 'white-fade' | 'dissolve' | 'perspective-blackout'; durationMs?: number;
    mode?: 'auto' | 'confirm'; cue?: string; title?: string; description?: string; actionLabel?: string }> }>;
export type RuntimeScene = Readonly<{
  contractVersion: 1; sceneId: string; revision: number;
  viewportVersion?: 1; textboxRect?: Rect;
  dialogueStyle?: Readonly<{fontSize:number;speakerFontSize:number;padding:number}>;
  width: number; height: number; actors: readonly RuntimeActor[];
  dialogue: Readonly<{ speaker: string; text: string }>;
  background?: Readonly<{ imagePath: string; fit?: 'contain' | 'cover'; rect?:Rect; focal?:Point }>;
  choices?: readonly Readonly<{ id: string; text: string }>[];
  presentationEntry?: string;
  audio?: RuntimeAudio;
  mode?: 'edit' | 'play'; ended?: boolean; reducedMotion?: boolean; presentation?: RuntimePresentation;
}>;
export type RuntimeEvent =
  | Readonly<{ protocol: 1; type: 'ready'; runtimeVersion: string; contractVersion: 1 }>
  | Readonly<{ protocol: 1; type: 'sceneRendered'; revision: number; sceneId: string;
      renderMs: number; rendererRect: Rect; textboxRect: Rect;
      engineLogicalSize?: Readonly<{width:number;height:number}>;
      audioState?: Readonly<{unlocked?:boolean;ambiencePath?:string|null;ambienceStartCount?:number;musicPath:string|null;musicPosition:number|null;musicStartCount:number;soundPlayCount:number;soundPaths?:readonly string[]}> }>
  | Readonly<{ protocol: 1; type: 'viewportChanged'; rendererRect: Rect }>
  | Readonly<{ protocol: 1; type: 'error'; message: string }>
  | Readonly<{ protocol: 1; type: 'advanceRequested' | 'presentationDone'; sceneId: string; revision: number }>
  | Readonly<{ protocol: 1; type: 'choiceSelected'; sceneId: string; revision: number; choiceId: string }>;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max;
}
function revision(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}
export function isRect(value: unknown): value is Rect {
  return record(value) && finite(value.x) && finite(value.y) && finite(value.width)
    && finite(value.height) && value.width > 0 && value.height > 0;
}
function optionalNumber(value: unknown, min: number, max: number): boolean {
  return value === undefined || finite(value) && value >= min && value <= max;
}
function optionalChoice(value: unknown, values: readonly unknown[]): boolean {
  return value === undefined || values.includes(value);
}
export function isRuntimeImagePath(value: unknown): value is string {
  return text(value, 500) && /^assets\/legacy-18da4fc\/[a-zA-Z0-9._-]+\.(webp|png|jpg|jpeg)$/.test(value);
}
export function isRuntimePresentation(value: unknown): value is RuntimePresentation {
  if (!record(value)) return false;
  if(value.version!==undefined && value.version!==2)return false;
  const intensity = (v: unknown) => optionalChoice(v, ['soft', 'normal', 'strong']);
  if (value.effects !== undefined && (!Array.isArray(value.effects) || value.effects.length > 12
    || !value.effects.every(e => record(e) && ['shake', 'flash-red', 'fade-black', 'crack', 'spotlight', 'flash', 'screen-crack'].includes(e.type as string)
      && optionalChoice(e.repeat,['once','loop']) && optionalNumber(e.periodMs,400,10000) && (e.originEntry===undefined || text(e.originEntry,200)) && (e.target===undefined || record(e.target) && (['screen','background'].includes(e.target.kind as string) || e.target.kind==='actor' && text(e.target.actorId,200) && !!e.target.actorId)) && intensity(e.intensity) && optionalChoice(e.trigger, ['scene-enter', 'with-dialogue', 'after-delay'])
      && optionalNumber(e.delayMs, 0, 10000) && (e.id === undefined || text(e.id, 200))))) return false;
  if (value.look !== undefined && (!record(value.look) || !['flashback', 'fractured-reality'].includes(value.look.type as string)
    || !intensity(value.look.intensity))) return false;
  if (value.transition !== undefined) {
    const t = value.transition;
    if (!record(t) || !['fade-black', 'white-fade', 'dissolve', 'perspective-blackout'].includes(t.type as string)
      || !optionalNumber(t.durationMs, 0, 10000) || !optionalChoice(t.mode, ['auto', 'confirm'])
      || !['cue', 'title', 'description', 'actionLabel'].every(k => t[k] === undefined || text(t[k], 2000))) return false;
  }
  return true;
}
function sceneExtras(value: Record<string, unknown>): boolean {
  if(value.viewportVersion !== undefined && value.viewportVersion !== 1)return false;
  if(value.textboxRect !== undefined && !isRect(value.textboxRect))return false;
  if(value.dialogueStyle !== undefined && (!record(value.dialogueStyle) || !finite(value.dialogueStyle.fontSize) || !optionalNumber(value.dialogueStyle.fontSize,16,96) || !finite(value.dialogueStyle.speakerFontSize) || !optionalNumber(value.dialogueStyle.speakerFontSize,16,96) || !finite(value.dialogueStyle.padding) || !optionalNumber(value.dialogueStyle.padding,0,64)))return false;
  if(value.presentationEntry !== undefined && (!text(value.presentationEntry,200)||!value.presentationEntry))return false;
  if(value.audio !== undefined && !isRuntimeAudio(value.audio))return false;
  if (!optionalChoice(value.mode, ['edit', 'play']) || !optionalChoice(value.ended, [true, false]) || !optionalChoice(value.reducedMotion, [true, false])) return false;
  if (value.background !== undefined && (!record(value.background) || !isRuntimeImagePath(value.background.imagePath)
    || !optionalChoice(value.background.fit, ['contain', 'cover']) || value.background.rect !== undefined && !isRect(value.background.rect)
    || value.background.focal !== undefined && (!record(value.background.focal) || !finite(value.background.focal.x) || !finite(value.background.focal.y) || !optionalNumber(value.background.focal.x,0,1) || !optionalNumber(value.background.focal.y,0,1)))) return false;
  if (value.presentation !== undefined && !isRuntimePresentation(value.presentation)) return false;
  if (value.choices !== undefined) {
    const choices = value.choices;
    if (!Array.isArray(choices) || choices.length > 4 || !choices.every(c => record(c) && text(c.id, 200) && !!c.id && text(c.text, 20000))) return false;
    if (new Set(choices.map(c => c.id)).size !== choices.length) return false;
  }
  return true;
}
export function isRuntimeScene(value: unknown): value is RuntimeScene {
  if (!record(value) || value.contractVersion !== 1 || !text(value.sceneId, 200)
    || !value.sceneId || !revision(value.revision) || !finite(value.width) || value.width <= 0
    || !finite(value.height) || value.height <= 0 || !Array.isArray(value.actors)
    || value.actors.length > 4 || !record(value.dialogue)
    || !text(value.dialogue.speaker, 200) || !text(value.dialogue.text, 20_000)) return false;
  const { width, height } = value;
  const actors = value.actors;
  const valid = actors.every((actor: unknown) => record(actor) && text(actor.id, 200) && !!actor.id
    && text(actor.name, 200) && isRect(actor.rect)
    && (actor.imagePath === undefined ? actor.rect.x >= 0 && actor.rect.y >= 0
      && actor.rect.x + actor.rect.width <= width && actor.rect.y + actor.rect.height <= height
      : isRuntimeImagePath(actor.imagePath) && actor.rect.x >= -width && actor.rect.y >= -height
        && actor.rect.width <= width * 3 && actor.rect.height <= height * 3 && actor.rect.x <= width * 2 && actor.rect.y <= height * 2)
    && (actor.motion===undefined || record(actor.motion) && actor.motion.version===1 && ['fade-in','fade-out','move'].includes(actor.motion.type as string) && finite(actor.motion.offsetX) && Math.abs(actor.motion.offsetX)<=width && optionalNumber(actor.motion.durationMs,0,10000) && actor.motion.durationMs!==undefined && optionalNumber(actor.motion.delayMs,0,10000) && actor.motion.delayMs!==undefined)
    && (actor.handle===undefined||record(actor.handle)&&finite(actor.handle.x)&&finite(actor.handle.y)&&actor.handle.x>=0&&actor.handle.x<=width&&actor.handle.y>=0&&actor.handle.y<=height)
    && optionalNumber(actor.opacity, 0, 1) && optionalNumber(actor.depth, 0, 4)
    && optionalChoice(actor.flipX, [true, false]) && optionalChoice(actor.spectral, [true, false])
    && optionalChoice(actor.emphasis, ['normal', 'dim']));
  return valid && sceneExtras(value) && new Set(actors.map((actor: RuntimeActor) => actor.id)).size === actors.length;
}
export function isRuntimeEvent(value: unknown): value is RuntimeEvent {
  if (!record(value) || value.protocol !== 1) return false;
  switch (value.type) {
    case 'ready': return value.contractVersion === 1 && text(value.runtimeVersion, 100) && !!value.runtimeVersion;
    case 'viewportChanged': return isRect(value.rendererRect);
    case 'error': return text(value.message, 2000);
    case 'choiceSelected': return text(value.choiceId, 200) && !!value.choiceId && text(value.sceneId, 200) && !!value.sceneId && revision(value.revision);
    case 'advanceRequested':
    case 'presentationDone': return text(value.sceneId, 200) && !!value.sceneId && revision(value.revision);
    case 'sceneRendered': return (value.engineLogicalSize === undefined || record(value.engineLogicalSize) && optionalNumber(value.engineLogicalSize.width, 1, 4096) && value.engineLogicalSize.width !== undefined && optionalNumber(value.engineLogicalSize.height, 1, 4096) && value.engineLogicalSize.height !== undefined) && (value.audioState === undefined || isRuntimeAudioState(value.audioState)) && revision(value.revision) && text(value.sceneId, 200) && !!value.sceneId
      && finite(value.renderMs) && value.renderMs >= 0 && isRect(value.textboxRect) && isRect(value.rendererRect);
    default: return false;
  }
}

function isRuntimeAudioState(v:unknown):boolean {
  return record(v) && (v.ambiencePath === undefined || v.ambiencePath === null || isRuntimeAudioPathForState(v.ambiencePath)) && (v.ambienceStartCount === undefined || revision(v.ambienceStartCount)) && optionalChoice(v.unlocked,[true,false]) && (v.soundPaths === undefined || Array.isArray(v.soundPaths) && v.soundPaths.length <= 8 && v.soundPaths.every(isRuntimeAudioPathForState)) && (v.musicPath === null || isRuntimeAudioPathForState(v.musicPath)) && (v.musicPosition === null || finite(v.musicPosition) && v.musicPosition>=0) && revision(v.musicStartCount) && revision(v.soundPlayCount);
}
function isRuntimeAudioPathForState(v:unknown):boolean { return typeof v === "string" && /^assets\/audio\/(?:story-score\/)?[a-zA-Z0-9_-][a-zA-Z0-9._-]*\.(wav|ogg|mp3)$/.test(v); }
