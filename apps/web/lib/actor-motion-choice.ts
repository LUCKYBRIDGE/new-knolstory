import type {StageActorEntry} from '@knolstory/story-domain';
type Motion=NonNullable<StageActorEntry['motion']>;
/** Choosing a kind never rewrites previously authored timing or movement origin. */
export function actorMotionChoice(current:Motion|undefined,type:Motion['type']|''):Motion|undefined{
 return type?current?{...current,type}:{type,durationMs:600,delayMs:0}:undefined;
}

export const ACTOR_MOTION_OPTIONS = [
 {value:'',label:'바로 표시'},
 {value:'fade-in',label:'서서히 등장'},
 {value:'fade-out',label:'서서히 퇴장'},
 {value:'move',label:'지정 위치에서 이동'},
 {value:'exit-left',label:'왼쪽으로 퇴장'},
 {value:'exit-right',label:'오른쪽으로 퇴장'},
] as const satisfies readonly {value:Motion['type']|'';label:string}[];
