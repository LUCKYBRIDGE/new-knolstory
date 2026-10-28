import {isStoryAudio,type StorySoundCue} from '@knolstory/story-domain';
/** Split source references, not media bytes. Existing cue identity belongs to the first piece. */
export function splitSoundCue(sounds:readonly StorySoundCue[],selectedId:string,sourceMs:number,newId:string,durationMs?:number):StorySoundCue[]{
 if(!isStoryAudio({sounds:[...sounds]}))throw new Error('효과음 설정을 먼저 확인해 주세요.');
 if(sounds.length>=4)throw new Error('효과음은 최대 4개예요. 하나를 삭제한 뒤 나눠 주세요.');
 const index=sounds.findIndex(cue=>cue.id===selectedId),cue=sounds[index];
 if(!cue)throw new Error('나눌 효과음을 다시 선택해 주세요.');
 if(!newId.trim()||newId.length>200||sounds.some(cue=>cue.id===newId))throw new Error('새 효과음을 구분하지 못했어요. 다시 시도해 주세요.');
 const start=cue.sourceStartMs??0,end=cue.sourceEndMs??durationMs;
 if(end===undefined)throw new Error('원본 사용 끝을 먼저 정한 뒤 나눠 주세요.');
 if(durationMs!==undefined&&(!Number.isInteger(durationMs)||durationMs<=0||end>durationMs||start>=durationMs))throw new Error('원본 길이에 맞게 사용 구간을 먼저 수정해 주세요.');
 if(!Number.isInteger(sourceMs)||sourceMs<=start||sourceMs>=end)throw new Error('나눌 위치는 원본 사용 시작과 끝 사이여야 해요.');
 const delayMs=(cue.delayMs??0)+sourceMs-start;
 if(delayMs>10000)throw new Error('뒤 조각의 재생 대기가 10초를 넘어요. 더 앞의 위치에서 나눠 주세요.');
 const result=[...sounds.slice(0,index),{...cue,sourceEndMs:sourceMs},{...cue,id:newId,sourceStartMs:sourceMs,delayMs},...sounds.slice(index+1)];
 if(!isStoryAudio({sounds:result}))throw new Error('나눌 위치와 효과음 설정을 확인해 주세요.');
 return result;
}
