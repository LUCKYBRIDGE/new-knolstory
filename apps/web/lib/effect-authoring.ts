import type {StoryEffectCue,StoryPresentation} from '@knolstory/story-domain';

/** Restore only the controls' fields, retaining absence and any unrelated edits. */
export function undoEffectEdit(current:StoryPresentation|undefined,previous:StoryPresentation|undefined):StoryPresentation|undefined {
 const retained=Object.fromEntries(Object.entries(current??{}).filter(([field])=>!['effects','clearFollowingEffects'].includes(field)));
 const restored={...retained,...(previous&&'effects' in previous?{effects:previous.effects}:{}),...(previous&&'clearFollowingEffects' in previous?{clearFollowingEffects:previous.clearFollowingEffects}:{})};
 return previous===undefined&&Object.keys(restored).length===0?undefined:restored;
}

/** Match native playback defaults without rewriting existing authored cues. */
export function effectDurationMs(effect:StoryEffectCue):number {
 return effect.durationMs??(effect.type==='shake'?600:effect.type==='crack'||effect.type==='screen-crack'?1800:800);
}

export function moveEffect(effects:StoryEffectCue[],index:number,direction:-1|1):StoryEffectCue[] {
 const destination=index+direction;
 if(index<0||index>=effects.length||destination<0||destination>=effects.length)return [...effects];
 return effects.map((effect,position)=>position===index?effects[destination]:position===destination?effects[index]:effect);
}

/** Authors opt into timing changes. Reordering alone keeps existing concurrency. */
export function arrangeEffectsSequentially(effects:StoryEffectCue[]):StoryEffectCue[]|null {
 if(effects.slice(0,-1).some(effect=>effect.repeat==='loop'))return null;
 const starts=effects.map((_,index)=>effects.slice(0,index).reduce((sum,effect)=>sum+effectDurationMs(effect),0));
 if(starts.some(start=>start>10000))return null;
 return effects.map((effect,index)=>({...withoutClickStep(effect),trigger:'scene-enter',delayMs:starts[index]}));
}

function withoutClickStep(effect:StoryEffectCue):Omit<StoryEffectCue,'clickStep'> {
 return Object.fromEntries(Object.entries(effect).filter(([key])=>key!=='clickStep')) as Omit<StoryEffectCue,'clickStep'>;
}

/** Missing stages count click-triggered effects only, matching native scheduling. */
export function effectClickStep(effects:readonly StoryEffectCue[],index:number):number|undefined {
 if(!validEffectIndex(effects,index)||effects[index].trigger!=='on-click')return undefined;
 return effects[index].clickStep??effects.slice(0,index+1).filter(effect=>effect.trigger==='on-click').length;
}

function effectClock(effects:readonly StoryEffectCue[],index:number):string {
 const effect=effects[index];
 return effect.trigger==='on-click'?`on-click:${effectClickStep(effects,index)}`:effect.trigger==='with-dialogue'?'with-dialogue':'scene-enter';
}

function effectStartMs(effect:StoryEffectCue):number {
 return effect.delayMs??(effect.trigger==='after-delay'?1000:0);
}

function validEffectIndex(effects:readonly StoryEffectCue[],index:number):boolean {
 return Number.isInteger(index)&&index>=0&&index<effects.length;
}

/** An explicit timing edit, not a persistent dependency on the previous cue. */
export function alignEffectStart(effects:readonly StoryEffectCue[],index:number,mode:'with-previous'|'after-previous'):StoryEffectCue[]|null {
 if(!validEffectIndex(effects,index)||index===0)return null;
 const previous=effects[index-1];
 if(mode==='after-previous'&&previous.repeat==='loop')return null;
 const delayMs=effectStartMs(previous)+(mode==='after-previous'?effectDurationMs(previous):0);
 if(!Number.isFinite(delayMs)||delayMs<0||delayMs>10000)return null;
 const trigger=previous.trigger==='on-click'?'on-click':previous.trigger==='with-dialogue'?'with-dialogue':'scene-enter';
 return effects.map((effect,position)=>position===index?{...withoutClickStep(effect),trigger,...(trigger==='on-click'?{clickStep:effectClickStep(effects,index-1)}:{}),delayMs}:effect);
}

/** Move a cue to a guide without changing its trigger clock or duration. */
export function alignEffectToGuide(effects:readonly StoryEffectCue[],index:number,guideMs:number,edge:'start'|'end'):StoryEffectCue[]|null {
 if(!validEffectIndex(effects,index)||!Number.isFinite(guideMs)||guideMs<0||guideMs>10000)return null;
 const selected=effects[index];
 if(edge==='end'&&selected.repeat==='loop')return null;
 const delayMs=guideMs-(edge==='end'?effectDurationMs(selected):0);
 if(!Number.isFinite(delayMs)||delayMs<0||delayMs>10000)return null;
 return effects.map((effect,position)=>position===index?{...effect,delayMs}:effect);
}

/** Display and snapping share these marks so their timing interpretation agrees. */
export function effectStartGuides(effects:readonly StoryEffectCue[],index:number):readonly number[] {
 if(!validEffectIndex(effects,index))return [];
 const clock=effectClock(effects,index);
 const marks=effects.flatMap((effect,position)=>{
  if(position===index||effectClock(effects,position)!==clock)return [];
  const start=effectStartMs(effect);
  return effect.repeat==='loop'?[start]:[start,start+effectDurationMs(effect)];
 });
 return [...new Set([0,...marks].filter(mark=>Number.isFinite(mark)&&mark>=0&&mark<=10000))].sort((a,b)=>a-b);
}

/** Snap to the nearest guide; equal distances prefer the earlier mark. */
export function snapEffectStart(effects:readonly StoryEffectCue[],index:number,requestedMs:number,toleranceMs=120,customGuides:readonly number[]=[]):{delayMs:number;guideMs?:number}|null {
 if(!validEffectIndex(effects,index)||!Number.isFinite(requestedMs)||requestedMs<0||requestedMs>10000||!Number.isFinite(toleranceMs)||toleranceMs<0)return null;
 const guides=[...new Set([...effectStartGuides(effects,index),...customGuides].filter(mark=>Number.isFinite(mark)&&mark>=0&&mark<=10000))].sort((a,b)=>a-b);
 const nearest=guides.reduce((best,mark)=>Math.abs(mark-requestedMs)<Math.abs(best-requestedMs)?mark:best,0);
 return Math.abs(nearest-requestedMs)<=toleranceMs?{delayMs:nearest,guideMs:nearest}:{delayMs:requestedMs};
}
