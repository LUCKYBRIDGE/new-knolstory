import type {StageActorEntry} from '@knolstory/story-domain';
type Motion=NonNullable<StageActorEntry['motion']>;
/** Choosing a kind never rewrites previously authored timing or movement origin. */
export function actorMotionChoice(current:Motion|undefined,type:Motion['type']|''):Motion|undefined{
 return type?current?{...current,type}:{type,durationMs:600,delayMs:0}:undefined;
}
