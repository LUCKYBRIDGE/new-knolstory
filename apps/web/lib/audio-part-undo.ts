import type {StoryAudio} from '@knolstory/story-domain';
export type AudioPart='music'|'ambience'|'sounds';
/** Restore the edited channel only; later changes to other channels remain authored. */
export function restoreAudioPart(current:StoryAudio|undefined,before:StoryAudio|undefined,part:AudioPart):StoryAudio|undefined{
 const restored={...current,[part]:before?.[part]};
 return before===undefined&&Object.values(restored).every(value=>value===undefined)?undefined:restored;
}
/** Reject stale channel snapshots without discarding edits from another tool. */
export function restoreUnchangedAudioPart(current:StoryAudio|undefined,before:StoryAudio|undefined,after:StoryAudio|undefined,part:AudioPart):StoryAudio|undefined{
 const stable=(value:unknown)=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
 if(stable(current?.[part])!==stable(after?.[part]))throw Error('이후 소리가 바뀌어 이전 변경을 취소하지 않았어요. 현재 내용을 유지합니다.');
 return restoreAudioPart(current,before,part);
}
