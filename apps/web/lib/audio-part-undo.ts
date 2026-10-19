import type {StoryAudio} from '@knolstory/story-domain';
export type AudioPart='music'|'ambience'|'sounds';
/** Restore the edited channel only; later changes to other channels remain authored. */
export function restoreAudioPart(current:StoryAudio|undefined,before:StoryAudio|undefined,part:AudioPart):StoryAudio|undefined{
 const restored={...current,[part]:before?.[part]};
 return before===undefined&&Object.values(restored).every(value=>value===undefined)?undefined:restored;
}
