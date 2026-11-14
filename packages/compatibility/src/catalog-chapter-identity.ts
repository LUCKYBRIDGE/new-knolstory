import {orderedStoryFlowLines,storyFlowTargets,type StoryProject} from '@knolstory/story-domain';
import {renameProvidedChapterTitles} from './catalog-chapter-titles';
const provided=new Set(['pinky-review-main-004','heungbu-nolbu-nolstory','pinky-review-main-003','pinky-review-main-002']);
const baseId=(id:string)=>id.replace(/-cruelty-.+$/u,'');
function branchName(index:number):string{let result='';for(let value=index+1;value>0;value=Math.floor((value-1)/26))result=String.fromCharCode(65+(value-1)%26)+result;return result;}
/** Called only after the catalog resolver's exact-version gate. Runtime order and links stay intact. */
export function connectCatalogChapterIdentity(project:StoryProject):StoryProject{
 if(!provided.has(project.id)||project.chapters.every(chapter=>chapter.chapterNumber!==undefined))return project;
 const lines=orderedStoryFlowLines(project),byId=new Map(lines.map(line=>[line.id,line]));
 const next=new Map(lines.map((line,index)=>[line.id,storyFlowTargets(lines,index).filter((id):id is string=>id!==null)]));
 const reached=new Set<string>(),pending=lines[0]?[lines[0].id]:[];
 for(let index=0;index<pending.length;index++){const id=pending[index];if(reached.has(id))continue;reached.add(id);pending.push(...(next.get(id)??[]).filter(id=>!reached.has(id)));}
 const active=new Set([...reached].map(id=>byId.get(id)!.chapterId));
 const outgoing=new Map(project.chapters.map(chapter=>[chapter.id,new Set<string>()]));
 for(const line of lines)for(const id of next.get(line.id)??[]){const target=byId.get(id);if(target&&target.chapterId!==line.chapterId)outgoing.get(line.chapterId)!.add(target.chapterId);}
 const incoming=new Map(project.chapters.map(chapter=>[chapter.id,0])),rank=new Map(project.chapters.map(chapter=>[chapter.id,1]));
 for(const targets of outgoing.values())for(const id of targets)incoming.set(id,incoming.get(id)!+1);
 const ready=project.chapters.filter(chapter=>incoming.get(chapter.id)===0).map(chapter=>chapter.id);
 for(let index=0;index<ready.length;index++)for(const id of outgoing.get(ready[index])!){rank.set(id,Math.max(rank.get(id)!,rank.get(ready[index])!+1));incoming.set(id,incoming.get(id)!-1);if(incoming.get(id)===0)ready.push(id);}
 if(ready.length!==project.chapters.length)throw Error('제공 작품의 장 연결에 순환이 있어 장 번호를 확인해야 해요.');
 // The preserved, disconnected Onggojib verdict manuscripts correspond to later reachable copies.
 for(const chapter of project.chapters.filter(chapter=>!active.has(chapter.id))){const peers=project.chapters.filter(peer=>active.has(peer.id)&&baseId(peer.id)===baseId(chapter.id));if(peers.length)rank.set(chapter.id,Math.max(...peers.map(peer=>rank.get(peer.id)!)));}
 const groups=new Map<number,string[]>();
 for(const chapter of [...project.chapters].sort((a,b)=>a.order-b.order)){if(!active.has(chapter.id))continue;const number=rank.get(chapter.id)!;groups.set(number,[...(groups.get(number)??[]),chapter.id]);}
 const chapters=project.chapters.map(chapter=>{const chapterNumber=rank.get(chapter.id)!,group=groups.get(chapterNumber)??[],branchLabel=!active.has(chapter.id)?'미연결 원고':group.length>1?branchName(group.indexOf(chapter.id)):undefined;return {...chapter,chapterNumber,...(branchLabel?{branchLabel}:{})};});
 chapters.sort((a,b)=>a.chapterNumber-b.chapterNumber||Number(!active.has(a.id))-Number(!active.has(b.id))||a.order-b.order);
 return renameProvidedChapterTitles({...project,chapters});
}
