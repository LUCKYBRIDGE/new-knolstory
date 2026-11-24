import {branchChapterNumbering,chapterLabel,type StoryProject} from '@knolstory/story-domain';
import type {StoryFlowGraph} from '@knolstory/runtime-core';
import {chapterFlow} from './chapter-flow';
export type ChapterArrangement=Readonly<{ids:readonly string[];labels:ReadonlyMap<string,{chapterNumber:number;branchLabel?:string}>;moved:number;renamed:number}>;
/**
 * Chapters in reading order with numbers from the reading step and letters from the branch point they follow
 * (10장: 1st choice → 11A, 2nd → 11B; a branch inside a way adds a letter; ways that meet keep what they share).
 * The rule is shared with the built-in works (`branchChapterNumbering`). Unreachable chapters keep their names and go last.
 */
export function chapterArrangement(project:StoryProject,graph:StoryFlowGraph):ChapterArrangement{
 const numbering=branchChapterNumbering(project);
 const flow=chapterFlow(project,graph);
 const name=(id:string)=>{const identity=numbering.identities.get(id);return identity?[identity.chapterNumber,identity.branchLabel??'']:[Number.MAX_SAFE_INTEGER,''];};
 const ids=[...flow.nodes].sort((a,b)=>{const [na,la]=name(a.id),[nb,lb]=name(b.id);return (na as number)-(nb as number)||String(la).localeCompare(String(lb))||a.depth-b.depth||a.row-b.row;}).map(node=>node.id);
 const labels=new Map([...numbering.identities].filter(([id])=>ids.includes(id)));
 const stored=[...project.chapters].sort((a,b)=>a.order-b.order).map(chapter=>chapter.id).filter(id=>ids.includes(id));
 const moved=ids.filter((id,index)=>stored[index]!==id).length;
 const chapters=new Map(project.chapters.map(chapter=>[chapter.id,chapter]));
 const renamed=[...labels].filter(([id,label])=>{const chapter=chapters.get(id)!;const {branchLabel:_old,...rest}=chapter;return chapterLabel(chapter)!==chapterLabel({...rest,...label});}).length;
 return {ids,labels,moved,renamed};
}
