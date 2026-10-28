import type {StoryProject} from '@knolstory/story-domain';
import {jumpPlayback,playbackLog,type PlaybackLogEntry,type PlaybackState} from '@knolstory/runtime-core';

type PreviousChapter=Readonly<{chapterId:string;lineId:string;pathIndex:number}>;
export type ReaderChapterHistory=Readonly<{
 chapterId:string|null;
 entries:readonly PlaybackLogEntry[];
 previousChapters:readonly PreviousChapter[];
}>;

/** The latest continuous chapter visit is the script; older visits only offer real first-cut checkpoints. */
export function readerChapterHistory(project:StoryProject,state:PlaybackState,currentPage:Readonly<{lineId:string;endOffset:number}>|null=null):ReaderChapterHistory{
 const log=playbackLog(project,state,currentPage),chapterId=log.at(-1)?.chapterId??null;
 if(chapterId===null)return {chapterId:null,entries:[],previousChapters:[]};
 let start=log.length-1;
 while(start>0&&log[start-1]!.chapterId===chapterId)start-=1;
 const firstCuts=new Map(project.chapters.map(chapter=>[chapter.id,project.lines.filter(line=>line.chapterId===chapter.id).sort((a,b)=>a.order-b.order)[0]?.id]));
 const previous=new Map<string,PreviousChapter>();
 for(const entry of log.slice(0,start)){
  if(entry.chapterId!==chapterId&&firstCuts.get(entry.chapterId)===entry.lineId){
   previous.set(entry.chapterId,{chapterId:entry.chapterId,lineId:entry.lineId,pathIndex:entry.pathIndex});
  }
 }
 return {chapterId,entries:log.slice(start),previousChapters:[...previous.values()].sort((a,b)=>a.pathIndex-b.pathIndex)};
}

/** Validate against the live route again before changing progress; never synthesize an unread chapter start. */
export function restartReaderChapter(project:StoryProject,state:PlaybackState,pathIndex:number):PlaybackState{
 if(!readerChapterHistory(project,state).previousChapters.some(chapter=>chapter.pathIndex===pathIndex))throw Error('다시 읽을 이전 장의 첫 컷을 확인해 주세요.');
 return jumpPlayback(project,state,pathIndex);
}
