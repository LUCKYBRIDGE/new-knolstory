import type {StageComposition,StoryActorOverride,StoryPresentation} from '@knolstory/story-domain';
export type AppearancePatch=Pick<StoryActorOverride,'opacity'|'emphasis'|'spectral'>;
export type ActorSide='left'|'right';
export function patchActorAppearance(value:StoryPresentation|undefined,side:ActorSide,patch:AppearancePatch):StoryPresentation {
 return {...value,actors:{...value?.actors,[side]:{...value?.actors?.[side],...patch}}};
}
export function resetActorAppearance(value:StoryPresentation|undefined,side:ActorSide):StoryPresentation {
 const group=value?.actors?.[side];
 if(!group)return {...value};
 const retained=Object.fromEntries(Object.entries(group).filter(([field])=>!['opacity','emphasis','spectral'].includes(field)));
 return {...value,actors:{...value?.actors,[side]:retained}};
}
export function opacityFromPercent(input:string):number|null {
 if(!input.trim())return null;
 const percent=Number(input);
 return Number.isFinite(percent)&&percent>=0&&percent<=100?percent/100:null;
}

/** Empty groups stay editable only when they have saved authored settings. */
export function appearanceTargets(stage:StageComposition|undefined,value:StoryPresentation|undefined):ActorSide[]{
 return (['left','right'] as const).filter(side=>!stage||stage[side==='left'?'leftActors':'rightActors'].length>0||Object.keys(value?.actors?.[side]??{}).length>0);
}
