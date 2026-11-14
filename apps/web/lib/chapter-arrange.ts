import {chapterLabel,type StoryProject} from '@knolstory/story-domain';
import type {StoryFlowGraph} from '@knolstory/runtime-core';
import {chapterFlow} from './chapter-flow';
export type ChapterArrangement=Readonly<{ids:readonly string[];labels:ReadonlyMap<string,{chapterNumber:number;branchLabel?:string}>;moved:number;renamed:number}>;
/**
 * Chapters in reading order (map column, then row), with numbers from the reading step and
 * a branch letter where one step has several chapters. Unreachable chapters keep their names.
 */
export function chapterArrangement(project:StoryProject,graph:StoryFlowGraph):ChapterArrangement{
 const flow=chapterFlow(project,graph);
 const nodes=[...flow.nodes].sort((a,b)=>a.depth-b.depth||a.row-b.row);
 const ids=nodes.map(node=>node.id);
 const width=new Map<number,number>();for(const node of nodes)if(node.reachable)width.set(node.depth,(width.get(node.depth)??0)+1);
 const labels=new Map<string,{chapterNumber:number;branchLabel?:string}>();
 for(const node of nodes)if(node.reachable)labels.set(node.id,{chapterNumber:node.depth+1,...((width.get(node.depth)??1)>1?{branchLabel:String.fromCharCode(65+Math.min(node.row,25))}:{})});
 const stored=[...project.chapters].sort((a,b)=>a.order-b.order).map(chapter=>chapter.id).filter(id=>ids.includes(id));
 const moved=ids.filter((id,index)=>stored[index]!==id).length;
 const chapters=new Map(project.chapters.map(chapter=>[chapter.id,chapter]));
 const renamed=[...labels].filter(([id,label])=>{const chapter=chapters.get(id)!;const {branchLabel:_old,...rest}=chapter;return chapterLabel(chapter)!==chapterLabel({...rest,...label});}).length;
 return {ids,labels,moved,renamed};
}
