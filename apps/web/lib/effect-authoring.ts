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
 const starts=effects.map((_,index)=>effects.slice(0,index).reduce((sum,effect)=>sum+effectDurationMs(effect),0));
 if(starts.some(start=>start>10000))return null;
 return effects.map((effect,index)=>({...effect,trigger:'scene-enter',delayMs:starts[index]}));
}
