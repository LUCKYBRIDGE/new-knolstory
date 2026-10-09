import type {StageComposition} from '@knolstory/story-domain';
/** User-facing position stays distinct from the actor's persistent document identity. */
export function actorLabel(stage:StageComposition,key:string):string {
 const left=stage.leftActors.findIndex(actor=>actor.key===key);
 if(left>=0)return `왼쪽 ${left+1}번 인물`;
 const right=stage.rightActors.findIndex(actor=>actor.key===key);
 return right>=0?`오른쪽 ${right+1}번 인물`:'인물';
}
