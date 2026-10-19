import type {StageActorEntry,StoryActorOverride} from '@knolstory/story-domain';
/** Appearance applies to the side group; legacy placement overrides remain first-actor-only. */
export function mergeActorOverride(actor:StageActorEntry,index:number,side?:StoryActorOverride):StageActorEntry&Omit<StoryActorOverride,'facing'> {
 const appearance=side?{opacity:side.opacity,emphasis:side.emphasis,spectral:side.spectral}:undefined;
 return {...(index===0?side:undefined),...appearance,...actor};
}
