import type {RuntimeScene} from '@knolstory/runtime-contract';
/** Resizing and document revisions preserve an already confirmed entrance. */
export function presentationPhase<T extends Pick<RuntimeScene,'sceneId'|'presentationEntry'|'mode'>>(scene:T):string {
 return JSON.stringify([scene.sceneId,scene.presentationEntry??null,scene.mode??'edit']);
}
