import {isStoryMusicCue,type StoryMusicCue,type StoryMusicSequence,type StoryMusicSequenceClip} from '@knolstory/story-domain';
type Play=Extract<StoryMusicCue,{action:'play'}>;
function checked(value:StoryMusicSequence):StoryMusicSequence{if(!isStoryMusicCue(value))throw new Error('소리 순서와 각 소리의 사용 구간을 확인해 주세요.');return value;}
function selected(value:StoryMusicSequence,id:string){checked(value);const index=value.clips.findIndex(clip=>clip.id===id);if(index<0)throw new Error('편집할 소리를 다시 선택해 주세요.');return index;}
function capacity(value:StoryMusicSequence){checked(value);if(value.clips.length>=16)throw new Error('소리는 최대 16개까지 이어 붙일 수 있어요. 하나를 삭제한 뒤 다시 시도해 주세요.');}
/** Conversion is explicit: a scalar looping cue becomes one finite, one-pass clip. */
export function convertMusicToSequence(cue:Play,id:string,clipId:string,durationMs?:number):StoryMusicSequence{
 if(!isStoryMusicCue(cue))throw new Error('기존 소리 설정을 먼저 확인해 주세요.');
 const end=cue.sourceEndMs??durationMs,start=cue.sourceStartMs??0;
 if(end===undefined)throw new Error('원본 사용 끝을 먼저 정한 뒤 여러 소리 편집을 열어 주세요.');
 if(durationMs!==undefined&&(!Number.isInteger(durationMs)||durationMs<=0||durationMs>86400000||end>durationMs||start>=durationMs))throw new Error('원본 길이에 맞게 사용 구간을 먼저 수정해 주세요.');
 const {action: _action,loop: _loop,endLineId,branchCondition,...fields}=cue;
 return checked({action:'sequence',id,clips:[{...fields,id:clipId,sourceEndMs:end}],...(endLineId!==undefined?{endLineId}:{}),...(branchCondition!==undefined?{branchCondition}:{})});
}
export function appendMusicSequenceClip(value:StoryMusicSequence,clip:StoryMusicSequenceClip):StoryMusicSequence{capacity(value);return checked({...value,clips:[...value.clips,{...clip}]});}
export function updateMusicSequenceClip(value:StoryMusicSequence,id:string,patch:Partial<Omit<StoryMusicSequenceClip,'id'>>):StoryMusicSequence{const index=selected(value,id);return checked({...value,clips:value.clips.map((clip,i)=>i===index?{...clip,...patch}:clip)});}
export function moveMusicSequenceClip(value:StoryMusicSequence,id:string,direction:-1|1):StoryMusicSequence{const index=selected(value,id),target=index+direction;if(target<0||target>=value.clips.length)throw new Error('이 순서로는 이동할 수 없어요.');return checked({...value,clips:value.clips.map((clip,i)=>i===index?value.clips[target]:i===target?value.clips[index]:clip)});}
export function deleteMusicSequenceClip(value:StoryMusicSequence,id:string):StoryMusicSequence{selected(value,id);if(value.clips.length===1)throw new Error('소리는 하나 이상 있어야 해요. 동작을 바꾸려면 위의 소리 동작을 선택해 주세요.');return checked({...value,clips:value.clips.filter(clip=>clip.id!==id)});}
/** Keep fades at the original outer boundaries; do not add fades at the new join. */
export function splitMusicSequenceClip(value:StoryMusicSequence,id:string,sourceMs:number,newId:string):StoryMusicSequence{
 capacity(value);const index=selected(value,id),clip=value.clips[index];
 if(!Number.isInteger(sourceMs)||sourceMs<=(clip.sourceStartMs??0)||sourceMs>=clip.sourceEndMs)throw new Error('나눌 위치는 원본 사용 시작과 끝 사이여야 해요.');
 const {fadeOutMs: _out,...left}=clip,{fadeInMs: _in,...right}=clip;
 return checked({...value,clips:[...value.clips.slice(0,index),{...left,sourceEndMs:sourceMs},{...right,id:newId,sourceStartMs:sourceMs},...value.clips.slice(index+1)]});
}
