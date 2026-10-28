import {backPlayback,compileStoryScene,type PlaybackState} from '@knolstory/runtime-core';
import type {StoryProject} from '@knolstory/story-domain';
type RewindResult=Readonly<{ok:true;playback:PlaybackState}|{ok:false;message:string;cause:unknown}>;

/** Reject the event before updating React state; Core remains the only interpreter. */
export function rewindReader(project:StoryProject,current:PlaybackState,revision:number):RewindResult{
 try{
  let playback=backPlayback(project,current);
  // Only Core classifies presentation-only cues; keep its path/choice rollback semantics.
  for (;;) {
   const lineId=playback.lineId??playback.path.at(-1);
   if(!lineId)throw Error('읽을 컷을 확인할 수 없습니다.');
   const scene=compileStoryScene(project,lineId,revision+1,{mode:'play',playbackPath:playback.path,playbackState:playback});
   if(!scene.transitionOnly)return {ok:true,playback};
   if(playback.path.length<=1)return {ok:true,playback:current};
   playback=backPlayback(project,playback);
  }
 }catch(cause){return {ok:false,cause,message:'이전 읽기 위치를 열지 못했어요. 현재 컷은 유지됩니다. 지난기록에서 이전 장을 고르거나 처음부터 읽어 주세요.'};}
}
