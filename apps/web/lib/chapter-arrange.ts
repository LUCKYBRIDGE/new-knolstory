import {branchChapterNumbering,chapterLabel,type StoryProject} from '@knolstory/story-domain';
import type {StoryFlowGraph} from '@knolstory/runtime-core';
import {chapterFlow} from './chapter-flow';
export type ChapterArrangement=Readonly<{ids:readonly string[];labels:ReadonlyMap<string,{chapterNumber:number;branchLabel?:string}>;moved:number;renamed:number}>;
/**
 * Chapters in story order (a storyline to its end before the next) with numbers from the reading step and letters from the branch point they follow
 * (10장: 1st choice → 11A, 2nd → 11B; a branch inside a way adds a letter; ways that meet keep what they share).
 * The rule is shared with the built-in works (`branchChapterNumbering`). Unreachable chapters keep their names and go last.
 */
export function chapterArrangement(project:StoryProject,graph:StoryFlowGraph):ChapterArrangement{
 const numbering=branchChapterNumbering(project);
 const flow=chapterFlow(project,graph);
 const known=new Set(flow.nodes.map(node=>node.id));
 // Story order: one storyline followed to its end before the next; where ways meet, after all of them.
 const ids=numbering.order.filter(id=>known.has(id));
 const labels=new Map([...numbering.identities].filter(([id])=>ids.includes(id)));
 const stored=[...project.chapters].sort((a,b)=>a.order-b.order).map(chapter=>chapter.id).filter(id=>ids.includes(id));
 const moved=ids.filter((id,index)=>stored[index]!==id).length;
 const chapters=new Map(project.chapters.map(chapter=>[chapter.id,chapter]));
 const renamed=[...labels].filter(([id,label])=>{const chapter=chapters.get(id)!;const {branchLabel:_old,...rest}=chapter;return chapterLabel(chapter)!==chapterLabel({...rest,...label});}).length;
 return {ids,labels,moved,renamed};
}
