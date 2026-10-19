import type {RuntimeScene} from '@knolstory/runtime-contract';
import {presentationPhase} from './presentation-phase';

/** Automatic reading waits for this scene's native acknowledgement and entrance. */
export function readerPresentationReady(scene:RuntimeScene, rendered:number, confirmed:string|null, audioPending:boolean, failed:boolean):boolean {
  return scene.mode==='play' && rendered===scene.revision && !audioPending && !failed &&
    (!scene.presentation?.transition || confirmed===presentationPhase(scene));
}
